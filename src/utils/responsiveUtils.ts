/**
 * Responsive Utilities
 * 
 * Utility functions for handling responsive design logic.
 * Separated from config/performance.ts to keep configuration pure.
 */

import { RESPONSIVE_BREAKPOINTS } from '../config/performance';

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
