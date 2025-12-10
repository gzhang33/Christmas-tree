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
    private pooledMaterials: Set<THREE.ShaderMaterial> = new Set(); // 追踪当前在池中的材质（O(1) 查找）
    private ownedMaterials: Set<THREE.ShaderMaterial> = new Set(); // 追踪池子拥有的所有材质
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
            this.pooledMaterials.delete(material); // 从池中 Set 移除
            if (material.uniforms?.map) material.uniforms.map.value = texture;
            if (material.uniforms?.opacity) material.uniforms.opacity.value = 0;
            if (material.uniforms?.uDevelop) material.uniforms.uDevelop.value = 0;
        } else {
            // Create new material
            material = this.masterMaterial.clone();
            if (material.uniforms?.map) material.uniforms.map.value = texture;
            if (material.uniforms?.opacity) material.uniforms.opacity.value = 0;
            if (material.uniforms?.uDevelop) material.uniforms.uDevelop.value = 0;
            this.totalCreated++;
            // 新创建的材质加入所有权追踪
            this.ownedMaterials.add(material);
        }
        this.activeCount++;
        return material;
    }
    /**
     * Release a material back to the pool
     */
    release(material: THREE.ShaderMaterial): void {
        if (!material) return;

        // 验证材质是否属于此池子（防止外部材质导致计数错误）
        if (!this.ownedMaterials.has(material)) {
            console.warn('Attempting to release a material not owned by this pool. Ignoring.');
            return;
        }

        // 防止重复释放（O(1) Set 查找）
        if (this.pooledMaterials.has(material)) {
            console.warn('Material already released to pool');
            return;
        }

        // Reset material state
        if (material.uniforms?.map) material.uniforms.map.value = null;
        if (material.uniforms?.opacity) material.uniforms.opacity.value = 0;
        if (material.uniforms?.uDevelop) material.uniforms.uDevelop.value = 0;

        // Add back to pool
        this.pool.push(material);
        this.pooledMaterials.add(material); // 加入池中 Set
        this.activeCount--;
    }
    /**
     * Dispose all materials in the pool
     * Call this when cleaning up
     * 
     * @param force - If true, force disposal even when active materials exist (use with caution)
     * @throws Error if activeCount > 0 and force is false
     */
    dispose(force: boolean = false): void {
        // Refuse to dispose if active materials exist (unless forced)
        if (this.activeCount > 0 && !force) {
            const errorMsg =
                `Cannot dispose pool with ${this.activeCount} active materials. ` +
                `Please release all materials first, or call dispose(true) to force cleanup.`;
            console.error('[MaterialPool]', errorMsg);
            throw new Error(errorMsg);
        }

        // Warning if force-disposing with active materials
        if (this.activeCount > 0 && force) {
            console.warn(
                `[MaterialPool] Force-disposing pool with ${this.activeCount} active materials. ` +
                `This may cause rendering issues for materials still in use.`
            );
        }

        // Dispose all materials owned by this pool, not just pooled ones
        for (const material of this.ownedMaterials) {
            material.dispose();
        }
        this.pool = [];
        this.pooledMaterials.clear();
        this.ownedMaterials.clear();
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
