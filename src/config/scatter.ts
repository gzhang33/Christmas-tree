import { ASSET_CONFIG } from './assets';

/**
 * Scatter Text Configuration
 * 散落文字效果配置 (2D & 3D)
 */

export const SCATTER_CONFIG = {
    // 2D DOM version (MerryChristmasScatter.tsx)
    twoDimensional: {
        instanceCount: 18,
        // Random position range (percentage of viewport)
        positionRange: {
            xMin: 10,
            xMax: 90,
            yMin: 15,
            yMax: 85,
        },
        // Animation timing
        animation: {
            staggerDelay: 0.1,      // Delay between each text appearing
            fadeInDuration: 0.6,     // Duration of fade in
            floatDuration: 4.0,      // Duration of floating animation
        },
        // Drift distance (pixels)
        drift: {
            xRange: [-80, 80],
            yRange: [-60, 60],
        },
        // Font settings
        font: {
            family: "'WDXL Lubrifont SC', 'Saira Stencil One', 'Great Vibes', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
            sizeRange: [16, 28],
        },
        // Colors (gold/warm tones)
        colors: [
            'rgba(255, 215, 0, 0.9)',   // Gold
            'rgba(255, 223, 128, 0.85)', // Light gold
            'rgba(255, 200, 100, 0.8)',  // Warm gold
            'rgba(255, 245, 200, 0.75)', // Cream gold
        ],
    },

    // 3D Mesh version (ScatterText3D.tsx)
    threeDimensional: {
        instanceCount: 15,
        // 3D position range (world units)
        positionRange: {
            xMin: -25,
            xMax: 25,
            yMin: 2,
            yMax: 18,
            zMin: -15,
            zMax: 15,
        },
        // Animation timing (seconds)
        animation: {
            staggerDelay: 0.08,
            fadeInDuration: 0.8,
            driftSpeed: 0.3,
        },
        // Font settings
        font: {
            size: 1.2,
            sizeVariance: 0.4,
            url: ASSET_CONFIG.fonts.chinese,
        },
        // Colors (hex for Three.js)
        colors: [
            '#FFD700', // Gold
            '#FFDF80', // Light gold
            '#FFC864', // Warm gold
            '#FFF5C8', // Cream gold
        ],
    }
} as const;
