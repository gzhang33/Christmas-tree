/**
 * GiftBoxes Configuration
 * 
 * Shared configuration for gift box GLB models and positions.
 * Used by both GiftBoxes component and TreeParticles (for photo spawn points).
 */

import { COLOR_CONFIG } from './colors';

// GLB model paths for gift boxes
export const GIFT_MODELS: string[] = [
    '/models/a_gift_box.glb',
    '/models/fnaf_gift_box.glb',
    '/models/gift_box(1).glb',
    '/models/gift_box(2).glb',
    '/models/gift_box.glb',
    '/models/gift_box_2.glb',
];

// Gift box position and style configuration
export interface GiftBoxConfig {
    r: number;      // Radial distance from center
    ang: number;    // Angle in radians
    w: number;      // Width
    h: number;      // Height
    colorKey: string; // Color key for dynamic color resolution
    ribColorKey: string; // Ribbon color key
}

// Static gift box positions (extracted from TreeParticles)
// Note: Colors are resolved dynamically based on treeColor
export const GIFT_BOX_CONFIGS: GiftBoxConfig[] = [
    { r: 3.2, ang: 0.6, w: 2.2, h: 2.0, colorKey: 'base', ribColorKey: 'white' },
    { r: 2.3, ang: 1.2, w: 1.8, h: 1.6, colorKey: 'silver', ribColorKey: 'dark' },
    { r: 2.1, ang: 2.5, w: 2.5, h: 1.8, colorKey: 'dark', ribColorKey: 'gold' },
    { r: 2.4, ang: 3.8, w: 1.6, h: 2.2, colorKey: 'white', ribColorKey: 'ukRed' },
    { r: 2.2, ang: 5.0, w: 2.0, h: 1.5, colorKey: 'cream', ribColorKey: 'silver' },
    { r: 3.2, ang: 0.6, w: 1.4, h: 1.2, colorKey: 'light', ribColorKey: 'silver' },
    { r: 3.5, ang: 2.0, w: 1.6, h: 1.4, colorKey: 'white', ribColorKey: 'base' },
    { r: 3.3, ang: 3.5, w: 1.3, h: 1.1, colorKey: 'silver', ribColorKey: 'gold' },
    { r: 3.6, ang: 4.8, w: 1.5, h: 1.3, colorKey: 'dark', ribColorKey: 'white' },
    { r: 3.8, ang: 5.8, w: 1.2, h: 1.0, colorKey: 'ukBlue', ribColorKey: 'white' },
];

// Calculate world position from polar coordinates
export function calculateGiftPosition(
    config: GiftBoxConfig,
    treeBaseCenterY: number
): [number, number, number] {
    const cx = Math.cos(config.ang) * config.r;
    const cz = Math.sin(config.ang) * config.r;
    const cy = treeBaseCenterY + config.h * 0.3;
    return [cx, cy, cz];
}
