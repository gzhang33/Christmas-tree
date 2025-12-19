/**
 * Responsive Utilities
 * 
 * Utility functions for handling responsive design logic.
 * Separated from config/performance.ts to keep configuration pure.
 */

import { RESPONSIVE_BREAKPOINTS } from '../config/performance';

/**
 * Viewport-based mobile detection threshold (for Three.js viewport.width)
 * 
 * Calculation basis:
 * - Camera FOV: 42°, tan(21°) ≈ 0.384
 * - Desktop camera Z: 28, Mobile camera Z: 42
 * - Formula: viewport.width = 2 * tan(fov/2) * distance * aspectRatio
 * 
 * Expected values:
 * - Desktop (16:9): viewport.width ≈ 38 at Z=28
 * - Mobile portrait (9:16): viewport.width ≈ 15 at Z=42
 * - Mobile landscape (16:9): viewport.width ≈ 26 at Z=42
 * 
 * Threshold 18 ensures:
 * - All portrait mobile devices (< 15) are detected
 * - Narrow desktop windows (768-1024px) are correctly classified
 * - Provides safe margin for camera zoom variations
 */
export const VIEWPORT_MOBILE_THRESHOLD = 18;

/**
 * 工具函数：根据窗口宽度判断是否为移动端
 */
export const isMobileDevice = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < RESPONSIVE_BREAKPOINTS.mobile;
};

/**
 * 工具函数：基于 Three.js viewport 快速判断是否为移动端
 * 用于 useFrame 等高频调用场景，避免访问 window.innerWidth
 * 
 * @param viewportWidth Three.js viewport.width 值
 * @returns 是否为移动端
 */
export const isMobileViewport = (viewportWidth: number): boolean => {
    return viewportWidth < VIEWPORT_MOBILE_THRESHOLD;
};

/**
 * 工具函数：获取响应式配置值
 * @param config 响应式配置对象 { normal: T, compact: T }
 * @returns 当前设备对应的配置值
 */
export const getResponsiveValue = <T>(config: { normal: T; compact: T }): T => {
    return isMobileDevice() ? config.compact : config.normal;
};

