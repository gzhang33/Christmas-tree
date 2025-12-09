/**
 * Color Configuration
 * 颜色配置文件
 * 
 * 管理圣诞树颜色预设和静态颜色常量
 */

import * as THREE from 'three';

/**
 * 颜色预设接口
 */
export interface ColorPreset {
  hex: string;
  name: string;
}

/**
 * 圣诞树可选颜色方案
 * 用于 UI 颜色选择器
 */
export const TREE_COLOR_PRESETS: readonly ColorPreset[] = [
  { hex: '#D53F8C', name: 'Neon Pink' },
  { hex: '#805AD5', name: 'Electric Purple' },
  { hex: '#38B2AC', name: 'Teal Accent' },
  { hex: '#FFD700', name: 'Gold' },
  { hex: '#C0C0C0', name: 'Silver' },
  { hex: '#E53E3E', name: 'Red' },
] as const;

/**
 * 默认圣诞树颜色 (Midnight Pink)
 */
export const DEFAULT_TREE_COLOR = '#D53F8C';

/**
 * 颜色数组 (用于向后兼容)
 */
export const TREE_COLORS = TREE_COLOR_PRESETS.map(preset => preset.hex);

/**
 * 颜色名称映射 (用于向后兼容)
 */
export const TREE_COLOR_NAMES = TREE_COLOR_PRESETS.reduce((acc, preset) => {
  acc[preset.hex] = preset.name;
  return acc;
}, {} as Record<string, string>);

/**
 * 静态颜色常量
 * 用于装饰物、光晕等固定颜色元素
 */
export const STATIC_COLORS = {
  white: new THREE.Color('#FFFFFF'),
  cream: new THREE.Color('#FFF8F0'),
  gold: new THREE.Color('#FFD700'),
  silver: new THREE.Color('#C0C0C0'),
  pearl: new THREE.Color('#FDEEF4'),
  ukRed: new THREE.Color('#C8102E'),
  ukBlue: new THREE.Color('#012169'),
  londonRed: new THREE.Color('#CC0000'),
  corgiTan: new THREE.Color('#D4A574'),
  // Enhanced festive colors for visual depth (TREE-04)
  warmGold: new THREE.Color('#FFB347'),
  deepRed: new THREE.Color('#8B0000'),
} as const;

