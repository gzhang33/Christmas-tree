/**
 * Photo Configuration
 * 照片配置文件
 *
 * 管理照片墙的分布、动画和布局参数
 * 用于爆炸效果时的照片展示
 */

/**
 * 照片数量配置
 * 从爆炸粒子中生成的照片数量
 */
export const PHOTO_COUNT = 120;

/**
 * 照片球形分布参数
 * 控制照片在 3D 空间中的分布范围
 */
export const PHOTO_DISTRIBUTION = {
    // 球形分布的半径范围
    radiusMin: 8,   // 最小半径
    radiusMax: 15,  // 最大半径

    // 垂直角度范围 (弧度) - 限制照片的高低位置
    // 0 = 赤道, PI/2 = 北极, -PI/2 = 南极
    polarAngleMin: -0.4, // 略低于地平线
    polarAngleMax: 0.7,  // 高于地平线

    // 中心偏向 - 照片更可能出现在相机前方
    // 值越高分布越分散，值越低越集中在前方
    frontBias: 0.5, // 0.5 = 均匀分布, 1.0 = 全部在前半球
} as const;

/**
 * 照片卡片尺寸配置
 * 用于重叠检测和渲染
 */
export const PHOTO_DIMENSIONS = {
    width: 1.0,              // 照片宽度
    height: 1.2,             // 照片高度
    scaleMin: 0.6,           // 最小缩放比例
    scaleMax: 1.0,           // 最大缩放比例
    angularPadding: 0.15,    // 照片之间的最小角度间隔 (弧度)
} as const;

/**
 * 变形动画时序配置
 * 控制照片出现的动画时间
 */
export const MORPH_TIMING = {
    startDelay: 0.1,        // 动画开始延迟 (秒)
    morphDuration: 1.5,     // 变形动画持续时间 (秒)
    staggerDelay: 0.02,     // 照片之间的交错延迟 (秒)
    fadeOutDuration: 1.0,   // 淡出动画持续时间 (秒)
} as const;

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
 * 照片位置接口
 */
export interface PhotoPosition {
    x: number;       // X 坐标
    y: number;       // Y 坐标
    z: number;       // Z 坐标
    scale: number;   // 缩放比例
    rotation: [number, number, number]; // 旋转角度 [x, y, z]
}

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
