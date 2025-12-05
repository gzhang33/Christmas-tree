import { PARTICLE_CONFIG } from '../config/particles';

/**
 * Calculates the radius of the tree at a given normalized height t (0 to 1).
 * t=0 is the bottom, t=1 is the top.
 * 
 * Uses a tiered shape algorithm to create a realistic Christmas tree silhouette.
 */
export const getTreeRadius = (t: number): number => {
    const maxR = 5.5;
    const layers = 7;
    const layerT = t * layers;
    const layerProgress = layerT % 1;

    // Curve for each layer: flared bottom, tucked top
    // Using a power function for the layer shape to make it curved like branches
    const layerShape = Math.pow(1 - layerProgress, 0.8);

    // Modulate the cone: (1-t) is the general cone slope
    // We vary between 0.75 (inner) and 1.25 (outer tip) relative to the cone
    return (1 - t) * maxR * (0.75 + 0.5 * layerShape);
};
