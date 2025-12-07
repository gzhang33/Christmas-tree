/**
 * Tree Color Presets
 * 
 * Predefined color options for the Christmas tree particles.
 * This is a color selection feature, not a full theme system.
 */

import * as THREE from 'three';

export interface ColorPreset {
  hex: string;
  name: string;
}

/**
 * Available color presets for tree particles
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
 * Default tree color (Midnight Pink)
 */
export const DEFAULT_TREE_COLOR = '#D53F8C';

/**
 * Static colors used for ornaments and other elements
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
};
