/**
 * Sprite Asset Configuration
 * 
 * Defines sprite textures for decorative particles (Gifts and Ornaments).
 * These sprites are rendered in tree state (uProgress = 0) to provide
 * visual distinction from regular particles.
 */

export interface SpriteAsset {
    type: 'gift' | 'ornament';
    subtype?: string;  // e.g., 'ball', 'flag', 'bus', 'corgi'
    url: string;
    size?: number;     // Recommended render size in pixels
}

/**
 * Sprite asset definitions
 * 
 * To add custom sprites:
 * 1. Add PNG files to public/sprites/ folder
 * 2. Add entries below with correct paths
 * 3. Sprites should be square (128x128px recommended) with transparency
 */
export const SPRITE_ASSETS: SpriteAsset[] = [
    // Gift sprites
    {
        type: 'gift',
        url: '/sprites/gift-box.png',
        size: 128,
    },

    // Ornament sprites
    {
        type: 'ornament',
        subtype: 'ball',
        url: '/sprites/ornament-ball.png',
        size: 128,
    },
    {
        type: 'ornament',
        subtype: 'uk-flag',
        url: '/sprites/ornament-uk-flag.png',
        size: 128,
    },
    {
        type: 'ornament',
        subtype: 'bus',
        url: '/sprites/ornament-bus.png',
        size: 128,
    },
    {
        type: 'ornament',
        subtype: 'corgi',
        url: '/sprites/ornament-corgi.png',
        size: 128,
    },
];

/**
 * Fallback: Generate simple geometric sprites programmatically
 * Used when sprite files are not available
 */
export function createFallbackSprite(type: 'gift' | 'ornament', size: number = 128): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    if (type === 'gift') {
        // Draw a simple gift box
        const boxSize = size * 0.6;
        const x = (size - boxSize) / 2;
        const y = (size - boxSize) / 2;

        // Box body
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(x, y, boxSize, boxSize);

        // Ribbon (horizontal)
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(x, y + boxSize * 0.4, boxSize, boxSize * 0.2);

        // Ribbon (vertical)
        ctx.fillRect(x + boxSize * 0.4, y, boxSize * 0.2, boxSize);

        // Bow
        ctx.beginPath();
        ctx.arc(x + boxSize / 2, y, boxSize * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = '#F39C12';
        ctx.fill();
    } else {
        // Draw a simple ornament ball
        const radius = size * 0.4;
        const centerX = size / 2;
        const centerY = size / 2;

        // Ball gradient
        const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3,
            centerY - radius * 0.3,
            0,
            centerX,
            centerY,
            radius
        );
        gradient.addColorStop(0, '#E74C3C');
        gradient.addColorStop(1, '#C0392B');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fill();

        // Top cap
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(centerX - radius * 0.15, centerY - radius * 1.2, radius * 0.3, radius * 0.3);
    }

    return canvas;
}
