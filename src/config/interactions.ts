/**
 * Interaction Configuration
 * 交互配置文件
 * 
 * 管理照片悬停、点击等交互行为的参数
 */

/**
 * 照片悬停效果配置
 * 用于 PolaroidPhoto 组件的悬停动画
 */
export const INTERACTION_CONFIG = {
    hover: {
        scaleTarget: 1.5,          // 悬停时放大倍数
        rotationDamping: 0.1,      // 悬停时旋转速度衰减 (90%)
        tiltMaxAngle: 0.25,        // 最大倾斜角度 (弧度, ~14度)
        transitionSpeed: 8,        // 过渡动画速度 (lerp)
        tiltSmoothing: 10,         // 倾斜效果平滑度 (lerp)
        popDistance: 1.5,          // Z轴弹出距离 (最小值)
        idealDistance: 8.0,        // 悬停时与相机的理想距离 (自适应弹出)
        emissiveIntensity: 0.5,    // 发光强度
        autoFaceSpeed: 0.1,        // 自动面向相机的速度 (四元数 slerp)
    },
} as const;

// 向后兼容：保留旧的导出名称
export const HOVER_CONFIG = INTERACTION_CONFIG.hover;

