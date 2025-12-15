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
export const COLOR_CONFIG = {
  tree: {
    presets: [
      { hex: '#D53F8C', name: 'Neon Pink' },
      { hex: '#805AD5', name: 'Electric Purple' },
      { hex: '#38B2AC', name: 'Teal Accent' },
      { hex: '#FFD700', name: 'Gold' },
      { hex: '#C0C0C0', name: 'Silver' },
      { hex: '#E53E3E', name: 'Red' },
    ] as readonly ColorPreset[],

    default: '#D53F8C',
  },

  magicDust: {
    presets: [
      { hex: '#845696', name: 'Purple' },
      { hex: '#b150e4', name: 'Bright Purple' },
      { hex: '#FFD700', name: 'Gold' },
      { hex: '#FF69B4', name: 'Hot Pink' },
      { hex: '#00CED1', name: 'Turquoise' },
      { hex: '#FF6347', name: 'Tomato' },
    ] as readonly ColorPreset[],
  },

  static: {
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
  },
} as const;

/**
 * 颜色数组 (用于向后兼容) - Deprecated, prefer COLOR_CONFIG.tree.presets
 */
export const TREE_COLORS = COLOR_CONFIG.tree.presets.map(preset => preset.hex);

/**
 * 颜色名称映射 (用于向后兼容) - Deprecated
 */
export const TREE_COLOR_NAMES = COLOR_CONFIG.tree.presets.reduce((acc, preset) => {
  acc[preset.hex] = preset.name;
  return acc;
}, {} as Record<string, string>);
