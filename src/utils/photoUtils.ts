/**
 * Photo Utilities
 * 
 * Utility functions for generating photo positions and distributions.
 * Separated from config/photoConfig.ts to keep configuration pure.
 */

import { PHOTO_WALL_CONFIG, PhotoPosition } from '../config/photoConfig';

/**
 * 生成中心偏向的随机值 (使用 Box-Muller 变换)
 * @param sigma 标准差 (默认 0.35)
 * @returns 0-1 之间的随机值，集中在 0.5 附近
 */
export const gaussianRandom = (sigma: number = 0.35): number => {
    const u1 = Math.random() || Number.MIN_VALUE; // 避免 log(0)
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = 0.5 + z * sigma;
    return Math.max(0, Math.min(1, value));
};

/**
 * 生成照片在 3D 球形空间中的位置
 * 
 * 照片分布在场景周围，前半球和视线水平处有更高的集中度，
 * 以确保更好的可见性。
 * 
 * @param count 照片数量
 * @param _aspectRatio 宽高比 (当前未使用)
 * @returns 照片位置数组
 */
export const generatePhotoPositions = (
    count: number,
    _aspectRatio: number = 16 / 9
): PhotoPosition[] => {
    const positions: PhotoPosition[] = [];
    const occupiedSpots: { theta: number; phi: number }[] = [];

    const { radiusMin, radiusMax, polarAngleMin, polarAngleMax, frontBias } = PHOTO_WALL_CONFIG.distribution;
    const { scaleMin, scaleMax, angularPadding } = PHOTO_WALL_CONFIG.dimensions;

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
            let dTheta = Math.abs(theta - spot.theta);
            // 处理角度环绕：如果差值超过 π，说明从另一边绕过去更近
            if (dTheta > Math.PI) {
                dTheta = 2 * Math.PI - dTheta;
            }
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
