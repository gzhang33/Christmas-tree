/**
 * Material Pool - Reusable ShaderMaterial Pool for PolaroidPhoto
 * 
 * Performance Optimization:
 * - Reduces material creation overhead for 99 photos
 * - Reuses ShaderMaterial instances instead of cloning
 * - Manages texture updates efficiently
 * 
 * Usage:
 * const pool = new MaterialPool(masterMaterial);
 * const material = pool.acquire(texture);
 * // ... use material ...
 * pool.release(material); // when done
 */

import * as THREE from 'three';

export class MaterialPool {
    private pool: THREE.ShaderMaterial[] = [];
    private masterMaterial: THREE.ShaderMaterial;
    private activeCount: number = 0;
    private totalCreated: number = 0;

    constructor(masterMaterial: THREE.ShaderMaterial) {
        this.masterMaterial = masterMaterial;
    }

    /**
     * Acquire a material from the pool
     * If pool is empty, clone from master material
     */
    acquire(texture: THREE.Texture): THREE.ShaderMaterial {
        let material: THREE.ShaderMaterial;

        if (this.pool.length > 0) {
            // Reuse from pool
            material = this.pool.pop()!;
            material.uniforms.map.value = texture;
            material.uniforms.opacity.value = 0; // Reset opacity
            material.uniforms.uDevelop.value = 0; // Reset develop
        } else {
            // Create new material
            material = this.masterMaterial.clone();
            material.uniforms.map.value = texture;
            this.totalCreated++;
        }

        this.activeCount++;
        return material;
    }

    /**
     * Release a material back to the pool
     * Material can be reused by future acquire() calls
     */
    release(material: THREE.ShaderMaterial): void {
        if (!material) return;

        // Reset material state
        material.uniforms.opacity.value = 0;
        material.uniforms.uDevelop.value = 0;

        // Add back to pool
        this.pool.push(material);
        this.activeCount--;
    }

    /**
     * Dispose all materials in the pool
     * Call this when cleaning up
     */
    dispose(): void {
        for (const material of this.pool) {
            material.dispose();
        }
        this.pool = [];
        this.activeCount = 0;
    }

    /**
     * Get pool statistics for debugging
     */
    getStats() {
        return {
            poolSize: this.pool.length,
            activeCount: this.activeCount,
            totalCreated: this.totalCreated,
            reuseRate: this.totalCreated > 0
                ? ((this.activeCount - this.totalCreated) / this.activeCount * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

/**
 * Global material pool instance for PolaroidPhoto
 * Shared across all photo instances
 */
let globalPhotoMaterialPool: MaterialPool | null = null;

/**
 * Initialize the global material pool
 * Should be called once with the master material
 */
export function initPhotoMaterialPool(masterMaterial: THREE.ShaderMaterial): void {
    if (globalPhotoMaterialPool) {
        globalPhotoMaterialPool.dispose();
    }
    globalPhotoMaterialPool = new MaterialPool(masterMaterial);
}

/**
 * Get the global material pool instance
 */
export function getPhotoMaterialPool(): MaterialPool {
    if (!globalPhotoMaterialPool) {
        throw new Error('Material pool not initialized. Call initPhotoMaterialPool() first.');
    }
    return globalPhotoMaterialPool;
}

/**
 * Dispose the global material pool
 * Call this when cleaning up the application
 */
export function disposePhotoMaterialPool(): void {
    if (globalPhotoMaterialPool) {
        globalPhotoMaterialPool.dispose();
        globalPhotoMaterialPool = null;
    }
}
