/**
 * Performance Configuration
 * 性能优化配置文件
 * 
 * 集中管理影响渲染性能的关键指标
 */

export const RESPONSIVE_BREAKPOINTS = {
    mobile: 768,
} as const;

export const PERFORMANCE_CONFIG = {
    // ------------------------------------------------------------------------
    // 1. 粒子总量配置 (Particle Budget)
    // ------------------------------------------------------------------------
    particles: {
        defaultCount: {
            normal: 300000,   // 桌面端 30万
            compact: 180000,  // 移动端 18万
        },
    },

    // ------------------------------------------------------------------------
    // 2. 采样与生成配置 (Sampling & Generation)
    // ------------------------------------------------------------------------
    landing: {
        /** 
         * 3D 文字生成密度 (用于 useUniversalParticleSystem)
         * 值越小粒子越密集。移动端适当减小密度以极大降低渲染压力
         */
        particleGenerationDensity: {
            normal: 4,
            compact: 6,
        },
    },

    // ------------------------------------------------------------------------
    // 3. 相机与环境 (Camera & Environment)
    // ------------------------------------------------------------------------
    camera: {
        driftSpeed: 0.15,
        idleThreshold: 2000,
        minDistance: 12,
    },
} as const;

/**
 * 相机控制详细配置
 */
export const CAMERA_CONFIG = {
    default: {
        position: {
            normal: [0, 0, 28] as readonly [number, number, number],
            compact: [0, 0, 42] as readonly [number, number, number],
        },
        lookAt: [0, 0, 0] as const,
        fov: 42,
    },
    photoView: {
        distance: 5.5,
        dampingSpeed: 4,
    },
    transition: {
        returnDampingSpeed: 2,
        returnAnimationDuration: 1.5,
        resetAnimationDuration: 1500,
    },
    limits: {
        maxDistance: 43.0,
        maxZPosition: 43.0,
    },
    explosionAnimation: {
        enabled: true,
        zoomOutDistance: 12.0,
        rotationAngle: Math.PI / 2,
        duration: 5.0,
        dampingSpeed: 1.5,
        rotationAxis: 'y' as const,
    },
    hoverVideo: {
        cameraDistance: 6.0,
        cameraHeightOffset: 0.5,
        transitionSpeed: 3.0,
    },
} as const;

/**
 * 场景环境详细配置
 */
export const SCENE_CONFIG = {
    orbitControls: {
        enablePan: false,
        minDistance: 10,
        autoRotateSpeed: 0.3,
        enableZoom: true,
        maxPolarAngle: Math.PI / 2 - 0.02,
    },
    lighting: {
        ambient: {
            intensity: 0.15,
            color: '#FFFFFF',
        },
        mainSpot: {
            position: [-5, 10, -5] as const,
            intensity: 1.2,
            color: '#FFB7C5',
            angle: 0.7,
            penumbra: 1,
            decay: 1.5,
            distance: 50,
        },
        fillSpot: {
            position: [5, 8, 5] as const,
            intensity: 0.8,
            color: '#E0F7FA',
            angle: 0.6,
            penumbra: 1,
            decay: 1.5,
            distance: 40,
        },
        dimming: {
            targetFactorHovered: 0.3,
            targetFactorNormal: 1.0,
            lerpSpeed: 3.0,
        },
    },
    environment: {
        preset: 'city' as const,
        stars: {
            radius: 150,
            depth: 60,
            count: 6000,
            factor: 4,
            saturation: 0.1,
            fade: true,
            speed: 0.3,
        },
    },
    floor: {
        position: [0, -6.6, 0] as const,
        radius: 25,
        segments: 64,
        material: {
            color: '#050001',
            metalness: 0.7,
            roughness: 0.3,
            envMapIntensity: 0.5,
        },
    },
} as const;

/**
 * 后期处理详细配置
 */
export const POST_PROCESSING_CONFIG = {
    bloom: {
        primary: {
            luminanceThreshold: 0.6,
            luminanceSmoothing: 0.85,
            intensity: 0.4,
            radius: 0.5,
            mipmapBlur: true,
        },
        secondary: {
            luminanceThreshold: 0.92,
            luminanceSmoothing: 0.4,
            intensity: 0.35,
            radius: 0.35,
            mipmapBlur: true,
        },
    },
    vignette: {
        offset: 0.35,
        darkness: 0.65,
    },
    chromaticAberration: {
        normal: 0.0002,
        exploded: 0.002,
        offset: {
            x: 0.0002,
            y: 0.0002,
        },
        radialModulation: false,
        modulationOffset: 0,
    },
    composer: {
        multisampling: 0,
    },
} as const;
