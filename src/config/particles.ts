/**
 * Particle System Configuration
 * 
 * Centralized configuration for particle counts, ratios, and dimensions.
 * Ratios must sum to 1.0 to ensure proper distribution of the total particle count.
 */

export const PARTICLE_CONFIG = {
    // Tree Dimensions
    treeHeight: 14,
    treeBottomY: -5.5,

    // Particle Distribution Ratios (Must sum to 1.0)
    ratios: {
        entity: 0.50,    // 50% - Main tree body
        glow: 0.10,      // 10% - Glowing aura
        ornament: 0.15,  // 15% - Decorations
        gift: 0.24,      // 24% - Gift boxes
        magicDust: 0.01, // 1% - Magic spiral halo
    },

    // Minimum counts to ensure visibility at low total counts
    minCounts: {
        tree: 1000,
        ornament: 500,
        gift: 500,
        magicDust: 100,
    },
} as const;
