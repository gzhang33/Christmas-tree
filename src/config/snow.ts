/**
 * 雪花效果配置
 * Snow effect configuration
 */

export const SNOW_CONFIG = {
    // 雪花纹理配置
    texture: {
        canvasSize: 128, // 画布尺寸
        lineWidth: 4, // 线条宽度
        lineCap: 'round' as CanvasLineCap, // 线条端点样式
        shadowBlur: 5, // 阴影模糊度
        shadowColor: 'white', // 阴影颜色
        strokeColor: 'white', // 描边颜色
        centerX: 64, // 中心点 X 坐标
        centerY: 64, // 中心点 Y 坐标
        radius: 45, // 雪花半径
        branches: 6, // 分支数量
        branchSize: 12, // 分支大小
        innerVBranchPosition: 0.4, // 内部 V 型分支位置（相对于半径）
        innerVBranchExtend: 0.6, // 内部 V 型分支延伸（相对于半径）
        outerVBranchPosition: 0.7, // 外部 V 型分支位置（相对于半径）
        outerVBranchExtend: 0.9, // 外部 V 型分支延伸（相对于半径）
        outerVBranchScale: 0.8, // 外部 V 型分支缩放比例
    },

    // 粒子初始化配置
    particles: {
        // 空间分布范围
        spawnArea: {
            width: 60, // X 轴范围
            height: 40, // Y 轴初始高度范围
            depth: 60, // Z 轴范围
        },

        // 下落速度配置
        velocity: {
            min: 0.01, // 最小下落速度
            max: 0.05, // 最大下落速度
        },

        // 旋转速度配置
        rotation: {
            speedRange: 0.03, // 旋转速度范围（speedRange-0.025 到 speedRange+0.025）
        },

        // 摆动配置
        sway: {
            xRange: 0.02, // X 轴摆动幅度
            zRange: 0.02, // Z 轴摆动幅度
            frequencyMin: 1, // 最小摆动频率
            frequencyMax: 3, // 最大摆动频率
        },

        // 尺寸配置
        scale: {
            min: 0.2, // 最小缩放比例
            max: 0.6, // 最大缩放比例
        },
    },

    // 动画配置
    animation: {
        // 风力配置
        wind: {
            baseForce: 0.05, // 基础风力
            timeModulation: 0.5, // 时间调制频率
            xFrequency: 1.2, // X 轴风力频率
            xAmplitude: 0.01, // X 轴风力幅度
            zScale: 0.2, // Z 轴风力缩放
            respawnOffset: 10, // 重生时的风向偏移
        },

        // 重置配置
        reset: {
            yThreshold: -10, // Y 轴重置阈值（低于此值时重置）
            respawnYMin: 30, // 重生时的最小 Y 坐标
            respawnYMax: 40, // 重生时的最大 Y 坐标
        },

        // 摆动动画配置
        sway: {
            frequencyScale: 0.8, // Z 轴摆动频率缩放
        },
    },

    // 材质配置
    material: {
        transparent: true, // 启用透明
        opacity: 0.9, // 不透明度
        depthWrite: false, // 禁用深度写入
        side: 2, // THREE.DoubleSide - 双面可见
        blending: 2, // THREE.AdditiveBlending - 加法混合
    },

    // 几何体配置
    geometry: {
        planeWidth: 1, // 平面宽度
        planeHeight: 1, // 平面高度
    },
} as const;

/**
 * 雪花效果默认属性
 */
export const SNOW_DEFAULTS = {
    count: 1000, // 默认雪花数量
    speed: 1.0, // 默认速度倍数
    wind: 0.5, // 默认风力倍数
} as const;
