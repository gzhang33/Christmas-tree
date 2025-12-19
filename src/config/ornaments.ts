/**
 * Ornament Configuration
 * 圣诞树挂件配置
 */

export type OrnamentType =
    | "FLAG"
    | "BUS"
    | "CORGI"
    | "BAUBLE";

export const ORNAMENT_CONFIG = {
    // 尺寸系数
    sizeCoefficients: {
        BUS: 1.0,
        FLAG: 1.0,
        CORGI: 1.2,
        BAUBLE: 1.0,
    } as Record<OrnamentType, number>,

    // 图片路径
    imageMap: {
        BUS: '/models/ornament-bus.png',
        FLAG: '/models/ornament-uk-flag.png',
        CORGI: '/models/ornament-corgi.png',
        BAUBLE: '/models/ornament-ball.png',
    } as Partial<Record<OrnamentType, string>>,

    // 分布逻辑
    distribution: {
        getOrnamentType: (heightRatio: number): OrnamentType => {
            const rand = Math.random();
            if (heightRatio > 0.8) {
                return "FLAG";
            } else if (heightRatio > 0.5) {
                return rand < 0.4 ? "FLAG" : "BUS";
            } else {
                const subRand = Math.random();
                if (subRand < 0.3) return "CORGI";
                return "BAUBLE";
            }
        }
    }
} as const;
