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

    // Magic Dust Specific Configuration
    magicDust: {
        spiralTurns: 3.5,      // Low number of turns = Steep slope (>20 degrees)
        radiusOffset: 0.8,     // Distance from tree surface
        ascentSpeed: 0.05,     // Vertical speed
        rotationSpeed: 0.1,    // Orbit speed
        countRatio: 0.01,      // 1% of total particles (redundant with ratios.magicDust but good for reference)
    },

    // Tree Animation Constants (for shader breathing/sway effects)
    animation: {
        // Breathing animation frequencies (multi-layer organic movement)
        breatheFrequency1: 0.6,    // Primary breathing layer
        breatheFrequency2: 1.2,    // Secondary breathing layer
        breatheFrequency3: 0.4,    // Tertiary breathing layer
        breatheAmplitude1: 0.15,   // Primary breathing amplitude (increased for visibility)
        breatheAmplitude2: 0.10,   // Secondary breathing amplitude (increased for visibility)
        breatheAmplitude3: 0.08,   // Tertiary breathing amplitude (increased for visibility)

        // Sway animation (tree movement)
        swayFrequency: 0.5,        // Sway oscillation frequency
        swayAmplitude: 0.15,       // Maximum sway distance (increased for visibility)

        // Explosion physics damping speeds
        // Matches AC6 "Midnight Magic" aesthetic: high velocity on explosion, faster return
        dampingSpeedExplosion: 0.0025,  // Slower damping to compensate for high shader scalar (2.2x)
        dampingSpeedReset: 0.02,      // Faster damping for quicker return to tree shape
    },
} as const;
