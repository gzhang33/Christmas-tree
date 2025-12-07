/**
 * Texture Preloader
 *
 * Manages texture loading with caching and batch preloading
 * to avoid performance spikes during explosion animation.
 */
import * as THREE from 'three';

const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

/**
 * Load a single texture with caching
 */
export const loadTexture = (url: string): Promise<THREE.Texture> => {
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
