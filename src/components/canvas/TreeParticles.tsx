import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { AppConfig } from '../../types.ts';
import { useStore } from '../../store/useStore';
import particleVertexShader from '../../shaders/particle.vert?raw';
import particleFragmentShader from '../../shaders/particle.frag?raw';

// Create shader material with error handling
let ExplosionMaterial: ReturnType<typeof shaderMaterial>;
let shaderCompilationFailed = false;

try {
  ExplosionMaterial = shaderMaterial(
    {
      uTime: 0,
      uProgress: 0,
      uColor: new THREE.Color(),
    },
    particleVertexShader,
    particleFragmentShader
  );
  extend({ ExplosionMaterial });
} catch (error) {
  console.error('[TreeParticles] Shader compilation failed:', error);
  shaderCompilationFailed = true;
  // Fallback: create a basic material that won't crash the app
  ExplosionMaterial = shaderMaterial(
    { uTime: 0, uProgress: 0, uColor: new THREE.Color() },
    // Minimal vertex shader
    `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = 5.0; }`,
    // Minimal fragment shader
    `void main() { gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }`
  );
  extend({ ExplosionMaterial });
}

// Add type definition for the new material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      explosionMaterial: any;
    }
  }
}

interface TreeParticlesProps {
  isExploded: boolean;
  config: AppConfig;
  onParticlesClick: () => void;
}

// === TEXTURE FACTORY ===

// Feathery texture for entity layer (Normal blending)
const createFeatherTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Soft feathery gradient with depth
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Dynamic sparkle texture for glow layer (Additive blending)
const createSparkleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 64, 64);

  // Core glow
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.1, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  // Cross flare for sparkle effect
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(32, 60);
  ctx.moveTo(4, 32);
  ctx.lineTo(60, 32);
  type ThemeType = 'CROWN' | 'BIG_BEN' | 'FLAG' | 'BUS' | 'CORGI' | 'GIFT';

  const assignThemeParticle = (heightRatio: number): ThemeType => {
    const rand = Math.random();
    if (heightRatio > 0.8) {
      // Top 20%: Crown or Big Ben
      return rand < 0.7 ? 'CROWN' : 'BIG_BEN';
    } else if (heightRatio > 0.5) {
      // Middle 30%: Flag or Bus
      return rand < 0.4 ? 'FLAG' : 'BUS';
    } else {
      // Bottom 50%: Corgi or Gift
      return rand < 0.3 ? 'CORGI' : 'GIFT';
    }
  };
};

// === BRITISH THEME DISTRIBUTION ALGORITHM ===
type ThemeType = 'CROWN' | 'BIG_BEN' | 'FLAG' | 'BUS' | 'CORGI' | 'GIFT' | 'PEARL' | 'BAUBLE';

const assignThemeParticle = (heightRatio: number): ThemeType => {
  const rand = Math.random();
  if (heightRatio > 0.8) {
    // Top 20%: Crown or Big Ben
    return rand < 0.7 ? 'CROWN' : 'BIG_BEN';
  } else if (heightRatio > 0.5) {
    // Middle 30%: Flag or Bus
    return rand < 0.4 ? 'FLAG' : 'BUS';
  } else {
    // Bottom 50%: Corgi or Gift
    return rand < 0.3 ? 'CORGI' : 'GIFT';
  }
};

// Galaxy position helper
const getGalaxyPos = (radius: number): [number, number, number] => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = Math.random() * radius + 15;
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
};

// === COLOR PALETTE ===
// === COLOR PALETTE ===
const DEFAULT_COLORS = {
  // Neutrals
  white: new THREE.Color('#FFFFFF'),
  cream: new THREE.Color('#FFF8F0'),
  gold: new THREE.Color('#FFD700'),
  silver: new THREE.Color('#C0C0C0'),
  pearl: new THREE.Color('#FDEEF4'),
  // British theme colors
  ukRed: new THREE.Color('#C8102E'),
  ukBlue: new THREE.Color('#012169'),
  londonRed: new THREE.Color('#CC0000'),
  corgiTan: new THREE.Color('#D4A574'),
};

// Size coefficients per theme element
const SIZE_COEFFICIENTS: Record<ThemeType, number> = {
  BUS: 1.2,
  FLAG: 1.0,
  CORGI: 0.9,
  BIG_BEN: 1.1,
  CROWN: 1.3,
  GIFT: 1.0,
  PEARL: 0.8,
  BAUBLE: 1.0,
};

