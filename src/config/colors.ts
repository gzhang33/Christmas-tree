/**
 * Tree Color Presets
 * 
 * Predefined color options for the Christmas tree particles.
 * This is a color selection feature, not a full theme system.
 */

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

