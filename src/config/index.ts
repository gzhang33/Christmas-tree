/**
 * Configuration Index
 * 配置文件统一导出入口
 * 
 * 集中管理所有配置模块的导出，方便引用和维护
 */

// ============================================================================
// 性能配置 (Performance Configuration)
// ============================================================================
export {
    PERFORMANCE_CONFIG,
    PERFORMANCE_PRESETS,
    PERFORMANCE_THRESHOLDS,
    RESPONSIVE_BREAKPOINTS,
    isMobileDevice,
    getResponsiveValue
} from './performance';

// ============================================================================
// 圣诞树粒子配置 (Tree Particle Configuration)
// ============================================================================
export { PARTICLE_CONFIG } from './particles';

// ============================================================================
// 落地页配置 (Landing Page Configuration)
// ============================================================================
export {
    TITLE_COLORS,
    USERNAME_COLORS,
    TITLE_CONFIG,
    LANDING_CONFIG
} from './landing';

// ============================================================================
// 颜色配置 (Color Configuration)
// ============================================================================
export {
    DEFAULT_TREE_COLOR,
    TREE_COLOR_PRESETS,
    TREE_COLORS,
    TREE_COLOR_NAMES,
    STATIC_COLORS,
    type ColorPreset
} from './colors';

// ============================================================================
// 照片墙配置 (Photo Wall Configuration)
// ============================================================================
export {
    PHOTO_COUNT,
    PHOTO_DISTRIBUTION,
    PHOTO_DIMENSIONS,
    MORPH_TIMING,
    generatePhotoPositions,
    gaussianRandom,
    type PhotoPosition
} from './photoConfig';

// ============================================================================
// 交互配置 (Interaction Configuration)
// ============================================================================
export {
    INTERACTION_CONFIG,
    HOVER_CONFIG  // 向后兼容
} from './interactions';

// ============================================================================
// 资源配置 (Asset Configuration)
// ============================================================================
export { MEMORIES } from './assets';

// ============================================================================
// 雪花效果配置 (Snow Effect Configuration)
// ============================================================================
export { SNOW_CONFIG, SNOW_DEFAULTS } from './snow';