// === LOD SYSTEM ===
interface LODLevel {
  distance: number;
  particleRatio: number;
  enableShadows: boolean;
  quality: 'high' | 'medium' | 'low';
}

const LOD_LEVELS: LODLevel[] = [
  { distance: 20, particleRatio: 1.0, enableShadows: true, quality: 'high' },
  { distance: 35, particleRatio: 0.8, enableShadows: false, quality: 'medium' },
  { distance: 50, particleRatio: 0.5, enableShadows: false, quality: 'low' },
];

const getLODLevel = (cameraDistance: number): LODLevel => {
  for (const level of LOD_LEVELS) {
    if (cameraDistance <= level.distance) return level;
  }
  return LOD_LEVELS[LOD_LEVELS.length - 1];
};

// === PARTICLE RESOURCE ALLOCATION CONFIGURATION ===
// UI/UX Design: Centralized resource distribution for all visual elements
// Total allocation must equal 100% of config.particleCount
// 
// Design rationale:
// - Entity Layer (55%): Primary visual element, tree body needs substantial particles for density
// - Glow Layer (20%): Atmospheric enhancement, additive blending creates visual impact with fewer particles
// - Ornaments (15%): Decorative elements distributed across tree, need sufficient density for visibility
// - Crown (5%): Top focal point, smaller area but needs detail for visual prominence
// - Gifts (5%): Bottom elements, supporting role, balanced but not overwhelming
//
// To modify allocations: Update the values below ensuring they sum to 1.0 (100%)
const PARTICLE_ALLOCATION = {
  // Main tree body layers (75% total)
  entityLayer: 0.55,      // 55% - Tree body particles (Normal blending)
  glowLayer: 0.20,         // 20% - Atmospheric glow particles (Additive blending)

  // Decoration elements (25% total)
  decorations: {
    ornaments: 0.15,       // 15% - British themed ornaments and pearl strings
    crown: 0.05,           // 5% - Crystal crown topper
    gifts: 0.05,           // 5% - Gift boxes at base
  },
} as const;

// Validation: Ensure total equals 100%
const TOTAL_ALLOCATION =
  PARTICLE_ALLOCATION.entityLayer +
  PARTICLE_ALLOCATION.glowLayer +
  PARTICLE_ALLOCATION.decorations.ornaments +
  PARTICLE_ALLOCATION.decorations.crown +
  PARTICLE_ALLOCATION.decorations.gifts;

if (Math.abs(TOTAL_ALLOCATION - 1.0) > 0.001) {
  console.warn(
    `Particle allocation error: Total is ${(TOTAL_ALLOCATION * 100).toFixed(2)}%, expected 100%. ` +
    `Please adjust PARTICLE_ALLOCATION values to sum to 1.0.`
  );
}

// Decoration sub-allocation ratios (for internal decoration distribution)
// These ratios determine how decoration particles are split among ornament types
// Original historical ratios: ornaments 3000, crown 1800, gifts 5500 (total 10300)
// Normalized to: 30:18:55 (simplified from 3000:1800:5500)
const DECORATION_RATIOS = {
  ornaments: 30,
  crown: 18,
  gifts: 55,
} as const;

const DECORATION_TOTAL =
  DECORATION_RATIOS.ornaments +
  DECORATION_RATIOS.crown +
  DECORATION_RATIOS.gifts;

// === EXPLOSION PHYSICS CONFIGURATION ===
// Control point distance affects the arc trajectory of the explosion
// - Base distance: minimum distance for control point from particle position
// - Random factor: additional random distance for variation
// These values are now derived from config.explosionRadius for consistency
const getControlPointDistance = (explosionRadius: number): { base: number; randomFactor: number } => ({
  base: explosionRadius * 0.25,           // 25% of explosion radius as base
  randomFactor: explosionRadius * 0.5,    // Additional 0-50% random variation
});

