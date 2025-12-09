/**
 * Landing Page Configuration
 * 落地页粒子标题系统的集中配置文件
 * 
 * 用于: LandingTitle.tsx, LandingParticles.tsx
 */

// ============================================================================
// 1. 颜色配置 (Color Palettes)
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
// 2. 标题粒子系统配置 (Title Particle System)
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
            compact: 100, // 移动端第二行缩进(px)
        },
    },

    // ------------------------------------------------------------------------
    // 粒子采样 (Particle Sampling)
    // ------------------------------------------------------------------------
    sampling: {
        density: 4, // 采样间距(px)，值越小粒子越密，性能消耗越大
        canvasWidth: {
            normal: 600,  // 桌面端画布基准宽度
            compact: 600, // 移动端画布基准宽度
        },
        canvasPadding: 2, // 画布高度倍率（留出动画空间）
        canvasHeightMultiplier: {
            normal: 3.8,  // 桌面端高度倍率
            compact: 3.2, // 移动端高度倍率
        },
    },

    // ------------------------------------------------------------------------
    // 粒子渲染 (Particle Rendering)
    // ------------------------------------------------------------------------
    particle: {
        sizeMin: 1.5,              // 逻辑最小尺寸
        sizeMax: 2.0,              // 逻辑最大尺寸
        sizeMinDraw: 0.8,          // 实际渲染最小半径
    },

    effects: {
        shadowBlur: 10, // 全局阴影模糊度
    },

    // ------------------------------------------------------------------------
    // 动画参数 (Animation)
    // 主要是待机动画和过渡动画参数，部分需匹配 Shader
    // ------------------------------------------------------------------------
    animation: {
        // [待机] 呼吸效果 (Breathing)
        breatheAmp1Scale: 0.5, // 呼吸波1幅度
        breatheAmp2Scale: 0.3, // 呼吸波2幅度
        swayAmpScale: 0.4,     // 摇摆幅度 - TODO: 未实现

        // [待机] 闪烁效果 (Twinkling)
        twinkleFreq: 3.0,  // 频率 - TODO: 未使用，使用 LANDING_CONFIG.text.twinkleSpeed 代替
        twinkleAmp: 0.15,  // 幅度 +/-
        twinkleBase: 0.85, // 基础透明度

        // [待机] 尺寸脉动 (Pulse)
        sizeFreq: 2.0, // 频率 - TODO: 未实现
        sizeAmp: 0.08, // 幅度 - TODO: 未实现

        // [变形] 第二行文字的错落感
        line2DelayOffset: 0.15, // 启动延迟 - TODO: 未实现
        line2DelayScale: 0.35,  // 过程拉伸 - TODO: 未实现

        // [消散] 粒子消散参数 (需匹配 Tree Shader)
        // 这些参数控制文字如何炸开并变成树
        // TODO: 当前未在 LandingTitle.tsx 中使用，预留给未来 shader 实现
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

        // [消散] 生命周期与变形
        fadeStart: 0.3,           // 开始淡出
        fadeEnd: 0.85,            // 完全消失
        growPhaseEnd: 0.3,        // 膨胀阶段结束
        growAmount: 0.3,          // 最大膨胀比例
        shrinkAmount: 0.6,        // 最终收缩比例
    },
} as const;

// ============================================================================
// 3. 落地页交互流程配置 (Landing Page Flow)
// ============================================================================

