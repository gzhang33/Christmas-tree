/**
 * Texture Preloader
 *
 * Manages texture loading with caching and batch preloading
 * to avoid performance spikes during explosion animation.
 */
import * as THREE from 'three';

// Global texture cache
const textureCache = new Map<string, THREE.Texture>();
const loadingPromises = new Map<string, Promise<THREE.Texture>>();

// Shared texture loader instance
const textureLoader = new THREE.TextureLoader();
let ktx2Loader: KTX2Loader | null = null;

/**
 * Initialize KTX2Loader with renderer
 * Call this once from your main experience component
 */
export const initKTX2Loader = (renderer: THREE.WebGLRenderer) => {
    if (ktx2Loader) return;

    // Use jsdelivr CDN for basis transcoders to ensure it works without local file setup
    // In production, you might want to serve these files from your own public folder
    const BASIS_PATH = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/';

    ktx2Loader = new KTX2Loader()
        .setTranscoderPath(BASIS_PATH)
        .detectSupport(renderer);
};

/**
 * Load a texture (supports .ktx2 if initialized)
 */
export const loadTexture = (url: string): Promise<THREE.Texture> => {
    // Check cache
    if (textureCache.has(url)) return Promise.resolve(textureCache.get(url)!);
    if (loadingPromises.has(url)) return loadingPromises.get(url)!;

    // Determine loader based on extension
    const isKTX2 = url.endsWith('.ktx2');

    // Safety check for KTX2
    if (isKTX2 && !ktx2Loader) {
        console.warn('KTX2Loader not initialized. Call initKTX2Loader(gl) first. Falling back to TextureLoader.');
    }

    const promise = new Promise<THREE.Texture>((resolve, reject) => {
        const loader = (isKTX2 && ktx2Loader) ? ktx2Loader : textureLoader;

        loader.load(
            url,
            (texture) => {
                // KTX2 textures are already in the correct color space usually, but ensure consistency
                if (!isKTX2) {
                    texture.colorSpace = THREE.SRGBColorSpace;
                }

                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;

                textureCache.set(url, texture);
                loadingPromises.delete(url);
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