// === MAIN COMPONENT ===
export const TreeParticles: React.FC<TreeParticlesProps> = ({
  isExploded,
  config,
  onParticlesClick,
}) => {
  // Refs for each layer
  const entityLayerRef = useRef<THREE.Points>(null);
  const glowLayerRef = useRef<THREE.Points>(null);
  const ornamentsRef = useRef<THREE.Points>(null);
  const crownRef = useRef<THREE.Points>(null);
  const giftsRef = useRef<THREE.Points>(null);

  // LOD state
  const lodRef = useRef<LODLevel>(LOD_LEVELS[0]);

  // Textures
  const featherTexture = useMemo(() => createFeatherTexture(), []);
  const sparkleTexture = useMemo(() => createSparkleTexture(), []);

  // === DYNAMIC THEME COLORS ===
  const themeColors = useMemo(() => {
    const base = new THREE.Color(config.treeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);

    return {
      base: base,
      light: new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l + 0.2, 0.95)),
      deep: new THREE.Color().setHSL(hsl.h, hsl.s * 1.2, Math.max(hsl.l - 0.15, 0.2)),
      dark: new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l - 0.3, 0.1)),
    };
  }, [config.treeColor]);

  // === ENTITY LAYER (Normal Blending) ===
  const entityLayerData = useMemo(() => {
    // Use centralized allocation configuration
    const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.entityLayer);
    const posStart = new Float32Array(count * 3);
    const posEnd = new Float32Array(count * 3);
    const controlPoint = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const random = new Float32Array(count);

    const treeHeight = 14;

    for (let i = 0; i < count; i++) {
      // Vertical distribution - more at bottom
      const t = Math.pow(Math.random(), 0.6);
      const y = -5.5 + t * treeHeight;

      // Cone radius with organic variation
      const baseRadius = (1 - t) * 5.5;
      const layerNoise = Math.sin(y * 2.5) * 0.3;
      const coneR = baseRadius + layerNoise;

      // Branch structure
      const branchAngle = Math.random() * Math.PI * 2;
      const distFromTrunk = Math.pow(Math.random(), 0.7);

      // Natural droop at tips
      const droop = distFromTrunk * distFromTrunk * 1.2;

      // Position with flocking noise
      const r = distFromTrunk * coneR;
      const flockNoise = (Math.random() - 0.5) * 0.4;
      const x = Math.cos(branchAngle) * r + flockNoise;
      const z = Math.sin(branchAngle) * r + flockNoise;
      const finalY = y - droop + (Math.random() - 0.5) * 0.3;

      posStart[i * 3] = x;
      posStart[i * 3 + 1] = finalY;
      posStart[i * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      posEnd[i * 3] = gx;
      posEnd[i * 3 + 1] = gy;
      posEnd[i * 3 + 2] = gz;

      // Control Point (Start + Explosion Vector)
      // Vector from center (0,0,0) to start position, normalized and scaled
      const len = Math.sqrt(x * x + finalY * finalY + z * z) || 1;
      const dirX = x / len;
      const dirY = finalY / len;
      const dirZ = z / len;
      const cpDist = getControlPointDistance(config.explosionRadius);
      const dist = cpDist.base + Math.random() * cpDist.randomFactor;
      controlPoint[i * 3] = x + dirX * dist;
      controlPoint[i * 3 + 1] = finalY + dirY * dist;
      controlPoint[i * 3 + 2] = z + dirZ * dist;

      // Color based on position
      const isTip = distFromTrunk > 0.75;
      const isInner = distFromTrunk < 0.25;
      const heightFactor = t;

      let c: THREE.Color;
      if (isTip) {
        c = Math.random() > 0.4 ? DEFAULT_COLORS.cream : themeColors.light;
      } else if (isInner) {
        c = themeColors.deep;
      } else {
        c = themeColors.base.clone().lerp(themeColors.light, heightFactor * 0.5);
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      random[i] = Math.random();
    }

    return { posStart, posEnd, controlPoint, colors: col, random, count };
  }, [config.particleCount, config.explosionRadius, themeColors]);

  // === GLOW LAYER (Additive Blending) ===
  const glowLayerData = useMemo(() => {
    // Use centralized allocation configuration
    const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.glowLayer);
    const posStart = new Float32Array(count * 3);
    const posEnd = new Float32Array(count * 3);
    const controlPoint = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const random = new Float32Array(count);

    const treeHeight = 14;

    for (let i = 0; i < count; i++) {
      const t = Math.pow(Math.random(), 0.5);
      const y = -5.5 + t * treeHeight;

      const baseRadius = (1 - t) * 5.5;
      const coneR = baseRadius + Math.sin(y * 2) * 0.2;

      const branchAngle = Math.random() * Math.PI * 2;
      const distFromTrunk = Math.pow(Math.random(), 0.6);
      const r = distFromTrunk * coneR;

      const x = Math.cos(branchAngle) * r;
      const z = Math.sin(branchAngle) * r;

      posStart[i * 3] = x;
      posStart[i * 3 + 1] = y;
      posStart[i * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      posEnd[i * 3] = gx;
      posEnd[i * 3 + 1] = gy;
      posEnd[i * 3 + 2] = gz;

      // Control Point
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const cpDist = getControlPointDistance(config.explosionRadius);
      const dist = cpDist.base + Math.random() * cpDist.randomFactor;
      controlPoint[i * 3] = x + (x / len) * dist;
      controlPoint[i * 3 + 1] = y + (y / len) * dist;
      controlPoint[i * 3 + 2] = z + (z / len) * dist;

      // Bright glow colors with HDR boost
      const colorChoice = Math.random();
      let c: THREE.Color;
      let intensity: number;

      if (colorChoice < 0.5) {
        c = DEFAULT_COLORS.white;
        intensity = 1.5 + Math.random() * 0.5;
      } else if (colorChoice < 0.75) {
        c = themeColors.light;
        intensity = 1.3 + Math.random() * 0.4;
      } else {
        c = DEFAULT_COLORS.gold;
        intensity = 1.8 + Math.random() * 0.5;
      }

      col[i * 3] = c.r * intensity;
      col[i * 3 + 1] = c.g * intensity;
      col[i * 3 + 2] = c.b * intensity;

      random[i] = Math.random();
    }

    return { posStart, posEnd, controlPoint, colors: col, random, count };
  }, [config.particleCount, config.explosionRadius, themeColors]);

  // === ORNAMENTS - British themed with distribution algorithm ===
  const ornamentData = useMemo(() => {
    // Use centralized allocation configuration
    const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.decorations.ornaments);

    const posStart = new Float32Array(count * 3);
    const posEnd = new Float32Array(count * 3);
    const controlPoint = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const random = new Float32Array(count);

    const treeHeight = 14;
    const treeBottom = -5.5;

    // Generate ornament clusters (scale cluster count with particle count)
    const baseClusterCount = 80;
    const baseParticleCount = 3000;
    const clusterCount = Math.max(20, Math.floor(baseClusterCount * (count / baseParticleCount)));
    const clusters: Array<{
      y: number;
      angle: number;
      type: ThemeType;
      baseSize: number;
    }> = [];

    for (let i = 0; i < clusterCount; i++) {
      const t = 0.05 + Math.random() * 0.9;
      const y = treeBottom + t * treeHeight;
      const heightRatio = t;
      const angle = Math.random() * Math.PI * 2;
      const type = assignThemeParticle(heightRatio);
      const baseSize = 0.3 + Math.random() * 0.2;

      clusters.push({ y, angle, type, baseSize });
    }

    let idx = 0;

    // Pearl strings spiraling around tree (scale with count)
    const basePearlCount = 1400;
    const baseOrnamentCount = 3000;
    const pearlCount = Math.floor(count * (basePearlCount / baseOrnamentCount));
    for (let i = 0; i < pearlCount; i++) {
      if (idx >= count) break;
      const t = i / pearlCount;
      const y = 7.5 - t * 13;
      const theta = t * Math.PI * 16;
      const baseR = (1 - (y + 5.5) / treeHeight) * 5.2 + 0.3;

      const x = Math.cos(theta) * baseR;
      const z = Math.sin(theta) * baseR;

      posStart[idx * 3] = x;
      posStart[idx * 3 + 1] = y + Math.sin(theta * 3) * 0.1;
      posStart[idx * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      posEnd[idx * 3] = gx;
      posEnd[idx * 3 + 1] = gy;
      posEnd[idx * 3 + 2] = gz;

      // Control Point
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const cpDist = getControlPointDistance(config.explosionRadius);
      const dist = cpDist.base + Math.random() * cpDist.randomFactor;
      controlPoint[idx * 3] = x + (x / len) * dist;
      controlPoint[idx * 3 + 1] = y + (y / len) * dist;
      controlPoint[idx * 3 + 2] = z + (z / len) * dist;

      const c = i % 3 === 0 ? DEFAULT_COLORS.pearl : DEFAULT_COLORS.silver;
      col[idx * 3] = c.r * 1.5;
      col[idx * 3 + 1] = c.g * 1.5;
      col[idx * 3 + 2] = c.b * 1.5;

      random[idx] = Math.random();
      idx++;
    }

    // British themed ornament clusters
    clusters.forEach((cluster) => {
      const baseParticlesPerCluster = 18;
      const baseOrnamentCount = 3000;
      const particlesPerCluster = Math.max(3, Math.floor(baseParticlesPerCluster * (count / baseOrnamentCount)));
      const baseR = (1 - (cluster.y + 5.5) / treeHeight) * 5 + 0.5;
      const cx = Math.cos(cluster.angle) * baseR;
      const cz = Math.sin(cluster.angle) * baseR;
      const sizeCoef = SIZE_COEFFICIENTS[cluster.type];

      for (let p = 0; p < particlesPerCluster; p++) {
        if (idx >= count) break;

        const ox = (Math.random() - 0.5) * cluster.baseSize * sizeCoef;
        const oy = (Math.random() - 0.5) * cluster.baseSize * sizeCoef;
        const oz = (Math.random() - 0.5) * cluster.baseSize * sizeCoef;

        const x = cx + ox;
        const y = cluster.y + oy;
        const z = cz + oz;

        posStart[idx * 3] = x;
        posStart[idx * 3 + 1] = y;
        posStart[idx * 3 + 2] = z;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        posEnd[idx * 3] = gx;
        posEnd[idx * 3 + 1] = gy;
        posEnd[idx * 3 + 2] = gz;

        // Control Point
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const cpDist = getControlPointDistance(config.explosionRadius);
        const dist = cpDist.base + Math.random() * cpDist.randomFactor;
        controlPoint[idx * 3] = x + (x / len) * dist;
        controlPoint[idx * 3 + 1] = y + (y / len) * dist;
        controlPoint[idx * 3 + 2] = z + (z / len) * dist;

        // Color by theme type
        let c: THREE.Color;
        switch (cluster.type) {
          case 'BUS':
            c = DEFAULT_COLORS.londonRed;
            break;
          case 'FLAG':
            c = p % 3 === 0 ? DEFAULT_COLORS.ukRed : p % 3 === 1 ? DEFAULT_COLORS.ukBlue : DEFAULT_COLORS.white;
            break;
          case 'CORGI':
            c = DEFAULT_COLORS.corgiTan;
            break;
          case 'BIG_BEN':
            c = DEFAULT_COLORS.silver;
            break;
          case 'CROWN':
            c = DEFAULT_COLORS.gold;
            break;
          case 'GIFT':
            c = Math.random() > 0.5 ? themeColors.base : DEFAULT_COLORS.white;
            break;
          default:
            c = DEFAULT_COLORS.silver;
        }

        col[idx * 3] = c.r;
        col[idx * 3 + 1] = c.g;
        col[idx * 3 + 2] = c.b;

        random[idx] = Math.random();
        idx++;
      }
    });

    return { posStart, posEnd, controlPoint, colors: col, random, count: idx };
  }, [config.particleCount, config.explosionRadius, themeColors]);

  // === CRYSTAL CROWN - Enhanced with HDR glow ===
  const crownData = useMemo(() => {
    // Use centralized allocation configuration
    const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.decorations.crown);

    const posStart = new Float32Array(count * 3);
    const posEnd = new Float32Array(count * 3);
    const controlPoint = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const random = new Float32Array(count);

    const crownY = 8.8;
    let idx = 0;

    // Crown base ring (scale with count)
    const baseRingParticleCount = 350;
    const baseCrownCount = 1800;
    const baseRingCount = Math.max(50, Math.floor(baseRingParticleCount * (count / baseCrownCount)));
    for (let i = 0; i < baseRingCount; i++) {
      if (idx >= count) break;
      const theta = (i / baseRingCount) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.1;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const y = crownY + Math.random() * 0.3;

      posStart[idx * 3] = x;
      posStart[idx * 3 + 1] = y;
      posStart[idx * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      posEnd[idx * 3] = gx;
      posEnd[idx * 3 + 1] = gy;
      posEnd[idx * 3 + 2] = gz;

      // Control Point
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const cpDist = getControlPointDistance(config.explosionRadius);
      const dist = cpDist.base + Math.random() * cpDist.randomFactor;
      controlPoint[idx * 3] = x + (x / len) * dist;
      controlPoint[idx * 3 + 1] = y + (y / len) * dist;
      controlPoint[idx * 3 + 2] = z + (z / len) * dist;

      // HDR white for bloom
      col[idx * 3] = 2.0;
      col[idx * 3 + 1] = 1.9;
      col[idx * 3 + 2] = 2.0;

      random[idx] = Math.random();
      idx++;
    }

    // Crown arches
    const baseArchParticleCount = 100;
    const archParticleCount = Math.max(10, Math.floor(baseArchParticleCount * (count / baseCrownCount)));
    for (let arch = 0; arch < 8; arch++) {
      const baseAngle = (arch / 8) * Math.PI * 2;
      for (let i = 0; i < archParticleCount; i++) {
        if (idx >= count) break;
        const t = i / archParticleCount;
        const archHeight = Math.sin(t * Math.PI) * 0.9;
        const archRadius = 0.5 * (1 - t * 0.3);

        const x = Math.cos(baseAngle) * archRadius;
        const z = Math.sin(baseAngle) * archRadius;
        const y = crownY + 0.3 + archHeight;

        posStart[idx * 3] = x;
        posStart[idx * 3 + 1] = y;
        posStart[idx * 3 + 2] = z;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        posEnd[idx * 3] = gx;
        posEnd[idx * 3 + 1] = gy;
        posEnd[idx * 3 + 2] = gz;

        // Control Point
        const len = Math.sqrt(x * x + y * y + z * z) || 1;
        const cpDist = getControlPointDistance(config.explosionRadius);
        const dist = cpDist.base + Math.random() * cpDist.randomFactor;
        controlPoint[idx * 3] = x + (x / len) * dist;
        controlPoint[idx * 3 + 1] = y + (y / len) * dist;
        controlPoint[idx * 3 + 2] = z + (z / len) * dist;

        // Intense HDR glow
        const intensity = 2.0 + Math.sin(t * Math.PI) * 1.0;
        col[idx * 3] = intensity;
        col[idx * 3 + 1] = intensity * 0.95;
        col[idx * 3 + 2] = intensity;

        random[idx] = Math.random();
        idx++;
      }
    }

    // Central crystal orb
    for (let i = idx; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * 0.4;

      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = crownY + 1.3 + Math.cos(phi) * r;
      const z = Math.sin(phi) * Math.sin(theta) * r;

      posStart[i * 3] = x;
      posStart[i * 3 + 1] = y;
      posStart[i * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      posEnd[i * 3] = gx;
      posEnd[i * 3 + 1] = gy;
      posEnd[i * 3 + 2] = gz;

      // Control Point
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const cpDist = getControlPointDistance(config.explosionRadius);
      const dist = cpDist.base + Math.random() * cpDist.randomFactor;
      controlPoint[i * 3] = x + (x / len) * dist;
      controlPoint[i * 3 + 1] = y + (y / len) * dist;
      controlPoint[i * 3 + 2] = z + (z / len) * dist;

      // Maximum HDR for crown jewel
      col[i * 3] = 3.5;
      col[i * 3 + 1] = 3.3;
      col[i * 3 + 2] = 3.5;

      random[i] = Math.random();
    }

    return { posStart, posEnd, controlPoint, colors: col, random, count };
  }, [config.particleCount, config.explosionRadius]);



  // === GIFT BOXES ===
  const giftData = useMemo(() => {
    // Use centralized allocation configuration
    const count = Math.floor(config.particleCount * PARTICLE_ALLOCATION.decorations.gifts);

    const posStart = new Float32Array(count * 3);
    const posEnd = new Float32Array(count * 3);
    const controlPoint = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const random = new Float32Array(count);

    const gifts = [
      { r: 2.0, ang: 0, w: 2.2, h: 2.0, c: themeColors.base, rib: DEFAULT_COLORS.white },
      { r: 2.3, ang: 1.2, w: 1.8, h: 1.6, c: DEFAULT_COLORS.silver, rib: themeColors.dark },
      { r: 2.1, ang: 2.5, w: 2.5, h: 1.8, c: themeColors.dark, rib: DEFAULT_COLORS.gold },
      { r: 2.4, ang: 3.8, w: 1.6, h: 2.2, c: DEFAULT_COLORS.white, rib: DEFAULT_COLORS.ukRed },
      { r: 2.2, ang: 5.0, w: 2.0, h: 1.5, c: DEFAULT_COLORS.cream, rib: DEFAULT_COLORS.silver },
      { r: 3.2, ang: 0.6, w: 1.4, h: 1.2, c: themeColors.light, rib: DEFAULT_COLORS.silver },
      { r: 3.5, ang: 2.0, w: 1.6, h: 1.4, c: DEFAULT_COLORS.white, rib: themeColors.base },
      { r: 3.3, ang: 3.5, w: 1.3, h: 1.1, c: DEFAULT_COLORS.silver, rib: DEFAULT_COLORS.gold },
      { r: 3.6, ang: 4.8, w: 1.5, h: 1.3, c: themeColors.dark, rib: DEFAULT_COLORS.white },
      { r: 3.8, ang: 5.8, w: 1.2, h: 1.0, c: DEFAULT_COLORS.ukBlue, rib: DEFAULT_COLORS.white },
    ];

    const perGift = Math.floor(count / gifts.length);
    let idx = 0;

    gifts.forEach((gift) => {
      const cx = Math.cos(gift.ang) * gift.r;
      const cz = Math.sin(gift.ang) * gift.r;
      const cy = -6.5 + gift.h / 2;
      const rot = Math.random() * Math.PI;

      for (let i = 0; i < perGift; i++) {
        if (idx >= count) break;

        let ux = Math.random() - 0.5;
        let uy = Math.random() - 0.5;
        let uz = Math.random() - 0.5;

        // Bias to surface for box appearance
        if (Math.random() > 0.2) {
          const axis = Math.floor(Math.random() * 3);
          if (axis === 0) ux = ux > 0 ? 0.5 : -0.5;
          if (axis === 1) uy = uy > 0 ? 0.5 : -0.5;
          if (axis === 2) uz = uz > 0 ? 0.5 : -0.5;
        }

        let px = ux * gift.w;
        let py = uy * gift.h;
        let pz = uz * gift.w;

        // Rotate
        const rpx = px * Math.cos(rot) - pz * Math.sin(rot);
        const rpz = px * Math.sin(rot) + pz * Math.cos(rot);

        const fx = rpx + cx;
        const fy = py + cy;
        const fz = rpz + cz;

        posStart[idx * 3] = fx;
        posStart[idx * 3 + 1] = fy;
        posStart[idx * 3 + 2] = fz;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        posEnd[idx * 3] = gx;
        posEnd[idx * 3 + 1] = gy;
        posEnd[idx * 3 + 2] = gz;

        // Control Point
        const len = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
        const cpDist = getControlPointDistance(config.explosionRadius);
        const dist = cpDist.base + Math.random() * cpDist.randomFactor;
        controlPoint[idx * 3] = fx + (fx / len) * dist;
        controlPoint[idx * 3 + 1] = fy + (fy / len) * dist;
        controlPoint[idx * 3 + 2] = fz + (fz / len) * dist;

        // Ribbon pattern
        const isRibbon = Math.abs(ux) < 0.12 || Math.abs(uz) < 0.12;
        const c = isRibbon ? gift.rib : gift.c;

        col[idx * 3] = c.r;
        col[idx * 3 + 1] = c.g;
        col[idx * 3 + 2] = c.b;

        random[idx] = Math.random();
        idx++;
      }
    });

    return { posStart, posEnd, controlPoint, colors: col, random, count: idx };
  }, [config.particleCount, config.explosionRadius, themeColors]);

  // === ANIMATION FRAME ===
  const { camera } = useThree();

  // Refs for materials to update uniforms
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  // Performance monitoring refs
  const wasExplodedRef = useRef(isExploded);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  // Get FPS update function from store
  const setFps = useStore((state) => state.setFps);

  // Cache for uColor to avoid unnecessary updates
  const lastColorRef = useRef<string>('');

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Reset FPS when explosion state changes from true to false
    if (wasExplodedRef.current && !isExploded) {
      setFps(null);
      wasExplodedRef.current = false;
      frameCountRef.current = 0;
      lastFpsTimeRef.current = performance.now();
    } else if (!wasExplodedRef.current && isExploded) {
      wasExplodedRef.current = true;
      frameCountRef.current = 0;
      lastFpsTimeRef.current = performance.now();
    }

    // Performance monitoring: update FPS in store once per second during explosion
    // This allows F4 debug panel to display FPS without console output
    if (isExploded) {
      frameCountRef.current++;
      const now = performance.now();
      const deltaTime = now - lastFpsTimeRef.current;

      // Update FPS every second (1000ms)
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        setFps(fps);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
    }

    // Update LOD based on camera distance
    const cameraDistance = camera.position.length();
    lodRef.current = getLODLevel(cameraDistance);

    // Update uniforms
    const targetProgress = isExploded ? 1.0 : 0.0;

    // Check if color has changed to avoid unnecessary uniform updates
    const colorChanged = lastColorRef.current !== config.treeColor;
    if (colorChanged) {
      lastColorRef.current = config.treeColor;
    }

    // Smoothly interpolate uProgress
    // We can use a shared value or update each material
    // Using a simple lerp for now, but could be per-material if needed

    materialsRef.current.forEach(mat => {
      if (mat) {
        mat.uniforms.uTime.value = time;
        // Lerp uProgress
        mat.uniforms.uProgress.value = THREE.MathUtils.lerp(
          mat.uniforms.uProgress.value,
          targetProgress,
          isExploded ? 0.02 : 0.04
        );
        // Only update uColor when it changes
        if (colorChanged) {
          mat.uniforms.uColor.value.set(config.treeColor);
        }
      }
    });

    // Rotation
    const group = entityLayerRef.current?.parent;
    if (group) {
      const rotSpeed = isExploded ? 0.0005 : config.rotationSpeed * 0.001;
      group.rotation.y += rotSpeed;
    }
  });

  const treeKey = `tree-${config.particleCount}-${config.treeColor}`;

  return (
    <group onClick={(e) => { e.stopPropagation(); onParticlesClick(); }}>
      {/* === ENTITY LAYER (Normal Blending) === */}
      <points key={`entity-${treeKey}`} ref={entityLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={entityLayerData.count} array={entityLayerData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionStart" count={entityLayerData.count} array={entityLayerData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionEnd" count={entityLayerData.count} array={entityLayerData.posEnd} itemSize={3} />
          <bufferAttribute attach="attributes-aControlPoint" count={entityLayerData.count} array={entityLayerData.controlPoint} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={entityLayerData.count} array={entityLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={entityLayerData.count} array={entityLayerData.random} itemSize={1} />
        </bufferGeometry>
        <explosionMaterial
          ref={(el: THREE.ShaderMaterial) => (materialsRef.current[0] = el)}
          transparent
          depthWrite={true}
          blending={THREE.NormalBlending}
        />
      </points>

      {/* === GLOW LAYER (Additive Blending) === */}
      <points key={`glow-${treeKey}`} ref={glowLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={glowLayerData.count} array={glowLayerData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionStart" count={glowLayerData.count} array={glowLayerData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionEnd" count={glowLayerData.count} array={glowLayerData.posEnd} itemSize={3} />
          <bufferAttribute attach="attributes-aControlPoint" count={glowLayerData.count} array={glowLayerData.controlPoint} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={glowLayerData.count} array={glowLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={glowLayerData.count} array={glowLayerData.random} itemSize={1} />
        </bufferGeometry>
        <explosionMaterial
          ref={(el: THREE.ShaderMaterial) => (materialsRef.current[1] = el)}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Ornaments and pearls */}
      <points key={`ornaments-${treeKey}`} ref={ornamentsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={ornamentData.count} array={ornamentData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionStart" count={ornamentData.count} array={ornamentData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionEnd" count={ornamentData.count} array={ornamentData.posEnd} itemSize={3} />
          <bufferAttribute attach="attributes-aControlPoint" count={ornamentData.count} array={ornamentData.controlPoint} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={ornamentData.count} array={ornamentData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={ornamentData.count} array={ornamentData.random} itemSize={1} />
        </bufferGeometry>
        <explosionMaterial
          ref={(el: THREE.ShaderMaterial) => (materialsRef.current[2] = el)}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Crown topper */}
      <points key={`crown-${treeKey}`} ref={crownRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={crownData.count} array={crownData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionStart" count={crownData.count} array={crownData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionEnd" count={crownData.count} array={crownData.posEnd} itemSize={3} />
          <bufferAttribute attach="attributes-aControlPoint" count={crownData.count} array={crownData.controlPoint} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={crownData.count} array={crownData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={crownData.count} array={crownData.random} itemSize={1} />
        </bufferGeometry>
        <explosionMaterial
          ref={(el: THREE.ShaderMaterial) => (materialsRef.current[3] = el)}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Gift boxes */}
      <points key={`gifts-${treeKey}`} ref={giftsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={giftData.count} array={giftData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionStart" count={giftData.count} array={giftData.posStart} itemSize={3} />
          <bufferAttribute attach="attributes-aPositionEnd" count={giftData.count} array={giftData.posEnd} itemSize={3} />
          <bufferAttribute attach="attributes-aControlPoint" count={giftData.count} array={giftData.controlPoint} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={giftData.count} array={giftData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aRandom" count={giftData.count} array={giftData.random} itemSize={1} />
        </bufferGeometry>
        <explosionMaterial
          ref={(el: THREE.ShaderMaterial) => (materialsRef.current[4] = el)}
          transparent
          depthWrite={true}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  );
};
