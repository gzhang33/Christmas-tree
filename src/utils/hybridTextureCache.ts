/**
 * Hybrid Texture Cache
 * 
 * Combines LRU (Least Recently Used) eviction with Memory Budget limits
 * for optimal GPU memory management.
 * 
 * Features:
 * 1. LRU tracking - Evicts least recently used textures first
 * 2. Memory budget - Enforces maximum GPU memory usage
 * 3. Auto-cleanup - Automatically cleans up when limits are exceeded
 * 4. Statistics - Provides detailed cache statistics for debugging
 */

import * as THREE from 'three';
import { PARTICLE_CONFIG } from '../config/particles';
import { getResponsiveValue } from './responsiveUtils';

// Cache entry with usage tracking
interface CacheEntry {
    texture: THREE.Texture;
    lastUsed: number;           // Timestamp of last access
    memorySizeMB: number;       // Estimated GPU memory usage
    accessCount: number;        // Number of times accessed
    quality?: string;           // Quality level (for progressive loading)
}

// Cache configuration
export interface HybridCacheConfig {
    maxMemoryMB: number;        // Maximum GPU memory budget (MB)
    maxEntries: number;         // Maximum number of cached textures
    evictionBatchSize: number;  // Number of entries to evict at once
    enableDebugLogs: boolean;   // Enable debug logging
}

// Default configuration
const DEFAULT_CONFIG: HybridCacheConfig = {
    maxMemoryMB: 100,           // 100MB default budget
    maxEntries: 100,            // Max 100 textures
    evictionBatchSize: 5,       // Evict 5 at a time
    enableDebugLogs: false,
};

// Mobile-optimized configuration
const MOBILE_CONFIG: HybridCacheConfig = {
    maxMemoryMB: 50,            // 50MB for mobile (half of desktop)
    maxEntries: 50,             // Max 50 textures
    evictionBatchSize: 10,      // More aggressive eviction
    enableDebugLogs: false,
};

/**
 * Hybrid Texture Cache Class
 * 
 * Manages texture caching with both LRU and memory budget constraints
 */
export class HybridTextureCache {
    private cache: Map<string, CacheEntry>;
    private config: HybridCacheConfig;
    private totalMemoryMB: number;

    constructor(config?: Partial<HybridCacheConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.cache = new Map();
        this.totalMemoryMB = 0;
    }

    /**
     * Estimate GPU memory usage for a texture
     */
    private estimateMemory(texture: THREE.Texture): number {
        const image = texture.image;
        if (!image) return 0.5; // Default estimate if no image data

        const width = image.width || 512;
        const height = image.height || 512;

        // RGBA (4 bytes per pixel) + Mipmaps (~33% extra)
        const bytes = width * height * 4 * 1.33;
        return bytes / (1024 * 1024); // Convert to MB
    }

    /**
     * Get a texture from cache
     * Updates LRU tracking on access
     */
    get(url: string): THREE.Texture | null {
        const entry = this.cache.get(url);
        if (entry) {
            // Update LRU tracking
            entry.lastUsed = Date.now();
            entry.accessCount++;
            return entry.texture;
        }
        return null;
    }

    /**
     * Check if a texture is cached
     */
    has(url: string): boolean {
        return this.cache.has(url);
    }

    /**
     * Add a texture to cache
     * Triggers eviction if limits are exceeded
     */
    set(url: string, texture: THREE.Texture, quality?: string): void {
        // If already cached, update existing entry
        if (this.cache.has(url)) {
            const existing = this.cache.get(url)!;
            existing.texture = texture;
            existing.lastUsed = Date.now();
            existing.quality = quality;
            // Update memory tracking
            const oldMemory = existing.memorySizeMB;
            existing.memorySizeMB = this.estimateMemory(texture);
            this.totalMemoryMB += existing.memorySizeMB - oldMemory;
            return;
        }

        const memorySizeMB = this.estimateMemory(texture);

        // Check if we need to evict before adding
        this.ensureCapacity(memorySizeMB);

        // Add new entry
        const entry: CacheEntry = {
            texture,
            lastUsed: Date.now(),
            memorySizeMB,
            accessCount: 1,
            quality,
        };

        this.cache.set(url, entry);
        this.totalMemoryMB += memorySizeMB;

        if (this.config.enableDebugLogs) {
            console.log(
                `[HybridCache] Added: ${url.substring(0, 50)}... ` +
                `(${memorySizeMB.toFixed(2)}MB, Total: ${this.totalMemoryMB.toFixed(2)}MB)`
            );
        }
    }

    /**
     * Ensure there's capacity for a new texture
     * Evicts LRU entries if memory or count limits are exceeded
     */
    private ensureCapacity(incomingMemoryMB: number): void {
        // Check memory limit
        while (
            (this.totalMemoryMB + incomingMemoryMB > this.config.maxMemoryMB ||
                this.cache.size >= this.config.maxEntries) &&
            this.cache.size > 0
        ) {
            this.evictLRU(this.config.evictionBatchSize);
        }
    }

