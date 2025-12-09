/**
 * Interaction & UI Configuration
 * 交互与 UI 配置文件
 * 
 * 管理所有用户界面交互、动画、验证等配置
 */

export const INTERACTION_CONFIG = {
    // ========================================================================
    // 照片交互 (Photo Interaction)
    // ========================================================================
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

    // ========================================================================
    // 点击提示 (Click Prompt)
    // ========================================================================
    clickPrompt: {
        animation: {
            fadeDuration: 0.5,          // 淡入淡出时长 (秒)
            breatheDuration: 2.5,       // 呼吸动画周期 (秒)
            pulseDuration: 2,           // 脉冲环动画周期 (秒)
            arrowBounceDuration: 1.5,   // 箭头弹跳周期 (秒)
        },
        breathe: {
            opacity: [0.7, 1, 0.7] as number[],     // 不透明度关键帧
            scale: [1, 1.02, 1] as number[],        // 缩放关键帧
        },
        pulse: {
            scale: [1, 1.3, 1] as number[],         // 脉冲环缩放
            opacity: [0.5, 0, 0.5] as number[],     // 脉冲环透明度
        },
        arrow: {
            bounce: [0, 5, 0] as number[],          // 箭头上下弹跳距离 (px)
        },
    },

    // ========================================================================
    // 控制面板 (Controls Panel)
    // ========================================================================
    controls: {
        debounce: {
            particleCountDelay: 500,    // 粒子数量防抖延迟 (ms)
        },
        upload: {
            batchSize: 8,               // 批量上传文件数
        },
        toast: {
            copySuccessDuration: 2000,  // 复制成功提示持续时间 (ms)
        },
        animation: {
            panelTransitionDuration: 0.3,   // 面板展开/收起时长 (秒)
            buttonPulseDuration: 2.5,       // 按钮脉冲动画周期 (秒)
        },
        ranges: {
            particleCount: {
                min: 5000,
                max: 50000,
                step: 2500,
            },
            rotationSpeed: {
                min: 0,
                max: 5,
                step: 0.1,
            },
            photoSize: {
                min: 0.5,
                max: 3,
                step: 0.1,
            },
        },
    },

    // ========================================================================
    // 名称输入验证 (Name Input Validation)
    // ========================================================================
    nameInput: {
        validation: {
            minLength: 1,
            maxLength: 20,
            pattern: /^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/,
        },
        errorMessages: {
            empty: '请输入您的名称 / Please enter your name',
            tooLong: (max: number) => `名称不能超过 ${max} 个字符`,
            invalidChars: '名称只能包含中英文、数字、下划线、连字符和空格',
            submitFailed: '提交失败，请重试',
        },
        animation: {
            modalFadeDuration: 0.5,         // 模态框淡入淡出 (秒)
            contentDelay: 0.2,              // 内容延迟出现 (秒)
            contentDuration: 0.5,           // 内容动画时长 (秒)
        },
    },
} as const;

// 向后兼容：保留旧的导出名称
export const HOVER_CONFIG = INTERACTION_CONFIG.hover;

