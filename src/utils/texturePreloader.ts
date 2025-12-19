/**
 * Texture Preloader
 *
 * Manages texture loading with caching and batch preloading
 * to avoid performance spikes during explosion animation.
 * 
 * Phase 3A: Integrated with optimized texture loader for progressive loading and LOD
 * Phase 3B: Integrated with HybridTextureCache for LRU + memory budget management
 */
import * as THREE from 'three';
import { getOptimizedTextureLoader, TextureQuality } from './optimizedTextureLoader';
import { getHybridTextureCache, disposeHybridTextureCache } from './hybridTextureCache';
import { PARTICLE_CONFIG } from '../config/particles';

// Loading promises map (for deduplication)
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a single texture with caching
 * Phase 3A: Supports optimized progressive loading
 * Phase 3B: Uses HybridTextureCache for intelligent memory management
 */
export const loadTexture = (url: string, quality?: TextureQuality): Promise<THREE.Texture> => {
    const cache = getHybridTextureCache();

    // 1. Check hybrid cache (updates LRU tracking automatically)
    const cached = cache.get(url);
    if (cached) {
        return Promise.resolve(cached);
    }

    // 2. Check if already loading (deduplication)
    if (loadingPromises.has(url)) {
        return loadingPromises.get(url)!;
    }

    const useOptimized = PARTICLE_CONFIG.performance.texture?.useOptimizedLoader ?? false;
    let promise: Promise<THREE.Texture>;

    if (useOptimized) {
        // Use optimized loader (supports progressive loading)
        const loader = getOptimizedTextureLoader();
        const targetQuality = quality || (PARTICLE_CONFIG.performance.texture?.defaultQuality as TextureQuality) || TextureQuality.MEDIUM;
        const useProgressive = PARTICLE_CONFIG.performance.texture?.useProgressiveLoading ?? true;

        if (useProgressive) {
            promise = loader.loadProgressive(url, targetQuality, (currentQuality, texture) => {
                // Update cache on each quality upgrade
                cache.set(url, texture, currentQuality);
            }).then(texture => {
                if (!texture) throw new Error(`[TexturePreloader] Progressive load failed: ${url}`);
                cache.set(url, texture, targetQuality);
                return texture;
            });
        } else {
            promise = loader.loadProgressive(url, targetQuality).then(texture => {
                if (!texture) throw new Error(`[TexturePreloader] Direct load failed: ${url}`);
                cache.set(url, texture, targetQuality);
                return texture;
            });
        }
    } else {
        // Original loading logic (backward compatible)
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

                    cache.set(url, texture);
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

    // Unified loading state cleanup
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
 * Updates LRU tracking on access
 */
export const getCachedTexture = (url: string): THREE.Texture | null => {
    return getHybridTextureCache().get(url);
};

/**
 * Check if texture is cached
 */
export const isTextureCached = (url: string): boolean => {
    return getHybridTextureCache().has(url);
};

/**
 * Remove a specific texture from cache
 */
export const removeFromCache = (url: string): boolean => {
    return getHybridTextureCache().delete(url);
};

/**
 * Clear texture cache (dispose all textures and free GPU memory)
 */
export const clearTextureCache = (): void => {
    getHybridTextureCache().clear();
    loadingPromises.clear();
};

/**
 * Dispose the texture cache completely
 * Call this when unmounting the application
 */
export const disposeTextureCache = (): void => {
    disposeHybridTextureCache();
    loadingPromises.clear();
};

/**
 * Get texture cache size
 */
export const getTextureCacheSize = (): number => {
    return getHybridTextureCache().getStats().totalEntries;
};

/**
 * Get detailed cache statistics
 */
export const getTextureCacheStats = () => {
    return getHybridTextureCache().getStats();
};
