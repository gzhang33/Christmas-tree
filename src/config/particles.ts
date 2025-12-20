/**
 * Particle System Configuration
 * 粒子系统配置文件
 * 
 * 管理圣诞树粒子的分布、动画和视觉效果
 */

/**
 * Tree Shape Configuration
 * 树形几何参数
 */
export const TREE_SHAPE_CONFIG = {
    maxRadius: 6,       // 树底部最大半径 (着色器用)
    radiusScale: 1.0,   // 半径缩放系数 (着色器用)
    minRadius: 0.0,     // 树顶部最小半径 (着色器用)

    // 显示渲染用参数 (用于 treeUtils.ts 中的 getTreeRadius 算法)
    layers: 6,            // 分层数量
    maxRDisplay: 5.5,     // 显示用最大半径
} as const;

/**
 * 圣诞树粒子系统全局配置
 */
export const PARTICLE_CONFIG = {
    // ------------------------------------------------------------------------
    // 树形尺寸 (Tree Dimensions)
    // ------------------------------------------------------------------------
    treeHeight: 14,
    treeBottomY: -5.5,

    // ------------------------------------------------------------------------
    // 渲染参数 (Rendering Configuration)
    // ------------------------------------------------------------------------
    rendering: {
        entity: {
            baseSize: 0.5,
            minScale: 0.1,
            maxScale: 1.0,
            tipBoost: 0.4,
            brightness: 3.5,
        },
        ornament: {
            count: {
                normal: 60,
                compact: 20,
            },
            scale: 3.0,
        },
        treeBase: {
            baseSize: 1.0,
        },
    },

    // ------------------------------------------------------------------------
    // 粒子分布比例 (Particle Distribution Ratios)
    // ------------------------------------------------------------------------
    ratios: {
        entity: 0.97,     // 树主体
        magicDust: 0.005, // 魔法尘埃螺旋 (WebGL 3D版)
        treeBase: 0.025,  // 树底座
    },

    minCounts: {
        entity: 1000,
        magicDust: 100,
    },

    // ------------------------------------------------------------------------
    // 消散与重构动画 (Dissipation & Morphing)
    // ------------------------------------------------------------------------
    dissipation: {
        dissipateOnly: true,
        coreLayerRatio: 0.4,
        progressMultiplier: 2.6,
        noiseInfluence: 0.3,
        heightInfluence: 1.0,
        speedVariation: 0.5,
        upForce: 15.0,
        driftAmplitude: 4.0,
        growPeakProgress: 0.3,
        growAmount: 0.3,
        shrinkAmount: 0.6,
        fadeStart: 0.3,
        fadeEnd: 0.85,
    },

    // ------------------------------------------------------------------------
    // 魔法尘埃特效配置 (Magic Dust Configuration)
    // ------------------------------------------------------------------------
    magicDust: {
        spiralTurns: 2.5,
        radiusOffset: 1.5,
        ascentSpeed: 0.15,
        reformDelay: 0.0,       // 已由用户手动改为 0.0
        rotationSpeed: 0.15,
        colors: ['#845696', '#b150e4', '#FFFAF0'],
        minSize: 0.2,
        maxSize: 1.7,
        radiusVariation: 0.2,
        angleVariation: 0.5,
        flickerFreq: 3.0,
    },

    // ------------------------------------------------------------------------
    // 圣诞树状态动画配置 (Tree Animation)
    // ------------------------------------------------------------------------
    animation: {
        enableBreathing: false,
        breatheFrequency1: 0.6,
        breatheFrequency2: 1.2,
        breatheFrequency3: 0.4,
        breatheAmplitude1: 0.10,
        breatheAmplitude2: 0.05,
        breatheAmplitude3: 0.04,
        swayFrequency: 0.5,
        swayAmplitude: 0.15,

        // 核心阻尼速度 (Core Damping Speeds)
        dampingSpeedExplosion: 0.001, //爆炸速度
        dampingSpeedReset: 0.002, //还原速度
        dampingSpeedEntrance: 0.003, //入口速度
    },

    // ------------------------------------------------------------------------
    // 树底座配置 (Tree Base)
    // ------------------------------------------------------------------------
    treeBase: {
        enabled: true,
        centerY: -5.8,
        innerRadius: 0.5,
        outerRadius: 5.0,
        heightSpread: 0.8,
        densityFalloff: 0.6,
    },

    // ------------------------------------------------------------------------
    // 性能优化集中配置 (Performance Optimization)
    // ------------------------------------------------------------------------
    performance: {
        useOptimizedPhotoManager: true,
        enableDebugLogs: false,
        monitorInterval: 5000,

        maxVisiblePerFrame: {
            normal: 5,
            compact: 1,
        },
        maxHidePerFrame: {
            normal: 10,
            compact: 5,
        },

        precomputeConstants: true,

        texture: {
            useOptimizedLoader: true,
            useProgressiveLoading: true,
            enableLOD: true,
            defaultQuality: 'medium' as const,
            preloadQuality: 'preview' as const,
            maxConcurrentLoads: {
                normal: 6,
                compact: 2,
            },
            enableMobileOptimization: true,
        },

        cache: {
            maxMemoryMB: {
                normal: 1000,
                compact: 800,
            },
            maxEntries: {
                normal: 100,
                compact: 50,
            },
            evictionBatchSize: 5,
            enableDebugLogs: false,
        },
    },
} as const;
