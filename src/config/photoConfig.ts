/**
 * Photo Configuration
 * 照片配置文件
 *
 * 管理照片墙的分布、动画和布局参数
 * 用于爆炸效果时的照片展示
 */

export const PHOTO_WALL_CONFIG = {
    /**
     * 照片数量配置
     * 从爆炸粒子中生成的照片数量
     */
    count: {
        normal: 100,    // 桌面端照片数量
        compact: 60,    // 移动端大幅减少照片数量，防止爆炸时内存压力导致页面崩溃
    },

    /**
     * 照片球形分布参数
     * 控制照片在 3D 空间中的分布范围
     */
    distribution: {
        // 球形分布的半径范围
        radiusMin: 8,   // 最小半径
        radiusMax: 15,  // 最大半径

        // 垂直角度范围 (弧度) - 限制照片的高低位置
        // 0 = 赤道, PI/2 = 北极, -PI/2 = 南极
        polarAngleMin: -0.4, // 略低于地平线
        polarAngleMax: 0.7,  // 高于地平线

        // 中心偏向 - 照片更可能出现在相机前方
        // 值越高分布越分散，值越低越集中在前方
        frontBias: 0.5, // 0.5 = 均匀分布, 1.0 = 全部在前半球
    },

    /**
     * 照片卡片尺寸配置
     * 用于重叠检测和渲染
     */
    dimensions: {
        width: 1.0,              // 照片宽度
        height: 1.2,             // 照片高度
        scaleMin: 0.6,           // 最小缩放比例
        scaleMax: 1.0,           // 最大缩放比例
        angularPadding: 0.15,    // 照片之间的最小角度间隔 (弧度)
    },

    /**
     * 变形动画时序配置
     * 控制照片出现的动画时间
     */
    morphTiming: {
        startDelay: 0.1,        // 动画开始延迟 (秒)
        morphDuration: 1.5,     // 变形动画持续时间 (秒)
        staggerDelay: 0.06,     // 照片之间的交错延迟 (秒) - 增加以分散GPU负载
        fadeOutDuration: 1.0,   // 淡出动画持续时间 (秒)
    }
} as const;

/**
 * 照片位置接口
 */
export interface PhotoPosition {
    x: number;       // X 坐标
    y: number;       // Y 坐标
    z: number;       // Z 坐标
    scale: number;   // 缩放比例
    rotation: [number, number, number]; // 旋转角度 [x, y, z]
}

