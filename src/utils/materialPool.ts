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
    private totalAcquired: number = 0;

    constructor(masterMaterial: THREE.ShaderMaterial) {
        this.masterMaterial = masterMaterial;
    }

    /**
     * Acquire a material from the pool
     * If pool is empty, clone from master material
     */
    acquire(texture: THREE.Texture): THREE.ShaderMaterial {
        let material: THREE.ShaderMaterial;

        // Increment usage statistics
        this.totalAcquired++;

        if (this.pool.length > 0) {
            // Reuse from pool
            material = this.pool.pop()!;
            if (material.uniforms.map) material.uniforms.map.value = texture;
            if (material.uniforms.opacity) material.uniforms.opacity.value = 0;
            if (material.uniforms.uDevelop) material.uniforms.uDevelop.value = 0;
        } else {
            // Create new material
            material = this.masterMaterial.clone();
            if (material.uniforms.map) material.uniforms.map.value = texture;
            if (material.uniforms.opacity) material.uniforms.opacity.value = 0;
            if (material.uniforms.uDevelop) material.uniforms.uDevelop.value = 0;
            this.totalCreated++;
        }
        this.activeCount++;
        return material;
    }

    /**
     * Release a material back to the pool
     */
    release(material: THREE.ShaderMaterial): void {
        if (!material) return;

        // Prevent double release
        if (this.pool.includes(material)) {
            console.warn('Material already released to pool');
            return;
        }

        // Reset material state
        if (material.uniforms.opacity) material.uniforms.opacity.value = 0;
        if (material.uniforms.uDevelop) material.uniforms.uDevelop.value = 0;

        // Add back to pool
        this.pool.push(material);
        this.activeCount--;
    }

    /**
     * Dispose all materials in the pool
     * Call this when cleaning up
     */
    dispose(): void {
        // Warning if active materials exist
        if (this.activeCount > 0) {
            console.warn(`Disposing pool with ${this.activeCount} active materials. This may cause memory leaks.`);
            // 不重置 activeCount，让它继续反映实际情况
        }

        for (const material of this.pool) {
            material.dispose();
        }
        this.pool = [];
        // 只清理池子，保留统计信息以便调试
        // 如果确定要完全重置，可以保持原样
    }

    /**
     * Get pool statistics for debugging
     */
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
        const stats = globalPhotoMaterialPool.getStats();
        if (stats.activeCount > 0) {
            throw new Error(
                `Cannot reinitialize pool with ${stats.activeCount} active materials. ` +
                `Release all materials before reinitializing.`
            );
        }
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
