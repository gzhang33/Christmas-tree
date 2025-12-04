/**
 * Sprite Texture Atlas Utility
 * 
 * Creates a texture atlas for sprite assets (gifts and ornaments).
 * Similar to textureAtlas.ts but specifically for decoration sprites.
 */

import * as THREE from 'three';
import { SPRITE_ASSETS, createFallbackSprite } from '../config/sprites';

export interface SpriteAtlasResult {
    texture: THREE.Texture;
    cols: number;
    rows: number;
    mapping: Map<string, { col: number; row: number }>;  // sprite type -> grid position
}

/**
 * Load a single sprite image with fallback
 */
async function loadSpriteImage(url: string, type: 'gift' | 'ornament'): Promise<HTMLImageElement | HTMLCanvasElement> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);

        img.onerror = () => {
            console.warn(`[SpriteAtlas] Failed to load sprite: ${url}, using fallback`);
            resolve(createFallbackSprite(type));
        };

        img.src = url;
    });
}

/**
 * Create sprite texture atlas
 * 
 * @returns Atlas texture and grid mapping
 */
export async function createSpriteAtlas(): Promise<SpriteAtlasResult> {
    const spriteCount = SPRITE_ASSETS.length;
    const cols = Math.ceil(Math.sqrt(spriteCount));
    const rows = Math.ceil(spriteCount / cols);

    const cellSize = 128;  // Each sprite cell is 128x128
    const atlasWidth = cols * cellSize;
    const atlasHeight = rows * cellSize;

    // Create canvas for atlas
    const canvas = document.createElement('canvas');
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('[SpriteAtlas] Failed to create 2D context');
    }

    if (spriteCount === 0) {
        console.warn('[SpriteAtlas] No sprites to create atlas');
        // 返回一个最小的有效结果
        const emptyTexture = new THREE.CanvasTexture(canvas);
        return {
            texture: emptyTexture,
            cols: 1,
            rows: 1,
            mapping: new Map(),
        };
    }
    // Clear canvas
    ctx.clearRect(0, 0, atlasWidth, atlasHeight);
    // Load all sprites
    const spriteImages = await Promise.all(
        SPRITE_ASSETS.map(sprite => loadSpriteImage(sprite.url, sprite.type))
    );

    // Create mapping
    const mapping = new Map<string, { col: number; row: number }>();

    // Draw sprites to atlas
    spriteImages.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellSize;
        const y = row * cellSize;

        ctx.drawImage(img, x, y, cellSize, cellSize);

        // Store mapping
        const sprite = SPRITE_ASSETS[index];
        const key = sprite.subtype ? `${sprite.type}-${sprite.subtype}` : sprite.type;
        mapping.set(key, { col, row });
    });

    // Create Three.js texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    console.log(`[SpriteAtlas] Created atlas: ${cols}x${rows} (${spriteCount} sprites)`);

    return {
        texture,
        cols,
        rows,
        mapping,
    };
}

/**
 * Get UV offset for a specific sprite type
 */
export function getSpriteUVOffset(
    mapping: Map<string, { col: number; row: number }>,
    spriteKey: string,
    cols: number,
    rows: number
): [number, number] {
    const pos = mapping.get(spriteKey);

    if (!pos) {
        console.warn(`[SpriteAtlas] Sprite not found: ${spriteKey}, using first sprite`);
        return [0, 1.0 - 1 / rows];  // Default to first sprite
    }

    const uvX = pos.col / cols;
    const uvY = 1.0 - (pos.row + 1) / rows;  // Flip Y for WebGL

    return [uvX, uvY];
}