export const LANDING_CONFIG = {
    // ------------------------------------------------------------------------
    // 标题布局与响应式 (Title Layout & Responsive)
    // ------------------------------------------------------------------------
    title: {
        // 全局缩放与密度
        scale: 1.0,                            // 全局缩放修正
        densityOverride: null as number | null, // 调试用：覆盖采样密度

        // 响应式断点 (Breakpoints)
        breakpoints: {
            mobile: 768,     // 宽度 < 768px = 移动端
        },

        // 视口缩放规则 (Viewport Scaling)
        viewportScale: {
            minWidth: 320,   // 最小屏幕宽度（手机）
            maxWidth: 1920,  // 最大屏幕宽度（大屏）
            minScale: 0.5,   // 手机端缩放基数
            maxScale: 1.2,   // 大屏端缩放基数
        },

        // 安全边距 (Padding)
        padding: {
            horizontal: {
                mobile: 20,   // 移动端横向边距
                desktop: 40,  // 桌面端横向边距
            },
            vertical: {
                mobile: 100,  // 移动端纵向边距（为 ClickPrompt 留出空间）
                desktop: 150, // 桌面端纵向边距
            },
            leftPadding: 'clamp(40px, 5vw, 80px)', // 左对齐时的 CSS 边距
        },

        // 对齐方式 (Alignment)
        alignment: {
            normal: 'left' as const,   // 桌面：左对齐
            compact: 'center' as const, // 移动：居中
        },

        // 垂直偏移量 (Vertical Offset)
        // 百分比相对于视口高度
        verticalOffset: {
            normal: -3,  // 桌面：略偏上
            compact: -18, // 移动：上移（较高位置）
        },

        // 水平偏移量 (Horizontal Offset)
        // 倍率值，基于 fontSize * lineSpacing 进行缩放
        horizontalOffset: {
            normal: 1.5,   // 桌面：无水平偏移（左对齐已通过 leftPadding 控制）
            compact: 0.15,  // 移动：无水平偏移（居中对齐）
        },

        // 粒子生成参数（用于3D场景，防止文本截断）
        particleGeneration: {
            fontSize: {
                normal: 120,   // 桌面端字体大小
                compact: 100,  // 移动端字体大小
            },
            density: 4, // 采样密度（值越小粒子越密）
            worldWidth: {
                normal: 24,  // 桌面端世界宽度（增大以防止截断）
                compact: 20, // 移动端世界宽度
            },
            zOffset: 0, // Z轴偏移
            yOffset: 2, // Y轴偏移
        },

        // 动画与过渡 (Animation & Transition)
        animation: {
            fadeTransitionDuration: 0.3, // Motion.div 淡入淡出时长 (秒)
            defaultScreenHeight: 1080,   // 默认屏幕高度（用于计算回退值）
        },
    },

    // ------------------------------------------------------------------------
    // 用户名配置 (Username)
    // ------------------------------------------------------------------------
    userName: {
        // 字体与尺寸
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        fontSizeRatio: 0.45, // 相对主标题的大小比例

        // Canvas 尺寸倍数
        canvasWidthMultiplier: {
            min: 0.6,     // 最小宽度（相对主 canvas）
            padding: 1.2, // 测量宽度的填充倍数
        },
        canvasHeightMultiplier: 1.5, // 高度 = 字体大小 * 此值

        // 位置偏移（倍率值，基于 fontSize * lineSpacing 进行缩放）
        yOffset: {
            normal: 0.5,  // 桌面端垂直偏移倍率
            compact: 1.5, // 移动端垂直偏移倍率
        },
        xOffset: {
            normal: 5.15,  // 桌面端水平偏移倍率
            compact: 0.3,    // 移动端水平偏移倍率（居中时通常为0）
        },
    },

    // ------------------------------------------------------------------------
    // 阶段1: 入场动画 (Entrance Animation)
    // ------------------------------------------------------------------------
    entrance: {
        duration: 1.5,       // 下落动画总时长 (秒)
        spreadHeight: 400,   // 初始随机高度范围 (px)
        delayVariation: 0.4, // 粒子下落延迟随机性 (0-1)
    },

    // ------------------------------------------------------------------------
    // 阶段2: 文本展示 (Text Display)
    // ------------------------------------------------------------------------
    typewriter: {
        charDelay: 80, // 用户名打字机速度 (ms/字符)
    },

    text: {
        breatheAmplitude: 1.0, // 呼吸幅度全局倍率
        twinkleSpeed: 3.5,     // 闪烁速度
    },

    // ------------------------------------------------------------------------
    // 阶段3: 变形动画 (Morphing Animation -> Tree)
    // ------------------------------------------------------------------------
    morphing: {
        duration: 2.5, // 粒子飞向树的动画时长 (秒)
    },
} as const;
