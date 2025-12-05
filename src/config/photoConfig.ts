/**
 * Photo Distribution Configuration
 *
 * Centralized configuration for photo display during explosion effect.
 * Implements: spherical distribution, center-biased probability, overlap avoidance.
 */

// Number of photos to generate from exploded particles
export const PHOTO_COUNT = 99;

// Spherical distribution parameters for 3D space
export const PHOTO_DISTRIBUTION = {
    // Radius range for spherical distribution
    radiusMin: 8,
    radiusMax: 22,

    // Vertical angle range (radians) - limits how high/low photos can go
    // 0 = equator, PI/2 = north pole, -PI/2 = south pole
    polarAngleMin: -0.6, // Below horizon slightly
    polarAngleMax: 0.7, // Above horizon

    // Center bias - photos more likely to be in front of camera
    // Higher value = more spread out, lower = more concentrated in front
    frontBias: 0.6, // 0.5 = uniform, 1.0 = all in front hemisphere
} as const;

// Photo card dimensions for overlap detection
export const PHOTO_DIMENSIONS = {
    width: 1.0,
    height: 1.2,
    scaleMin: 0.6,
    scaleMax: 1.0,
    // Minimum angular gap between photos (radians)
    angularPadding: 0.15,
} as const;

// Morphing animation timing
export const MORPH_TIMING = {
    startDelay: 0.3,
    morphDuration: 1.5,
    staggerDelay: 0.02,
    fadeOutDuration: 1.0,
} as const;

/**
 * Generate a center-biased random value using Box-Muller transform
 */
export const gaussianRandom = (sigma: number = 0.35): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = 0.5 + z * sigma;
    return Math.max(0, Math.min(1, value));
};

/**
 * Photo position interface
 */
export interface PhotoPosition {
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: [number, number, number];
}

/**
 * Generate photo positions in a 3D spherical distribution
 * Photos are distributed around the scene, with more concentration
 * in the front hemisphere and at eye level for better visibility.
 */
export const generatePhotoPositions = (
    count: number,
    _aspectRatio: number = 16 / 9
): PhotoPosition[] => {
    const positions: PhotoPosition[] = [];
    const occupiedSpots: { theta: number; phi: number }[] = [];

    const { radiusMin, radiusMax, polarAngleMin, polarAngleMax, frontBias } = PHOTO_DISTRIBUTION;
    const { scaleMin, scaleMax, angularPadding } = PHOTO_DIMENSIONS;

    let attempts = 0;
    const maxAttempts = count * 100;

    while (positions.length < count && attempts < maxAttempts) {
        attempts++;

        // Generate spherical coordinates with biases

        // Azimuthal angle (theta): full 360 degrees, but biased towards front
        // Front is at theta = 0, back is at theta = PI
        let theta: number;
        if (Math.random() < frontBias) {
            // Front hemisphere with Gaussian distribution centered at 0
            theta = (gaussianRandom(0.4) - 0.5) * Math.PI;
        } else {
            // Back hemisphere
            theta = Math.PI + (Math.random() - 0.5) * Math.PI;
        }

        // Polar angle (phi): vertical position, biased towards eye level
        // Use Gaussian to concentrate around horizontal plane
        const phiNorm = gaussianRandom(0.35); // 0-1, centered at 0.5
        const phi = polarAngleMin + phiNorm * (polarAngleMax - polarAngleMin);

        // Radius: distance from center, with slight bias towards closer positions
        const radiusNorm = Math.pow(Math.random(), 0.7); // Bias towards closer
        const radius = radiusMin + radiusNorm * (radiusMax - radiusMin);

        // Check for overlap with existing positions (angular distance)
        let hasOverlap = false;
        for (const spot of occupiedSpots) {
            const dTheta = Math.abs(theta - spot.theta);
            const dPhi = Math.abs(phi - spot.phi);
            // Simple angular distance check
            const angularDist = Math.sqrt(dTheta * dTheta + dPhi * dPhi);
            if (angularDist < angularPadding) {
                hasOverlap = true;
                break;
            }
        }

        if (hasOverlap) continue;

        // Convert spherical to Cartesian coordinates
        // theta = 0 is front (-Z direction in Three.js camera view)
        const x = radius * Math.cos(phi) * Math.sin(theta);
        const y = radius * Math.sin(phi);
        const z = -radius * Math.cos(phi) * Math.cos(theta);

        // Scale with slight variation
        const scale = scaleMin + Math.random() * (scaleMax - scaleMin);

        // Rotation: face towards center (camera position at origin)
        // Calculate rotation to face origin
        const facingAngleY = Math.atan2(x, z);
        const facingAngleX = Math.atan2(y, Math.sqrt(x * x + z * z));

        const rotation: [number, number, number] = [
            -facingAngleX + (Math.random() - 0.5) * 0.2, // Tilt up/down
            facingAngleY + Math.PI + (Math.random() - 0.5) * 0.3, // Face center
            (Math.random() - 0.5) * 0.15, // Slight roll
        ];

        positions.push({ x, y, z, scale, rotation });
        occupiedSpots.push({ theta, phi });
    }

    return positions;
};
