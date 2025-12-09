/**
 * 落地页配置
 *
 * 落地页粒子标题系统的集中配置。
 * 被 LandingTitle.tsx 和 LandingParticles.tsx 使用。
 */

// ============================================================================
// 1. 颜色配置 (Color Palette)
// ============================================================================

/** 标题粒子的圣诞色彩方案 */
export const TITLE_COLORS = [
    '#C41E3A', // 圣诞红 (Christmas Red)
    '#228B22', // 森林绿 (Forest Green)
    '#FFD700', // 金色 (Gold)
    '#FFFFFF', // 白色 (White)
    '#DC143C', // 深红 (Crimson)
    '#006400', // 深绿 (Dark Green)
];

/** 用户名粒子色彩方案（暖色调） */
export const USERNAME_COLORS = [
    '#FFD700', // 金色 (Gold)
    '#FFA500', // 橙色 (Orange)
    '#FFFAF0', // 花白色 (Floral White)
    '#F5DEB3', // 小麦色 (Wheat)
];

// ============================================================================
// 2. 标题粒子系统配置 (Title System)
// ============================================================================

/**
 * 标题粒子采样、渲染与基础动画配置
 * 注意：部分动画参数需与圣诞树着色器(particle.vert)保持同步
 */
export const TITLE_CONFIG = {
    // ------------------------------------------------------------------------
    // 字体与排版 (Typography)
    // ------------------------------------------------------------------------
    font: {
        family: "'Merry Christmas Flake', 'Mountains of Christmas', cursive",
        fallback: "'Merry Christmas Flake', 'Great Vibes', serif",
        size: {
            normal: 300,   // 桌面端基础字号
            compact: 250,  // 移动端基础字号
        },
        loadDelay: 150, // 字体加载完成后的缓冲时间(ms)，防止画布绘制空白
    },

    text: {
        line1: 'Merry',
        line2: 'Christmas',
        lineSpacing: 1.1, // 行高倍率
        line2Indent: {
            normal: 280,  // 桌面端第二行缩进(px)
            compact: 120, // 移动端第二行缩进(px)
        },
    },

    // ------------------------------------------------------------------------
    // 粒子采样 (Sampling)
    // ------------------------------------------------------------------------
    sampling: {
        density: 4, // 采样间距(px)，值越小粒子越密，性能消耗越大
        canvasWidth: {
            normal: 600,  // 桌面端画布基准宽度
            compact: 400, // 移动端画布基准宽度
        },
        canvasPadding: 1.5,           // 画布高度倍率（留出动画空间）
        canvasHeightMultiplier: {
            normal: 2.8,  // 桌面端高度倍率
            compact: 3.2, // 移动端高度倍率
        },
    },

    // ------------------------------------------------------------------------
    // 粒子渲染 (Rendering)
    // ------------------------------------------------------------------------
    particle: {
        sizeMin: 1.2,              // 逻辑最小尺寸
        sizeMax: 2.8,              // 逻辑最大尺寸
        sizeMinDraw: 0.8,          // 实际渲染最小半径
        glowLayerSizeMultiplier: 1.8, // 光晕层大小倍率
        glowLayerAlpha: 0.3,       // 光晕层透明度
    },

    effects: {
        shadowBlur: 12, // 全局阴影模糊度
        dropShadow: {
            red: { blur: 20, color: 'rgba(196, 30, 58, 0.6)' },
            green: { blur: 15, color: 'rgba(34, 139, 34, 0.4)' },
            gold: { blur: 25, color: 'rgba(255, 215, 0, 0.5)' },
        },
    },

    // ------------------------------------------------------------------------
    // 动画参数 (Animation)
    // 主要是待机动画和过渡动画参数，部分需匹配 Shader
    // ------------------------------------------------------------------------
    animation: {
        // [待机] 呼吸效果 (Breathing)
        breatheAmp1Scale: 0.5, // 呼吸波1幅度
        breatheAmp2Scale: 0.3, // 呼吸波2幅度
        swayAmpScale: 0.4,     // 摇摆幅度

        // [待机] 闪烁效果 (Twinkling)
        twinkleFreq: 3.5,  // 频率
        twinkleAmp: 0.15,  // 幅度 +/-
        twinkleBase: 0.85, // 基础透明度

        // [待机] 尺寸脉动 (Pulse)
        sizeFreq: 2.0, // 频率
        sizeAmp: 0.08, // 幅度

        // [变形] 第二行文字的错落感
        line2DelayOffset: 0.15, // 启动延迟
        line2DelayScale: 0.35,  // 过程拉伸

        // [消散] 粒子消散参数 (需匹配 Tree Shader)
        // 这些参数控制文字如何炸开并变成树
        progressScale: 2.6,       // 动画进程缩放
        erosionNoiseWeight: 0.3,  // 噪波侵蚀权重
        heightDelayWeight: 1.0,   // 高度延迟权重（从下往上还是整体）
        upwardForce: 80,          // 向上飘升距离
        driftAmplitude: 25,       // 随机漂移幅度

        // [消散] 噪波控制
        noiseTimeScale: 2.0,
        noiseYFreq: 0.02,
        noiseXFreq: 0.03,
        noiseXTimeScale: 0.7,
        noiseDriftYScale: 0.5,

        // [消散] 生命周期与变形        fadeStart: 0.3,           // 开始淡出
        fadeEnd: 0.85,            // 完全消失
        growPhaseEnd: 0.3,        // 膨胀阶段结束
        growAmount: 0.3,          // 最大膨胀比例
        shrinkAmount: 0.6,        // 最终收缩比例
    },

    // ------------------------------------------------------------------------
    // 过渡时长 (Transitions)
    // ------------------------------------------------------------------------
    transition: {
        normalDuration: 0.8,   // 普通状态切换时长
        explodedDuration: 2.5, // 爆炸特效时长
    },
} as const;

