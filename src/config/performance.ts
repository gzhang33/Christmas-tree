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
            normal: 400000,
            compact: 200000,
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
                min: 1.0,
                max: 1.5,
                minDraw: 1.0,
            },
            compact: {
                min: 1.2,
                max: 1.8,
                minDraw: 1.2,
            },
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

// ============================================================================
// 3. 相机配置 (Camera Configuration)
// ============================================================================

/**
 * 相机控制配置
 * 用于 CameraController 组件
 */
export const CAMERA_CONFIG = {
    /** 默认相机设置 */
    default: {
        position: {
            normal: [0, 0, 28] as readonly [number, number, number],
            compact: [0, 0, 42] as readonly [number, number, number],
        },      // 默认位置 [x, y, z]
        lookAt: [0, 0, 0] as const,         // 默认注视点 [x, y, z]
        fov: 42,                            // 视野角度 (度)
    },

    /** 照片查看模式 */
    photoView: {
        distance: 5.5,                      // 相机到照片的距离
        dampingSpeed: 4,                    // 插值速度 (移动到照片时)
    },

    /** 过渡动画 */
    transition: {
        returnDampingSpeed: 2,              // 返回默认位置的插值速度
        returnAnimationDuration: 1.5,       // 返回动画持续时间（秒）- 之后允许用户自由控制
    },

    /** 相机距离限制 */
    limits: {
        maxDistance: 43.0,                  // 相机距离场景中心的最大距离
        maxZPosition: 43.0,                 // 相机Z轴的最大位置
    },
} as const;

// ============================================================================
// 4. 后期处理配置 (Post-Processing Configuration)
// ============================================================================

/**
 * 后期处理效果配置
 * 用于 CinematicEffects 组件
 */
export const POST_PROCESSING_CONFIG = {
    /** Bloom 辉光效果 */
    bloom: {
        /** 主 Bloom 层 - 用于树的整体轮廓 */
        primary: {
            luminanceThreshold: 0.6,        // 亮度阈值
            luminanceSmoothing: 0.85,       // 亮度平滑度
            intensity: 0.4,                 // 强度
            radius: 0.5,                    // 半径
            mipmapBlur: true,               // 启用 mipmap 模糊
        },
        /** 次 Bloom 层 - 用于星星和顶部高光 */
        secondary: {
            luminanceThreshold: 0.92,       // 亮度阈值 (更高，只影响最亮部分)
            luminanceSmoothing: 0.4,        // 亮度平滑度
            intensity: 0.35,                // 强度
            radius: 0.35,                   // 半径
            mipmapBlur: true,               // 启用 mipmap 模糊
        },
    },

    /** 晕影效果 */
    vignette: {
        offset: 0.35,                       // 偏移量 (控制晕影范围)
        darkness: 0.65,                     // 暗度 (0-1)
    },

    /** 色差效果 */
    chromaticAberration: {
        normal: 0.0002,                     // 正常状态偏移量
        exploded: 0.002,                    // 爆炸状态偏移量
        offset: {
            x: 0.0002,                      // X 轴初始偏移
            y: 0.0002,                      // Y 轴初始偏移
        },
        radialModulation: false,            // 径向调制
        modulationOffset: 0,                // 调制偏移
    },

    /** 效果合成器 */
    composer: {
        multisampling: 0,                   // 多重采样 (0 = 禁用，提升性能)
    },
} as const;
