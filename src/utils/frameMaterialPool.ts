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

    // NEW: Track disposal state to prevent use-after-dispose errors
    public isDisposed: boolean = false;

    constructor(masterMaterial: THREE.MeshStandardMaterial) {
        this.masterMaterial = masterMaterial;
    }

    acquire(): THREE.MeshStandardMaterial {
        // NEW: Guard against use after disposal
        if (this.isDisposed) {
            console.warn('[FrameMaterialPool] Attempted to acquire from disposed pool, creating fallback');
            const fallback = this.masterMaterial.clone();
            fallback.opacity = 0;
            fallback.emissiveIntensity = 0;
            return fallback;
        }

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

        // NEW: Guard against release after disposal
        if (this.isDisposed) {
            // Silently ignore - material will be GC'd
            return;
        }

        if (!this.ownedMaterials.has(material)) {
            // Silently ignore materials from old pools (StrictMode cleanup)
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

        // NEW: Mark as disposed
        this.isDisposed = true;
    }

    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeCount,
            totalCreated: this.totalCreated,
            reuseRate: this.totalAcquired > 0
                ? ((this.totalAcquired - this.totalCreated) / this.totalAcquired * 100).toFixed(1) + '%'
                : '0%',
            isDisposed: this.isDisposed, // NEW: Include disposal state
        };
    }
}

/**
 * Global frame material pool
 */
let globalFrameMaterialPool: FrameMaterialPool | null = null;

// NEW: Singleton guard for StrictMode protection
let framePoolInitializationId: number = 0;

/**
 * Initialize the global frame material pool
 * 
 * NEW: Implements singleton pattern with React StrictMode protection
 */
export function initFrameMaterialPool(masterMaterial: THREE.MeshStandardMaterial, preWarmCount: number = 0): void {
    // NEW: Singleton guard - if pool exists and is healthy, skip reinitialization
    if (globalFrameMaterialPool && !globalFrameMaterialPool.isDisposed) {
        console.log('[FrameMaterialPool] Pool already initialized, skipping reinitialization (StrictMode protection)');
        return;
    }

    // If pool exists but is disposed, we need a new one
    if (globalFrameMaterialPool && globalFrameMaterialPool.isDisposed) {
        console.log('[FrameMaterialPool] Replacing disposed pool with new instance');
    }

    globalFrameMaterialPool = new FrameMaterialPool(masterMaterial);
    framePoolInitializationId += 1;
    const currentInitId = framePoolInitializationId;

    if (preWarmCount > 0) {
        console.log(`[FrameMaterialPool] Starting staggered pre-warming of ${preWarmCount} materials...`);
        const startTime = performance.now();
        
        let createdCount = 0;
        const BATCH_SIZE = 30; // MeshStandardMaterial 较轻，批次可稍大

        const processBatch = () => {
            if (!globalFrameMaterialPool || globalFrameMaterialPool.isDisposed) return;

            const batchLimit = Math.min(createdCount + BATCH_SIZE, preWarmCount);
            const preWarmed: THREE.MeshStandardMaterial[] = [];

            for (let i = createdCount; i < batchLimit; i++) {
                preWarmed.push(globalFrameMaterialPool.acquire());
            }

            for (const mat of preWarmed) {
                globalFrameMaterialPool.release(mat);
            }

            createdCount = batchLimit;

            if (createdCount < preWarmCount) {
                setTimeout(processBatch, 0);
            } else {
                const duration = performance.now() - startTime;
                console.log(`[FrameMaterialPool] Staggered pre-warming complete: ${preWarmCount} materials in ${duration.toFixed(1)}ms (init #${currentInitId})`);
            }
        };

        setTimeout(processBatch, 150); // 与 Photo 材质池错开启动
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
