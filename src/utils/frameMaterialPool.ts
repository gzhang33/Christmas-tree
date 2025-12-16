/**
 * Frame Material Pool - Dedicated pool for MeshStandardMaterial (photo frames)
 * 
 * Separate from PhotoMaterialPool to handle different material types and reset logic.
 */

import * as THREE from 'three';

export class FrameMaterialPool {
    private pool: THREE.MeshStandardMaterial[] = [];
    private pooledMaterials: Set<THREE.MeshStandardMaterial> = new Set();
    private ownedMaterials: Set<THREE.MeshStandardMaterial> = new Set();
    private masterMaterial: THREE.MeshStandardMaterial;
    private activeCount: number = 0;
    private totalCreated: number = 0;
    private totalAcquired: number = 0;

    constructor(masterMaterial: THREE.MeshStandardMaterial) {
        this.masterMaterial = masterMaterial;
    }

    acquire(): THREE.MeshStandardMaterial {
        let material: THREE.MeshStandardMaterial;
        this.totalAcquired++;

        if (this.pool.length > 0) {
            material = this.pool.pop()!;
            this.pooledMaterials.delete(material);
            // Reset to default state
            material.opacity = 0;
            material.emissiveIntensity = 0;
        } else {
            material = this.masterMaterial.clone();
            material.opacity = 0;
            material.emissiveIntensity = 0;
            this.totalCreated++;
            this.ownedMaterials.add(material);
        }
        this.activeCount++;
        return material;
    }

    release(material: THREE.MeshStandardMaterial): void {
        if (!material) return;

        if (!this.ownedMaterials.has(material)) {
            console.warn('[FrameMaterialPool] Attempting to release material not owned by this pool');
            return;
        }

        if (this.pooledMaterials.has(material)) {
            console.warn('[FrameMaterialPool] Material already released');
            return;
        }

        // Reset state
        material.opacity = 0;
        material.emissiveIntensity = 0;

        this.pool.push(material);
        this.pooledMaterials.add(material);
        this.activeCount--;
    }

    dispose(force: boolean = false): void {
        if (this.activeCount > 0 && !force) {
            throw new Error(
                `[FrameMaterialPool] Cannot dispose with ${this.activeCount} active materials`
            );
        }

        for (const material of this.ownedMaterials) {
            material.dispose();
        }
        this.pool = [];
        this.pooledMaterials.clear();
        this.ownedMaterials.clear();
        this.activeCount = 0;
        this.totalCreated = 0;
        this.totalAcquired = 0;
    }
    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeCount,
            totalCreated: this.totalCreated,
            reuseRate: this.totalAcquired > 0
                ? ((this.totalAcquired - this.totalCreated) / this.totalAcquired * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

/**
 * Global frame material pool
 */
let globalFrameMaterialPool: FrameMaterialPool | null = null;

export function initFrameMaterialPool(masterMaterial: THREE.MeshStandardMaterial, preWarmCount: number = 0): void {
    if (globalFrameMaterialPool) {
        const stats = globalFrameMaterialPool.getStats();
        if (stats.activeCount > 0) {
            throw new Error(
                `Cannot reinitialize frame pool with ${stats.activeCount} active materials`
            );
        }
        globalFrameMaterialPool.dispose();
    }

    globalFrameMaterialPool = new FrameMaterialPool(masterMaterial);

    if (preWarmCount > 0) {
        const preWarmed: THREE.MeshStandardMaterial[] = [];
        console.log(`[FrameMaterialPool] Pre-warming ${preWarmCount} materials...`);
        const startTime = performance.now();

        for (let i = 0; i < preWarmCount; i++) {
            preWarmed.push(globalFrameMaterialPool.acquire());
        }

        for (const mat of preWarmed) {
            globalFrameMaterialPool.release(mat);
        }

        const duration = performance.now() - startTime;
        console.log(`[FrameMaterialPool] Pre-warmed ${preWarmCount} materials in ${duration.toFixed(1)}ms`);
    }
}

export function getFrameMaterialPool(): FrameMaterialPool {
    if (!globalFrameMaterialPool) {
        throw new Error('Frame material pool not initialized. Call initFrameMaterialPool() first.');
    }
    return globalFrameMaterialPool;
}

export function disposeFrameMaterialPool(force: boolean = false): void {
    if (globalFrameMaterialPool) {
        const stats = globalFrameMaterialPool.getStats();

        // Check for active materials before disposing
        if (stats.activeCount > 0 && !force) {
            console.error(
                `[FrameMaterialPool] Cannot dispose pool with ${stats.activeCount} active materials. ` +
                `Pass force=true to override this check.`
            );
            return;
        }

        if (stats.activeCount > 0 && force) {
            console.warn(
                `[FrameMaterialPool] Force disposing pool with ${stats.activeCount} active materials!`
            );
        }

        globalFrameMaterialPool.dispose(force);
        globalFrameMaterialPool = null;
    }
}
