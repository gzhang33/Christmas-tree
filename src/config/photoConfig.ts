/**
 * Photo Distribution Configuration
 *
 * Centralized configuration for photo display during explosion effect.
 * Implements: center-biased probability, overlap avoidance, screen-bound positions.
 */

// Number of photos to generate from exploded particles
export const PHOTO_COUNT = 99;

// Screen-space distribution parameters
export const PHOTO_DISTRIBUTION = {
    // Gaussian distribution sigma for center-bias (smaller = more centered)
    centerBiasSigma: 0.35,

    // Min and Max distance from camera center (normalized screen space)
    minRadius: 0.05,
    maxRadius: 0.85,

    // Vertical distribution bias (0.5 = centered, <0.5 = lower, >0.5 = upper)
    verticalCenter: 0.45,

    // Depth range for 3D positioning (camera facing)
    depthMin: 8,
    depthMax: 18,
} as const;

// Photo card dimensions for overlap detection
export const PHOTO_DIMENSIONS = {
    // Base size in world units (matches PhotoCard)
    width: 1.0,
    height: 1.2,

    // Scale range for variety
    scaleMin: 0.6,
    scaleMax: 1.0,

    // Minimum gap between photos (fraction of average size)
    overlapPadding: 0.15,
} as const;

// Morphing animation timing
export const MORPH_TIMING = {
    // Delay before morphing starts (seconds after explosion trigger)
    startDelay: 0.3,

    // Duration of particle-to-photo morph (seconds)
    morphDuration: 1.5,

    // Stagger delay between each photo morph (seconds)
    staggerDelay: 0.02,

    // Fade-out duration for non-photo particles (seconds)
    fadeOutDuration: 1.0,
} as const;

/**
 * Generate a center-biased random value using Box-Muller transform
 * Returns a value between 0 and 1, biased towards 0.5
 */
export const gaussianRandom = (sigma: number = 0.35): number => {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Scale and center, then clamp to [0, 1]
    const value = 0.5 + z * sigma;
    return Math.max(0, Math.min(1, value));
};

/**
 * Generate photo positions with center-bias and overlap avoidance
 */
export interface PhotoPosition {
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: [number, number, number];
}

export const generatePhotoPositions = (
    count: number,
    aspectRatio: number = 16 / 9
): PhotoPosition[] => {
    const positions: PhotoPosition[] = [];
    const occupiedAreas: { x: number; y: number; radius: number }[] = [];

    const { centerBiasSigma, minRadius, maxRadius, verticalCenter, depthMin, depthMax } =
        PHOTO_DISTRIBUTION;
    const { width, height, scaleMin, scaleMax, overlapPadding } = PHOTO_DIMENSIONS;

    // Calculate average size for collision detection
    const avgScale = (scaleMin + scaleMax) / 2;
    const collisionRadius = Math.max(width, height) * avgScale * (1 + overlapPadding) * 0.5;

    let attempts = 0;
    const maxAttempts = count * 50;

    while (positions.length < count && attempts < maxAttempts) {
        attempts++;

        // Generate center-biased position using Gaussian distribution
        const angle = Math.random() * Math.PI * 2;
        const radiusNorm = minRadius + gaussianRandom(centerBiasSigma) * (maxRadius - minRadius);

        // Convert to screen space with aspect ratio correction
        let screenX = Math.cos(angle) * radiusNorm;
        let screenY = (Math.sin(angle) * radiusNorm) / aspectRatio + (verticalCenter - 0.5);

        // Add some independent variation to break radial pattern
        screenX += (gaussianRandom(0.2) - 0.5) * 0.3;
        screenY += (gaussianRandom(0.2) - 0.5) * 0.2;

        // Clamp to valid screen region
        screenX = Math.max(-0.9, Math.min(0.9, screenX));
        screenY = Math.max(-0.8, Math.min(0.8, screenY));

        // Check for overlap with existing positions
        const normalizedX = screenX;
        const normalizedY = screenY * aspectRatio;
        const normalizedCollisionRadius = collisionRadius / 10; // Rough normalization

        let hasOverlap = false;
        for (const occupied of occupiedAreas) {
            const dx = normalizedX - occupied.x;
            const dy = normalizedY - occupied.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < normalizedCollisionRadius + occupied.radius) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap) continue;

        // Convert screen position to 3D world position
        const depth = depthMin + Math.random() * (depthMax - depthMin);
        const worldX = screenX * depth;
        const worldY = screenY * depth;
        const worldZ = -depth;

        // Random scale within range
        const scale = scaleMin + Math.random() * (scaleMax - scaleMin);

        // Random rotation (mostly facing camera with slight tilt)
        const rotation: [number, number, number] = [
            (Math.random() - 0.5) * 0.3, // Slight X tilt
            Math.PI + (Math.random() - 0.5) * 0.4, // Facing camera with variation
            (Math.random() - 0.5) * 0.2, // Slight Z tilt
        ];

        positions.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            scale,
            rotation,
        });

        occupiedAreas.push({
            x: normalizedX,
            y: normalizedY,
            radius: normalizedCollisionRadius,
        });
    }

    return positions;
};
