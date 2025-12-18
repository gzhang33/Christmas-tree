/**
 * Particle System Configuration
 * 粒子系统配置文件
 * 
 * 管理圣诞树粒子的分布、动画和视觉效果
 * 注意：此文件仅包含圣诞树场景的粒子配置，不包含 Landing Page 配置
 */

/**
 * Tree Shape Configuration
 * 树形配置参数
 * 
 * 用于 treeUtils 工具函数和 magicDust.vert 着色器
 * 定义圣诞树的几何形状参数
 */
export const TREE_SHAPE_CONFIG = {
    // 着色器用参数 (用于 MagicDust 螺旋粒子)
    maxRadius: 6,       // 树底部最大半径
    radiusScale: 1.0,     // 半径缩放系数
    minRadius: 0.0,       // 树顶部最小半径

    // 显示渲染用参数 (用于 getTreeRadius 分层算法)
    layers: 6,            // 分层数量
    maxRDisplay: 5.5,     // 显示用最大半径
} as const;

/**
 * 圣诞树粒子系统配置
 */
export const PARTICLE_CONFIG = {
    // ------------------------------------------------------------------------
    // 树形尺寸 (Tree Dimensions)
    // ------------------------------------------------------------------------
    treeHeight: 14,      // 树的高度
    treeBottomY: -5.5,   // 树底部的 Y 坐标

    // ------------------------------------------------------------------------
    // 渲染参数 (Rendering Configuration)
    // ------------------------------------------------------------------------
    rendering: {
        entity: {
            baseSize: 0.5,     // 全局缩放系数
            minScale: 0.1,     // 最小尺寸变化 (原硬编码 0.5)
            maxScale: 1.0,     // 最大尺寸变化 (原硬编码 0.9)
            tipBoost: 0.4,     // 树梢粒子额外增益 (原硬编码 0.2)
            brightness: 3.5,   // 粒子亮度增强
        },
        ornament: {
            count: {
                normal: 60,         // 桌面端装饰球数量
                compact: 25,        // 移动端减少装饰球数量，减轻渲染压力
            },
            scale: 3.0,        // 装饰球缩放系数
        },
        treeBase: {
            baseSize: 1.0,     // 树底座粒子基础大小
        },
    },

    // ------------------------------------------------------------------------
    // 粒子分布比例 (Particle Distribution Ratios)
    // 各子系统从全局粒子预算中独立分配的比例
    // ------------------------------------------------------------------------
    ratios: {
        entity: 0.97,     // 97.0% - 树主体 (增强主体密度)
        magicDust: 0.005, // 0.5% - 魔法尘埃螺旋光环
        treeBase: 0.025,  // 2.5% - 树底座
    },
    // ------------------------------------------------------------------------
    // 最小粒子数量 (Minimum Counts)
    // 确保在低粒子总数时各元素仍可见
    // ------------------------------------------------------------------------
    minCounts: {
        entity: 1000,    // 树主体最小粒子数
        magicDust: 100,  // 魔法尘埃最小粒子数
    },    // ------------------------------------------------------------------------
    // 消散动画配置 (Dissipation Animation Configuration)
    // 用于 TreeParticles 和 MagicDust 的同步消散效果
    // ------------------------------------------------------------------------
    dissipation: {
        // === 双层粒子系统 (Dual-Layer Particle System) ===
        // 当 dissipateOnly = true 时，只有消散层粒子向上飘散，骨架层粒子保持原位
        dissipateOnly: true,      // 是否只执行消散动画（圣诞树不消失）
        coreLayerRatio: 0.4,      // 骨架层粒子比例 (0-1)，这部分粒子不参与消散

        // 触发逻辑参数 (Trigger Logic)
        progressMultiplier: 2.6,  // uProgress 的缩放系数，确保覆盖完整动画范围
        noiseInfluence: 0.3,      // 随机噪声对触发时间的影响 (0-1)
        heightInfluence: 1.0,     // 高度延迟对触发时间的影响 (自上而下消散)

        // 运动物理参数 (Movement Physics)
        upForce: 15.0,            // 向上浮力
        driftAmplitude: 4.0,      // 飘移幅度

        // 尺寸动画参数 (Size Animation)
        growPeakProgress: 0.3,    // 增长峰值时的进度
        growAmount: 0.3,          // 增长量
        shrinkAmount: 0.6,        // 缩小量

        // 淡出参数 (Fade Out)
        fadeStart: 0.3,           // 开始淡出的进度
        fadeEnd: 0.85,            // 完全消失的进度
    },

    // ------------------------------------------------------------------------
    // 魔法尘埃特效配置 (Magic Dust Configuration)
    // ------------------------------------------------------------------------
    magicDust: {
        // 运动参数
        spiralTurns: 2.5,      // 螺旋圈数 (值越小坡度越陡, >20度)
        radiusOffset: 1.5,     // 距离树表面的距离 (关键参数)
        ascentSpeed: 0.15,      // 垂直上升速度
        reformDelay: 0.0,       // 变形动画启动延迟 (秒, 0 = 与树同步启动)
        rotationSpeed: 0.15,    // 轨道旋转速度

        // 视觉效果
        colors: ['#845696', '#b150e4', '#FFFAF0'], // 紫色系
        minSize: 0.2,          // 最小粒子尺寸
        maxSize: 1.7,          // 最大粒子尺寸
        radiusVariation: 0.2,  // 半径随机变化
        angleVariation: 0.5,   // 角度随机变化
        flickerFreq: 3.0,      // 闪烁频率
    },

    // ------------------------------------------------------------------------
    // 树动画配置 (Tree Animation)
    // 用于 Shader 呼吸/摇摆效果
    // ------------------------------------------------------------------------
    animation: {
        // 呼吸动画全局开关
        enableBreathing: false,

        // 呼吸动画频率 (多层有机运动)
        breatheFrequency1: 0.6,    // 主呼吸层
        breatheFrequency2: 1.2,    // 次呼吸层
        breatheFrequency3: 0.4,    // 第三呼吸层
        breatheAmplitude1: 0.10,   // 主呼吸幅度
        breatheAmplitude2: 0.05,   // 次呼吸幅度
        breatheAmplitude3: 0.04,   // 第三呼吸幅度

        // 摇摆动画 (树体摆动)
        swayFrequency: 0.5,        // 摇摆频率
        swayAmplitude: 0.15,       // 最大摇摆距离

        // 爆炸物理阻尼速度
        // 匹配 AC6 "Midnight Magic" 美学: 爆炸时高速度，回归时更快
        dampingSpeedExplosion: 0.030, // 爆炸速度 
        dampingSpeedReset: 0.050,     // 还原速度 
        dampingSpeedEntrance: 0.050,  // 入场速度 
    },

    // ------------------------------------------------------------------------
    // 树底座配置 (Tree Base Configuration)
    // 用于解决树悬空视觉问题 (TREE-05)
    // 粒子数量比例由 ratios.treeBase 统一管理
    // ------------------------------------------------------------------------
    treeBase: {
        enabled: true,           // 是否启用底座粒子
        centerY: -5.8,           // 底座中心Y坐标
        innerRadius: 0.5,        // 内圈半径（树干位置）
        outerRadius: 5.0,        // 外圈半径
        heightSpread: 0.8,       // 高度分布范围
        densityFalloff: 0.6,     // 边缘密度衰减 (0-1, 值越大边缘越稀疏)
    },

    // ------------------------------------------------------------------------
    // 性能优化配置 (Performance Optimization)
    // Phase 2: CPU优化与性能监控
    // ------------------------------------------------------------------------
    performance: {
        // PhotoManager优化版本切换
        useOptimizedPhotoManager: true,  // true = 使用优化版, false = 使用原版

        // 调试与监控
        enableDebugLogs: false,           // 控制台总开关（性能报告 + 调试日志）
        monitorInterval: 5000,            // 监控报告间隔（毫秒）

        // 批处理优化
        maxVisiblePerFrame: 5,            // 每帧最大可见照片数（防止纹理上传风暴）

        // 预计算优化
        precomputeConstants: true,        // 是否预计算常量（轨道速度、浮动频率等）

        // Phase 3A: 纹理优化
        texture: {
            useOptimizedLoader: true,      // 启用优化的纹理加载器
            useProgressiveLoading: true,   // 启用渐进式加载（低分辨率 → 高分辨率）
            enableLOD: true,               // 启用基于距离的LOD
            defaultQuality: 'medium' as const, // 默认纹理质量
            preloadQuality: 'preview' as const, // 预加载质量
            maxConcurrentLoads: 6,         // 最大并发加载数
            enableMobileOptimization: true, // 移动端自动降质
        },
    },
} as const;

