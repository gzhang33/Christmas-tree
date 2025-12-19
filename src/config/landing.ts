/**
 * Landing Page Configuration
 * 落地页粒子标题系统的集中配置文件
 * 
 * 用于: LandingTitle.tsx, LandingParticles.tsx
 */

import { PERFORMANCE_CONFIG } from './performance';

// ============================================================================
// 1. 颜色配置 (Color Palettes)
// ============================================================================

// Moved colors to LANDING_CONFIG.colors

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
        fallback: "'Merry Christmas Star', 'Great Vibes', serif",
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
        letterSpacing: {  // 字间距 (px) - NEW
            normal: 3,   // 桌面端宽间距
            compact: 3,  // 移动端较宽间距
        },
        line2Indent: {
            normal: 280,  // 桌面端第二行缩进(px)
            compact: 100, // 移动端第二行缩进(px)
        },
    },

    // ------------------------------------------------------------------------
    // 粒子采样 (Particle Sampling)
    // ------------------------------------------------------------------------
    sampling: {
        // 采样密度 - 响应式配置 (从 performance.ts 引用)
        // 桌面端: 6px, 移动端: 5px (更高密度确保文字清晰)
        density: PERFORMANCE_CONFIG.landing.titleSamplingDensity,
        canvasWidth: {
            normal: 700,  // 桌面端画布基准宽度
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
        // 粒子尺寸 - 响应式配置 (从 performance.ts 引用)
        // 桌面端: 1.8-2.4, 移动端: 2.0-2.6 (更大尺寸确保可见性)
        size: PERFORMANCE_CONFIG.landing.particleSize,
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
    // 1. 颜色配置 (Color Palettes)
    // ------------------------------------------------------------------------
    colors: {
        title: [
            '#C41E3A', // 圣诞红 (Christmas Red)
            '#228B22', // 森林绿 (Forest Green)
            '#FFD700', // 金色 (Gold)
            '#FFFFFF', // 白色 (White)
            '#DC143C', // 深红 (Crimson)
            '#006400', // 深绿 (Dark Green)
        ],
        username: [
            '#FFD700', // 金色 (Gold)
            '#FFA500', // 橙色 (Orange)
            '#FFFAF0', // 花白色 (Floral White)
            '#F5DEB3', // 小麦色 (Wheat)
        ],
    },

    // ------------------------------------------------------------------------
    // 2. 标题布局与响应式 (Title Layout & Responsive)
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
            normal: -3,  // 
            compact: -18, // 
        },

        // 水平偏移量 (Horizontal Offset)
        // 倍率值，基于 fontSize * lineSpacing 进行缩放
        horizontalOffset: {
            normal: 1.5,   // 
            compact: 0.15,  // 
        },

        // 粒子生成参数（用于3D场景，防止文本截断）
        particleGeneration: {
            fontSize: {
                normal: 120,   // 桌面端字体大小
                compact: 100,  // 移动端字体大小
            },
            density: PERFORMANCE_CONFIG.landing.particleGenerationDensity, // 采样密度（值越小粒子越密）
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
        charDelay: 120, // 用户名打字机速度 (ms/字符)
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

    // ------------------------------------------------------------------------
    // 阶段4: 3D 文字粒子系统 (Text Particle System)
    // 用于将 Title 和 Username 渲染为 3D WebGL 粒子，实现飘散→重构动画
    // ------------------------------------------------------------------------
    textParticle: {
        // 自适应标题文本 (Responsive Title Text)
        // Desktop: single line, Mobile: two lines for better readability
        text: {
            normal: 'Merry Christmas',     // Single line for desktop
            compact: ['Merry', 'Christmas'], // Two lines for mobile
            lineSpacing: 1.1,              // Reduced from 1.4 for closer fit
        },
        // 字体配置 (用于 Canvas 采样)
        typography: {
            titleFont: "'Merry Christmas Flake', 'Mountains of Christmas', cursive",
            usernameFont: "'Courier New', monospace",
            samplingFontSize: 80,          // 采样时的基准字号 (px)
            usernameScale: 0.4,            // Username 相对 Title 的大小比例
        },
        // 粒子采样密度 (值越小粒子越密集)
        density: {
            normal: 3,    // 桌面端
            compact: 4,   // 移动端 (从 6 降低到 3 以增加粒子数量)
        },
        // 粒子基础尺寸
        baseSize: {
            normal: 2.5,
            compact: 4.0, // 移动端 (从 3.0 增加到 4.0 以更清晰显示样式)
        },
        // 动画时长 (秒)
        animation: {
            formDuration: {
                normal: 1.8,    // 桌面端稍微加快 (原 2.0)
                compact: 1.2,   // 移动端显著加快，抵消视觉上的长位移感
            },
            displayDuration: 2.0,   // 文字静态展示时长
            disperseDuration: 3,  // 粒子飘散时长
            reformDuration: 5.0,    // 重构为 MagicDust 时长
        },
        // 飘散动画参数
        disperse: {
            upwardForce: 3.0,       // 向上飘升力度
            driftAmplitude: 2.5,    // 随机漂移幅度
            noiseScale: 0.5,        // 噪波缩放
            fadeStart: 0.3,         // 开始淡出进度
            fadeEnd: 0.85,          // 完全淡出进度
        },
        // 粒子颜色 (RGB)
        colors: {
            title: {
                r: 212, g: 175, b: 55, // Gold #D4AF37
            },
            username: {
                r: 244, g: 227, b: 178, // Light Gold #F4E3B2
            },
        },
        // 世界空间布局
        layout: {
            worldWidth: {
                normal: 20,   // 桌面端
                compact: 16,  // 移动端
            },
            titleY: {
                normal: 4.0,
                compact: 8.0,  // 向上移动，避免被礼物盒遮挡 (原 4.0)
            },
            usernameY: {
                normal: 2.0,
                compact: 2.0,  // 同步向上移动 (原 2.0)
            },
            zOffset: 0,       // Z 轴偏移
        },
    },
} as const;
