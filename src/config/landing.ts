/**
 * Landing Page Configuration
 * 落地页粒子标题系统的集中配置文件
 */

// ============================================================================
// 1. 落地页交互流程配置 (Landing Page Flow)
// ============================================================================

export const LANDING_CONFIG = {
    // ------------------------------------------------------------------------
    // 1. 颜色配置 (Color Palettes)
    // ------------------------------------------------------------------------
    colors: {
        title: [
            '#C41E3A', // 圣诞红
            '#228B22', // 森林绿
            '#FFD700', // 金色
            '#FFFFFF', // 白色
            '#DC143C', // 深红
            '#006400', // 深绿
        ],
        username: [
            '#FFD700', // 金色
            '#FFA500', // 橙色
            '#FFFAF0', // 花白色
            '#F5DEB3', // 小麦色
        ],
    },

    // ------------------------------------------------------------------------
    // 2. 基础布局与响应式 (Base Layout & Responsive)
    // ------------------------------------------------------------------------
    title: {
        // 响应式断点 (Breakpoints)
        breakpoints: {
            mobile: 768,     // 宽度 < 768px = 移动端
        },
    },

    // ------------------------------------------------------------------------
    // 3. 3D 文字粒子系统 (Text Particle System)
    // 用于将 Title 渲染为 3D WebGL 粒子，实现飘散→重构动画
    // ------------------------------------------------------------------------
    textParticle: {
        // 自适应标题文本 (Responsive Title Text)
        text: {
            normal: 'Merry Christmas',     // 桌面端
            compact: ['Merry', 'Christmas'], // 移动端
            lineSpacing: 1.1,
        },
        // 字体配置
        typography: {
            titleFont: "'Merry Christmas Flake', 'Mountains of Christmas', cursive",
            usernameFont: "'Courier New', monospace",
            samplingFontSize: 80,          // 采样基准字号 (px)
            usernameScale: 0.4,
        },
        // 粒子采样密度 (值越小粒子越密集)
        density: {
            normal: 3,    // 桌面端
            compact: 4,   // 移动端
        },
        // 粒子基础尺寸
        baseSize: {
            normal: 2.5,
            compact: 4.0,
        },
        // 动画时长 (秒)
        animation: {
            formDuration: {
                normal: 1.8,    // 桌面端
                compact: 1.2,   // 移动端
            },
            displayDuration: 2.0,   // 文字静态展示时长
            disperseDuration: 3,    // 粒子飘散时长
            reformDuration: 7.0,    // 重构时长
        },
        // 飘散动画参数 (Disperse)
        disperse: {
            upwardForce: 3.0,       // 向上飘升力度
            driftAmplitude: 2.5,    // 随机漂移幅度
            noiseScale: 0.5,        // 噪波缩放
            fadeStart: 0.3,         // 开始淡出
            fadeEnd: 0.85,          // 完全淡出
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
                normal: 20,
                compact: 16,
            },
            titleY: {
                normal: 4.0,
                compact: 8.0,
            },
            usernameY: {
                normal: 2.0,
                compact: 2.0,
            },
            zOffset: 0,
        },
    },
} as const;
