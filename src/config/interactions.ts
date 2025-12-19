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

        // ========================================================================
        // Z轴深度效果 (Depth Effect on Z-Axis)
        // ========================================================================
        depthEffect: {
            forwardDistance: 0.5,      // 目标照片 Z 轴前移距离
            backwardDistance: 0.3,     // 相邻照片 Z 轴后移距离
            neighborRadius: 2.5,       // 相邻照片检测半径（3D 空间距离）
            transitionSpeed: 8,        // 深度过渡速度 (lerp factor)
            maxRenderOrder: 9999,      // 激活/悬停照片的最大渲染顺序
        },

        // ========================================================================
        // 移动端陀螺仪效果 (Mobile Gyroscope Effect)
        // ========================================================================
        gyroscope: {
            enabled: true,             // 启用陀螺仪效果
            mobileOnly: false,         // false = 支持 DevTools Sensors 调试; true = 仅移动端
            sensitivity: 0.8,          // 灵敏度 (0.5 = 低, 1.0 = 高)
            smoothing: 0.15,           // 平滑系数 (0.1 = 非常平滑, 0.3 = 响应快)
            deadzone: 0.05,            // 死区 (忽略微小倾斜)
            maxAngle: 45,              // 最大响应角度 (度)
            tiltMultiplier: 0.6,       // 倾斜效果强度乘数
        },
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
            opacity: [0.7, 1, 0.7],     // 不透明度关键帧
            scale: [1, 1.02, 1],        // 缩放关键帧
        },
        pulse: {
            scale: [1, 1.3, 1],         // 脉冲环缩放
            opacity: [0.5, 0, 0.5],     // 脉冲环透明度
        },
        arrow: {
            bounce: [0, 5, 0],          // 箭头上下弹跳距离 (px)
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
                min: 100000,
                max: 1000000,
                step: 25000,
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
            photoCount: {
                min: 20,
                max: 300,
                step: 10,
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
            tooLong: (max: number) => `名称不能超过 ${max} 个字符 / Name cannot exceed ${max} characters`,
            invalidChars: '名称只能包含中英文、数字、下划线、连字符和空格 / Name can only contain letters, numbers, underscores, hyphens and spaces',
            submitFailed: '提交失败，请重试 / Submit failed, please try again',
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