    /**
     * Evict the least recently used entries
     */
    private evictLRU(count: number): void {
        // Convert to array and sort by lastUsed (oldest first)
        const entries = Array.from(this.cache.entries())
            .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

        const toEvict = entries.slice(0, count);

        for (const [url, entry] of toEvict) {
            // Dispose the texture to free GPU memory
            entry.texture.dispose();
            this.totalMemoryMB -= entry.memorySizeMB;
            this.cache.delete(url);

            if (this.config.enableDebugLogs) {
                console.log(
                    `[HybridCache] Evicted (LRU): ${url.substring(0, 50)}... ` +
                    `(${entry.memorySizeMB.toFixed(2)}MB freed)`
                );
            }
        }
    }

    /**
     * Remove a specific texture from cache
     */
    delete(url: string): boolean {
        const entry = this.cache.get(url);
        if (entry) {
            entry.texture.dispose();
            this.totalMemoryMB -= entry.memorySizeMB;
            this.cache.delete(url);
            return true;
        }
        return false;
    }

    /**
     * Clear all cached textures
     */
    clear(): void {
        for (const entry of this.cache.values()) {
            entry.texture.dispose();
        }
        this.cache.clear();
        this.totalMemoryMB = 0;

        if (this.config.enableDebugLogs) {
            console.log('[HybridCache] Cache cleared');
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        totalEntries: number;
        totalMemoryMB: string;
        maxMemoryMB: number;
        maxEntries: number;
        memoryUsagePercent: string;
        entriesUsagePercent: string;
        averageAccessCount: string;
    } {
        let totalAccessCount = 0;
        for (const entry of this.cache.values()) {
            totalAccessCount += entry.accessCount;
        }

        const averageAccess = this.cache.size > 0
            ? totalAccessCount / this.cache.size
            : 0;

        return {
            totalEntries: this.cache.size,
            totalMemoryMB: this.totalMemoryMB.toFixed(2),
            maxMemoryMB: this.config.maxMemoryMB,
            maxEntries: this.config.maxEntries,
            memoryUsagePercent: ((this.totalMemoryMB / this.config.maxMemoryMB) * 100).toFixed(1),
            entriesUsagePercent: ((this.cache.size / this.config.maxEntries) * 100).toFixed(1),
            averageAccessCount: averageAccess.toFixed(1),
        };
    }

    /**
     * Get detailed entry information (for debugging)
     */
    getEntries(): Array<{
        url: string;
        memorySizeMB: string;
        lastUsed: Date;
        accessCount: number;
        quality?: string;
    }> {
        return Array.from(this.cache.entries())
            .map(([url, entry]) => ({
                url: url.substring(0, 80),
                memorySizeMB: entry.memorySizeMB.toFixed(2),
                lastUsed: new Date(entry.lastUsed),
                accessCount: entry.accessCount,
                quality: entry.quality,
            }))
            .sort((a, b) => b.accessCount - a.accessCount);
    }

    /**
     * Update configuration dynamically
     */
    updateConfig(newConfig: Partial<HybridCacheConfig>): void {
        this.config = { ...this.config, ...newConfig };
        // Trigger eviction if new limits are lower
        this.ensureCapacity(0);
    }
}

// Global singleton instance
let globalCache: HybridTextureCache | null = null;

/**
 * Get the global hybrid texture cache instance
 * Creates one if it doesn't exist, with device-appropriate settings from PARTICLE_CONFIG
 */
export const getHybridTextureCache = (): HybridTextureCache => {
    if (!globalCache) {
        // Read cache config from PARTICLE_CONFIG
        const cacheConfig = PARTICLE_CONFIG.performance.cache;

        const config: HybridCacheConfig = {
            maxMemoryMB: getResponsiveValue(cacheConfig?.maxMemoryMB) ?? 100,
            maxEntries: getResponsiveValue(cacheConfig?.maxEntries) ?? 100,
            evictionBatchSize: cacheConfig?.evictionBatchSize ?? 5,
            enableDebugLogs: cacheConfig?.enableDebugLogs ?? PARTICLE_CONFIG.performance.enableDebugLogs ?? false,
        };

        globalCache = new HybridTextureCache(config);

        if (config.enableDebugLogs) {
            console.log('[HybridCache] Initialized with config:', config);
        }
    }
    return globalCache;
};

/**
 * Dispose the global cache instance
 * Call this when cleaning up the application
 */
export const disposeHybridTextureCache = (): void => {
    if (globalCache) {
        globalCache.clear();
        globalCache = null;
    }
};

/**
 * Create a custom cache with specific configuration
 * Useful for isolated testing or specific use cases
 */
export const createHybridTextureCache = (config?: Partial<HybridCacheConfig>): HybridTextureCache => {
    return new HybridTextureCache(config);
};
