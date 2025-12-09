/**
 * Performance Configuration
 * 性能优化配置文件
 * 
 * 集中管理影响渲染性能的关键参数
 * 支持响应式配置：桌面端 (normal) 和移动端 (compact)
 */

// ============================================================================
// 1. 响应式断点配置 (Responsive Breakpoints)
// ============================================================================

/**
 * 响应式断点
 * 与 landing.ts 保持一致
 */
export const RESPONSIVE_BREAKPOINTS = {
    mobile: 768, // 宽度 < 768px = 移动端
} as const;

// ============================================================================
// 2. 粒子系统性能配置 (Particle System Performance)
// ============================================================================

/**
 * 粒子数量配置 (响应式)
 * 
 * 桌面端 (normal): 更高的粒子数量，追求视觉效果
 * 移动端 (compact): 适中的粒子数量，平衡性能和显示效果
 * 
 * 注意：移动端粒子数量不能过低，否则文字显示不清晰
 */
export const PERFORMANCE_CONFIG = {
    // ------------------------------------------------------------------------
    // 粒子数量 (Particle Count) - 响应式
    // ------------------------------------------------------------------------
    particles: {
        /** 默认粒子总数 - 响应式配置 */
        defaultCount: {
            normal: 14000,
            compact: 10000,
        },

        /** 推荐的粒子数量范围 (桌面端) */
        recommended: {
            high: 18000,   // 高端设备 (独立显卡, 60+ FPS)
            medium: 12000, // 中端设备 (集成显卡, 30-45 FPS) ✅ 推荐
            low: 8000,     // 低端设备 (20-30 FPS)
            minimal: 5000, // 最低配置 (15-20 FPS) - 不推荐用于 Landing
        },

        /** 用户可调节的粒子数量范围 (UI Controls) */
        range: {
            min: 5000,
            max: 50000,
            step: 1000,
        },
    },

    // ------------------------------------------------------------------------
    // Landing Page 性能配置 (Landing Page Performance) - 响应式
    // ------------------------------------------------------------------------
    landing: {
        /** 
         * 标题粒子采样密度 (像素间距) - 响应式
         * 值越大，粒子越少，性能越好
         * 
         * 桌面端: 可以适当降低密度以提升性能
         * 移动端: 需要保持较高密度以确保文字清晰
         */
        titleSamplingDensity: {
            normal: 6,  // 桌面端: 6px 间距 (~2500 粒子)
            compact: 5, // 移动端: 5px 间距 (~3600 粒子) - 确保文字清晰
        },

        /**
         * 3D 场景中的文字粒子采样密度 - 响应式
         * 用于 LandingParticles 组件
         * 
         * 移动端需要更高密度以确保 "Merry Christmas" 和用户名清晰显示
         */
        particleGenerationDensity: {
            normal: 5,  // 桌面端: 5px 间距
            compact: 4, // 移动端: 4px 间距 - 更高密度，确保文字清晰
        },

        /**
         * 粒子尺寸补偿 - 响应式
         * 移动端使用更大的粒子尺寸以补偿屏幕尺寸
         */
        particleSize: {
            normal: {
                min: 1.0,       // 桌面端最小尺寸
                max: 1.5,       // 桌面端最大尺寸
                minDraw: 1.0,   // 桌面端渲染最小半径
            },
            compact: {
                min: 1.0,       // 移动端最小尺寸
                max: 1.5,       // 移动端最大尺寸
                minDraw: 1.0,   // 移动端渲染最小半径
            },
        },
    },

    // ------------------------------------------------------------------------
    // 渲染优化配置 (Rendering Optimization) - 响应式
    // ------------------------------------------------------------------------
    rendering: {
        /** 后处理效果开关 - 响应式 */
        enablePostProcessing: {
            normal: true,   // 桌面端: 启用后处理
            compact: true, // 移动端: 关闭后处理以提升性能
        },

        /** 阴影渲染 (关闭可提升性能) */
        enableShadows: false,

        /** 抗锯齿质量 - 响应式 */
        antialias: {
            normal: true,   // 桌面端: 启用抗锯齿
            compact: true, // 移动端: 启用抗锯齿以提升性能
        },

        /** 像素比率上限 (防止高 DPI 屏幕过载) - 响应式 */
        maxPixelRatio: {
            normal: 2,   // 桌面端: 最大 2x
            compact: 2, // 移动端: 最大 1.5x (降低渲染负载)
        },
    },

    // ------------------------------------------------------------------------
    // 相机与交互性能 (Camera & Interaction Performance)
    // ------------------------------------------------------------------------
    camera: {
        /** 相机漂移速度 (idle drift) */
        driftSpeed: 0.15,

        /** 空闲检测阈值 (ms) */
        idleThreshold: 2000,

        /** 最小相机距离 */
        minDistance: 12,
    },
} as const;

/**
 * 性能等级预设 (响应式)
 * 可根据设备性能自动选择配置
 */
export const PERFORMANCE_PRESETS = {
    /** 高性能模式 (桌面端) */
    high: {
        normal: {
            particleCount: 18000,
            titleDensity: 4,
            particleGenDensity: 4,
            enablePostProcessing: true,
            enableShadows: false,
        },
        compact: {
            particleCount: 12000,
            titleDensity: 4,
            particleGenDensity: 4,
            enablePostProcessing: true,
            enableShadows: false,
        },
    },

    /** 平衡模式 (推荐) ✅ */
    balanced: {
        normal: {
            particleCount: 12000,
            titleDensity: 6,
            particleGenDensity: 5,
            enablePostProcessing: true,
            enableShadows: false,
        },
        compact: {
            particleCount: 10000,
            titleDensity: 5,
            particleGenDensity: 4,
            enablePostProcessing: true,
            enableShadows: false,
        },
    },

    /** 性能优先模式 */
    performance: {
        normal: {
            particleCount: 8000,
            titleDensity: 8,
            particleGenDensity: 6,
            enablePostProcessing: false,
            enableShadows: false,
        },
        compact: {
            particleCount: 6000,
            titleDensity: 7,
            particleGenDensity: 5,
            enablePostProcessing: false,
            enableShadows: false,
        },
    },
} as const;

/**
 * 性能监控阈值
 * 用于 PerformanceMonitor 组件
 */
export const PERFORMANCE_THRESHOLDS = {
    /** FPS 阈值 */
    fps: {
        excellent: 55,  // >= 55 FPS: 优秀
        good: 40,       // >= 40 FPS: 良好
        acceptable: 25, // >= 25 FPS: 可接受
        poor: 15,       // < 15 FPS: 差
    },

    /** 帧预算 (ms) */
    frameBudget: {
        target: 16.6,   // 60 FPS 目标
        warning: 25,    // 40 FPS 警告
        critical: 40,   // 25 FPS 严重
    },

    /** Draw Call 阈值 */
    drawCalls: {
        optimal: 50,
        acceptable: 100,
        warning: 150,
    },
} as const;

/**
 * 工具函数：根据窗口宽度判断是否为移动端
 */
export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < RESPONSIVE_BREAKPOINTS.mobile;
};

/**
 * 工具函数：获取响应式配置值
 * @param config 响应式配置对象 { normal: T, compact: T }
 * @returns 当前设备对应的配置值
 */
export const getResponsiveValue = <T>(config: { normal: T; compact: T }): T => {
    return isMobileDevice() ? config.compact : config.normal;
};
