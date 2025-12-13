import { PARTICLE_CONFIG, TREE_SHAPE_CONFIG } from '../config/particles';

// Re-export TREE_SHAPE_CONFIG for convenience
export { TREE_SHAPE_CONFIG };

/**
 * Calculates the radius of the tree at a given normalized height t (0 to 1).
 * t=0 is the bottom, t=1 is the top.
 * 
 * Uses a tiered shape algorithm to create a realistic Christmas tree silhouette.
 */
export const getTreeRadius = (t: number): number => {
    const maxR = TREE_SHAPE_CONFIG.maxRDisplay;
    const layers = TREE_SHAPE_CONFIG.layers;
    const layerT = t * layers;
    const layerProgress = layerT % 1;

    // Curve for each layer: flared bottom, tucked top
    // Using a power function for the layer shape to make it curved like branches
    const layerShape = Math.pow(1 - layerProgress, 0.8);

    // Modulate the cone: (1-t) is the general cone slope
    // We vary between 0.75 (inner) and 1.25 (outer tip) relative to the cone
    return (1 - t) * maxR * (0.75 + 0.5 * layerShape);
};

/**
 * Calculate erosion factor for particle dissipation effect
 * Returns a normalized value [0,1] where:
 * - 0 = top of tree (erodes first)
 * - 1 = bottom of tree (erodes last)
 * 
 * This function is shared between MagicDust.tsx and TreeParticles.tsx
 * to ensure consistent erosion behavior.
 * 
 * @param yPosition - Y coordinate of the particle
 * @returns Clamped erosion factor [0,1]
 */
export const calculateErosionFactor = (yPosition: number): number => {
    const treeTopY = PARTICLE_CONFIG.treeBottomY + PARTICLE_CONFIG.treeHeight;
    const erosionRange = PARTICLE_CONFIG.treeHeight;
    const factor = (treeTopY - yPosition) / erosionRange;
    return Math.max(0, Math.min(1, factor)); // Clamp to [0,1]
};

/**
 * Simple tree radius calculation for shader use
 * This is a simplified version that matches the shader's getTreeRadius function
 * 
 * IMPORTANT: Parameter semantics now match getTreeRadius for consistency:
 * @param t - Normalized height (0 = bottom, 1 = top) - SAME as getTreeRadius
 * @returns Radius at the given height
 * 
 * Note: Internally converts to shader coordinate system where t=0 is top, t=1 is bottom
 */
export const getShaderTreeRadius = (t: number): number => {
    const { maxRadius, radiusScale, minRadius } = TREE_SHAPE_CONFIG;
    // Convert t to shader semantics: shader expects t=0 (top) to t=1 (bottom)
    // So we use (1 - t) since our input t goes from 0 (bottom) to 1 (top)
    const shaderT = 1 - t;
    return maxRadius * shaderT * radiusScale + minRadius;
};

