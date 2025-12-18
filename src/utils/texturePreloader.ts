/**
 * Texture Preloader
 *
 * Manages texture loading with caching and batch preloading
 * to avoid performance spikes during explosion animation.
 * 
 * Phase 3A: Integrated with optimized texture loader for progressive loading and LOD
 */
import * as THREE from 'three';
import { getOptimizedTextureLoader, TextureQuality } from './optimizedTextureLoader';
import { PARTICLE_CONFIG } from '../config/particles';

const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a single texture with caching
 * Phase 3A: Supports optimized progressive loading
 */
export const loadTexture = (url: string, quality?: TextureQuality): Promise<THREE.Texture> => {
    // 检查是否启用优化加载器
    const useOptimized = PARTICLE_CONFIG.performance.texture?.useOptimizedLoader ?? false;

    if (useOptimized) {
        // 使用优化的加载器（支持渐进式加载）
        const loader = getOptimizedTextureLoader();
        const targetQuality = quality || (PARTICLE_CONFIG.performance.texture?.defaultQuality as TextureQuality) || TextureQuality.MEDIUM;

        // 检查是否启用渐进式加载
        const useProgressive = PARTICLE_CONFIG.performance.texture?.useProgressiveLoading ?? true;

        if (useProgressive) {
            // 渐进式加载：先加载低质量预览，然后升级到目标质量
            return loader.loadProgressive(url, targetQuality, (currentQuality, texture) => {
                // 每次质量升级时更新缓存
                textureCache.set(url, texture);
            });
        } else {
            // 直接加载目标质量
            return loader.loadProgressive(url, targetQuality).then(texture => {
                textureCache.set(url, texture);
                return texture;
            });
        }
    }

    // 原版加载逻辑（向后兼容）
    if (textureCache.has(url)) {
        return Promise.resolve(textureCache.get(url)!);
    }

    if (loadingPromises.has(url)) {
        return loadingPromises.get(url)!;
    }

    const loader = new THREE.TextureLoader();
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
            url,
            (texture) => {
                loadingPromises.delete(url);

                // Configure texture properties for consistency
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
                texture.needsUpdate = true;

                textureCache.set(url, texture);
                resolve(texture);
            },
            undefined,
            (error) => {
                loadingPromises.delete(url);
                console.error(`Failed to load texture: ${url}`, error);
                reject(error);
            }
        );
    });

    loadingPromises.set(url, promise);
    return promise;
};

/**
 * Preload multiple textures in batches to avoid overwhelming the browser
 */
export const preloadTextures = async (
    urls: string[],
    batchSize: number = 10,
    onProgress?: (loaded: number, total: number) => void
): Promise<Map<string, THREE.Texture>> => {
    const results = new Map<string, THREE.Texture>();
    let loaded = 0;

    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const promises = batch.map(async (url) => {
            try {
                const texture = await loadTexture(url);
                results.set(url, texture);
                loaded++;
                onProgress?.(loaded, urls.length);
            } catch (e) {
                console.warn('Failed to preload texture:', url);
                loaded++;
                onProgress?.(loaded, urls.length);
            }
        });

        await Promise.all(promises);
    }

    return results;
};

/**
 * Get cached texture synchronously (returns null if not loaded)
 */
export const getCachedTexture = (url: string): THREE.Texture | null => {
    return textureCache.get(url) || null;
};

/**
 * Check if texture is cached
 */
export const isTextureCached = (url: string): boolean => {
    return textureCache.has(url);
};

/**
 * Clear texture cache
 */
export const clearTextureCache = (): void => {
    textureCache.forEach((texture) => texture.dispose());
    textureCache.clear();
    loadingPromises.clear();
};

/**
 * Get texture cache size
 */
export const getTextureCacheSize = (): number => {
    return textureCache.size;
};
