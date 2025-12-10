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
            normal: 4,  // 桌面端: 4px 间距 (密度增加，更清晰)
            compact: 3, // 移动端: 3px 间距 (密度增加，更清晰)
        },

        /**
         * 3D 场景中的文字粒子采样密度 - 响应式
         * 用于 LandingParticles 组件
         * 
         * 移动端需要更高密度以确保 "Merry Christmas" 和用户名清晰显示
         */
        particleGenerationDensity: {
            normal: 4,  // 桌面端: 4px 间距
            compact: 3, // 移动端: 3px 间距
        },

        /**
         * 粒子尺寸补偿 - 响应式
         * 移动端使用更大的粒子尺寸以补偿屏幕尺寸
         */
        particleSize: {
            normal: {
                min: 1.6,
                max: 2.4,
                minDraw: 1.6,
            },
            compact: {
                min: 1.8,
                max: 2.6,
                minDraw: 1.8,
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
        resetAnimationDuration: 1500,       // 重置动画持续时间（毫秒）
    },

    /** 相机距离限制 */
    limits: {
        maxDistance: 43.0,                  // 相机距离场景中心的最大距离
        maxZPosition: 43.0,                 // 相机Z轴的最大位置
    },
} as const;

// ============================================================================
// 4. 场景配置 (Scene Configuration)
// ============================================================================

/**
 * 场景配置
 * 包含OrbitControls、光照、环境等参数
 */
export const SCENE_CONFIG = {
    /** OrbitControls 配置 */
    orbitControls: {
        enablePan: false,                   // 禁用平移
        minDistance: 10,                    // 最小距离
        autoRotateSpeed: 0.3,               // 自动旋转速度
        enableZoom: true,                   // 启用缩放
        maxPolarAngle: Math.PI / 2 - 0.02,  // 最大极角（防止相机穿过地面）
    },

    /** 光照配置 */
    lighting: {
        /** 环境光 */
        ambient: {
            intensity: 0.15,                // 强度
            color: '#FFFFFF',               // 颜色
        },
        /** 主光源 (Key Light) */
        mainSpot: {
            position: [-5, 10, -5] as const,// 位置
            intensity: 1.2,                 // 强度
            color: '#FFB7C5',               // 颜色
            angle: 0.7,                     // 光锥角度
            penumbra: 1,                    // 半影
            decay: 1.5,                     // 衰减
            distance: 50,                   // 距离
        },
        /** 补光 (Fill Light) */
        fillSpot: {
            position: [5, 8, 5] as const,   // 位置
            intensity: 0.8,                 // 强度
            color: '#E0F7FA',               // 颜色
            angle: 0.6,                     // 光锥角度
            penumbra: 1,                    // 半影
            decay: 1.5,                     // 衰减
            distance: 40,                   // 距离
        },
        /** 光照调光效果 */
        dimming: {
            targetFactorHovered: 0.3,       // 悬停时的目标因子
            targetFactorNormal: 1.0,        // 正常时的目标因子
            lerpSpeed: 3.0,                 // 插值速度
        },
    },

    /** 环境配置 */
    environment: {
        preset: 'city' as const,            // 环境预设
        stars: {
            radius: 150,                    // 半径
            depth: 60,                      // 深度
            count: 6000,                    // 数量
            factor: 4,                      // 因子
            saturation: 0.1,                // 饱和度
            fade: true,                     // 淡入淡出
            speed: 0.3,                     // 速度
        },
    },

    /** 地面配置 */
    floor: {
        position: [0, -6.6, 0] as const,    // 位置
        radius: 25,                         // 半径
        segments: 64,                       // 分段数
        material: {
            color: '#050001',               // 颜色
            metalness: 0.7,                 // 金属度
            roughness: 0.3,                 // 粗糙度
            envMapIntensity: 0.5,           // 环境贴图强度
        },
    },
} as const;

// ============================================================================
// 5. 后期处理配置 (Post-Processing Configuration)
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