// ============================================================================
// 3. 落地页交互流程配置 (Interaction Flow)
// ============================================================================

/** 落地页整体流程、布局与时间线配置 */
export const LANDING_CONFIG = {
    // ------------------------------------------------------------------------
    // 标题布局与响应式 (Layout)
    // ------------------------------------------------------------------------
    title: {
        scale: 1.0,                            // 全局缩放修正
        densityOverride: null as number | null, // 调试用：覆盖采样密度

        // 视口响应式规则 (Linear Interpolation)
        viewportScale: {
            minWidth: 320,   // 手机
            maxWidth: 1920,  // 大屏
            minScale: 0.5,   // 手机端缩放基数
            maxScale: 1.2,   // 大屏端缩放基数
        },

        // 对齐方式
        alignment: {
            normal: 'left' as const,   // 桌面：左对齐
            compact: 'center' as const, // 移动：居中
        },

        // 垂直位置 (ViewHeight %)
        verticalOffset: {
            normal: -10,  // 桌面：略偏上
            compact: -33, // 移动：上三分之一
        },

        // 用户名子标题配置
        userName: {
            fontSizeRatio: 0.45, // 相对主标题的大小
            yOffset: {
                normal: 2.2,  // 行距倍率
                compact: 2.4,
            },
            indent: {
                normal: 0.15,  // 左侧缩进 (Canvas Width %)
                compact: 0.1,
            },
        },
    },

    // ------------------------------------------------------------------------
    // 阶段1: 入场 (Entrance)
    // ------------------------------------------------------------------------
    entrance: {
        duration: 2.0,       // 下落动画总时长
        spreadHeight: 200,   // 初始随机高度范围
        delayVariation: 0.4, // 粒子下落延迟随机性
    },

    // ------------------------------------------------------------------------
    // 阶段2: 文本展示 (Text Display)
    // ------------------------------------------------------------------------
    typewriter: {
        charDelay: 80, // 用户名打字机速度 (ms/char)
    },

    // 待机状态下的动态参数
    text: {
        breatheAmplitude: 1.0, // 呼吸幅度全局倍率
        twinkleSpeed: 3.5,     // 闪烁速度
    },

    // ------------------------------------------------------------------------
    // 阶段3: 变形 (Morphing -> Tree)
    // ------------------------------------------------------------------------
    morphing: {
        duration: 2.5, // 粒子飞向树的动画时长
    },
} as const;
