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
    // 1. 检查同步缓存
    if (textureCache.has(url)) {
        return Promise.resolve(textureCache.get(url)!);
    }

    // 2. 检查是否正在并行加载
    if (loadingPromises.has(url)) {
        return loadingPromises.get(url)!;
    }

    const useOptimized = PARTICLE_CONFIG.performance.texture?.useOptimizedLoader ?? false;
    let promise: Promise<THREE.Texture>;

    if (useOptimized) {
        // 使用优化的加载器（支持渐进式加载）
        const loader = getOptimizedTextureLoader();
        const targetQuality = quality || (PARTICLE_CONFIG.performance.texture?.defaultQuality as TextureQuality) || TextureQuality.MEDIUM;
        const useProgressive = PARTICLE_CONFIG.performance.texture?.useProgressiveLoading ?? true;

        if (useProgressive) {
            promise = loader.loadProgressive(url, targetQuality, (currentQuality, texture) => {
                // 每次质量升级时更新缓存
                textureCache.set(url, texture);
            }).then(texture => {
                if (!texture) throw new Error(`[TexturePreloader] Progressive load failed: ${url}`);
                textureCache.set(url, texture);
                return texture;
            });
        } else {
            promise = loader.loadProgressive(url, targetQuality).then(texture => {
                if (!texture) throw new Error(`[TexturePreloader] Direct load failed: ${url}`);
                textureCache.set(url, texture);
                return texture;
            });
        }
    } else {
        // 原版加载逻辑（向后兼容）
        const loader = new THREE.TextureLoader();
        promise = new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
                url,
                (texture) => {
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
                    console.error(`Failed to load texture: ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    // 统一管理加载状态的清理
    const finalPromise = promise.finally(() => {
        loadingPromises.delete(url);
    });

    loadingPromises.set(url, finalPromise);
    return finalPromise;
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
