import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AppConfig } from '../../types.ts';
import { useStore } from '../../store/useStore';
import { STATIC_COLORS, DEFAULT_TREE_COLOR } from '../../config/colors';

// Shader imports using raw-loader syntax for Vite
import particleVertexShader from '../../shaders/particle.vert?raw';
import particleFragmentShader from '../../shaders/particle.frag?raw';

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
  ctx.stroke();

  // Diagonal flares
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(52, 52);
  ctx.moveTo(52, 12);
  ctx.lineTo(12, 52);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// === ORNAMENT DISTRIBUTION ALGORITHM ===
type OrnamentType = 'BIG_BEN' | 'FLAG' | 'BUS' | 'CORGI' | 'GIFT' | 'PEARL' | 'BAUBLE';

const assignOrnamentType = (heightRatio: number): OrnamentType => {
  const rand = Math.random();
  if (heightRatio > 0.8) {
    // Top 20%: Big Ben
    return 'BIG_BEN';
  } else if (heightRatio > 0.5) {
    // Middle 30%: Flag or Bus
    return rand < 0.4 ? 'FLAG' : 'BUS';
  } else {
    // Bottom 50%: Corgi or Gift
    return rand < 0.3 ? 'CORGI' : 'GIFT';
  }
};

/**
 * Calculate explosion target position in 3D space
 * Creates a spherical distribution for the photo cloud
 */
const getExplosionTarget = (explosionRadius: number): [number, number, number] => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = Math.random() * explosionRadius + 15;
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
};

/**
 * Calculate Bezier control point for explosion arc
 * Control Point = Start + Explosion Vector (radial outward * force)
 */
const calculateControlPoint = (
  start: [number, number, number],
  end: [number, number, number],
  explosionForce: number = 8.0
): [number, number, number] => {
  // Direction from origin for radial explosion
  const radialDir = [start[0], start[1], start[2]];
  const radialLen = Math.sqrt(radialDir[0] ** 2 + radialDir[1] ** 2 + radialDir[2] ** 2);

  if (radialLen > 0.001) {
    radialDir[0] /= radialLen;
    radialDir[1] /= radialLen;
    radialDir[2] /= radialLen;
  } else {
    // Fallback to upward direction
    radialDir[0] = 0;
    radialDir[1] = 1;
    radialDir[2] = 0;
  }

  // Add some randomization to the explosion direction
  const randomOffset = [
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
  ];

  // Control point is start + explosion vector
  return [
    start[0] + (radialDir[0] + randomOffset[0] * 0.3) * explosionForce,
    start[1] + (radialDir[1] + randomOffset[1] * 0.3) * explosionForce + 2, // Slight upward bias
    start[2] + (radialDir[2] + randomOffset[2] * 0.3) * explosionForce,
  ];
};

// Size coefficients per ornament type
const SIZE_COEFFICIENTS: Record<OrnamentType, number> = {
  BUS: 1.2,
  FLAG: 1.0,
  CORGI: 0.9,
  BIG_BEN: 1.1,
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

// === CUSTOM SHADER MATERIAL ===
/**
 * Creates a custom ShaderMaterial for GPU-driven particle animation
 * Implements the GPU State Machine pattern from architecture.md
 */
const createParticleShaderMaterial = (
  treeColor: THREE.Color,
  texture: THREE.Texture | null,
  baseSize: number = 0.55
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uTreeColor: { value: treeColor },
      uMap: { value: texture },
      uBaseSize: { value: baseSize },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true,
  });
};


// === MAIN COMPONENT ===
export const TreeParticles: React.FC<TreeParticlesProps> = ({
  isExploded,
  config,
  onParticlesClick,
}) => {
  // Global State
  const treeColor = useStore((state) => state.treeColor);
  const particleCount = useStore((state) => state.particleCount);

  // Refs for each layer
  const entityLayerRef = useRef<THREE.Points>(null);
  const glowLayerRef = useRef<THREE.Points>(null);
  const ornamentsRef = useRef<THREE.Points>(null);
  const giftsRef = useRef<THREE.Points>(null);

  // Shader material refs
  const entityMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const glowMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const ornamentMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const giftMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Animation state
  const progressRef = useRef(0.0);
  const targetProgressRef = useRef(0.0);

  // LOD state
  const lodRef = useRef<LODLevel>(LOD_LEVELS[0]);

  // Textures
  const featherTexture = useMemo(() => createFeatherTexture(), []);
  const sparkleTexture = useMemo(() => createSparkleTexture(), []);

  // === DYNAMIC COLOR VARIANTS ===
  // Generates color variants (base, light, deep, dark) from the selected tree color
  // This is a color selection feature.
  const colorVariants = useMemo(() => {
    const base = new THREE.Color(treeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);

    return {
      base: base,
      light: new THREE.Color().setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l + 0.2, 0.95)),
      deep: new THREE.Color().setHSL(hsl.h, hsl.s * 1.2, Math.max(hsl.l - 0.15, 0.2)),
      dark: new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l - 0.3, 0.1)),
    };
  }, [treeColor]);

  // === ENTITY LAYER (70% - Normal Blending) ===
  const entityLayerData = useMemo(() => {
    // Remove the hardcoded minimum of 20000 to allow lower particle counts
    const totalParticles = Math.max(particleCount * 1.5, 1000);
    const count = Math.floor(totalParticles * 0.7); // 70% for entity layer

    // Standard position (used for initial render)
    const pos = new Float32Array(count * 3);
    // Start positions for Bezier (tree shape)
    const positionStart = new Float32Array(count * 3);
    // End positions for Bezier (exploded)
    const positionEnd = new Float32Array(count * 3);
    // Control points for Bezier curve
    const controlPoints = new Float32Array(count * 3);
    // Particle colors
    const col = new Float32Array(count * 3);
    // Particle scales
    const siz = new Float32Array(count);
    // Random seeds
    const random = new Float32Array(count);
    // Branch angles
    const branchAngles = new Float32Array(count);

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

      // Store start position (tree shape)
      const startPos: [number, number, number] = [x, finalY, z];
      positionStart[i * 3] = x;
      positionStart[i * 3 + 1] = finalY;
      positionStart[i * 3 + 2] = z;

      // Initial position is the same as start
      pos[i * 3] = x;
      pos[i * 3 + 1] = finalY;
      pos[i * 3 + 2] = z;

      // Calculate end position (exploded)
      const endPos = getExplosionTarget(config.explosionRadius);
      positionEnd[i * 3] = endPos[0];
      positionEnd[i * 3 + 1] = endPos[1];
      positionEnd[i * 3 + 2] = endPos[2];

      // Calculate control point for Bezier curve
      const ctrlPt = calculateControlPoint(startPos, endPos);
      controlPoints[i * 3] = ctrlPt[0];
      controlPoints[i * 3 + 1] = ctrlPt[1];
      controlPoints[i * 3 + 2] = ctrlPt[2];

      // Store random and branch angle
      random[i] = Math.random();
      branchAngles[i] = branchAngle;

      // Color based on position
      const isTip = distFromTrunk > 0.75;
      const isInner = distFromTrunk < 0.25;
      const heightFactor = t;

      let c: THREE.Color;
      if (isTip) {
        c = Math.random() > 0.4 ? STATIC_COLORS.cream : colorVariants.light;
      } else if (isInner) {
        c = colorVariants.deep;
      } else {
        c = colorVariants.base.clone().lerp(colorVariants.light, heightFactor * 0.5);
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      // Size with tip enhancement
      siz[i] = 0.5 + Math.random() * 0.4 + (isTip ? 0.2 : 0);
    }

    return {
      positions: pos,
      positionStart,
      positionEnd,
      controlPoints,
      colors: col,
      sizes: siz,
      random,
      branchAngles,
      count
    };
  }, [particleCount, config.explosionRadius, colorVariants]);

  // === GLOW LAYER (30% - Additive Blending) ===
  const glowLayerData = useMemo(() => {
    const totalParticles = Math.max(particleCount * 1.5, 1000);
    const count = Math.floor(totalParticles * 0.3); // 30% for glow layer
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);
    const flickerPhase = new Float32Array(count); // For sparkle animation

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

      const startPos: [number, number, number] = [x, y, z];
      positionStart[i * 3] = x;
      positionStart[i * 3 + 1] = y;
      positionStart[i * 3 + 2] = z;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const endPos = getExplosionTarget(config.explosionRadius);
      positionEnd[i * 3] = endPos[0];
      positionEnd[i * 3 + 1] = endPos[1];
      positionEnd[i * 3 + 2] = endPos[2];

      const ctrlPt = calculateControlPoint(startPos, endPos);
      controlPoints[i * 3] = ctrlPt[0];
      controlPoints[i * 3 + 1] = ctrlPt[1];
      controlPoints[i * 3 + 2] = ctrlPt[2];

      random[i] = Math.random();
      branchAngles[i] = branchAngle;

      // Bright glow colors with HDR boost
      const colorChoice = Math.random();
      let c: THREE.Color;
      let intensity: number;

      if (colorChoice < 0.5) {
        c = STATIC_COLORS.white;
        intensity = 1.5 + Math.random() * 0.5;
      } else if (colorChoice < 0.75) {
        c = colorVariants.light;
        intensity = 1.3 + Math.random() * 0.4;
      } else {
        c = STATIC_COLORS.gold;
        intensity = 1.8 + Math.random() * 0.5;
      }

      col[i * 3] = c.r * intensity;
      col[i * 3 + 1] = c.g * intensity;
      col[i * 3 + 2] = c.b * intensity;

      siz[i] = 0.3 + Math.random() * 0.4;
      flickerPhase[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions: pos,
      positionStart,
      positionEnd,
      controlPoints,
      colors: col,
      sizes: siz,
      random,
      branchAngles,
      flickerPhase,
      count
    };
  }, [particleCount, config.explosionRadius, colorVariants]);

  // === ORNAMENTS - Special ornaments with distribution algorithm ===
  const ornamentData = useMemo(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);

    const treeHeight = 14;
    const treeBottom = -5.5;

    // Generate ornament clusters
    const clusters: Array<{
      y: number;
      angle: number;
      type: OrnamentType;
      baseSize: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
      const t = 0.05 + Math.random() * 0.9;
      const y = treeBottom + t * treeHeight;
      const heightRatio = t;
      const angle = Math.random() * Math.PI * 2;
      const type = assignOrnamentType(heightRatio);
      const baseSize = 0.3 + Math.random() * 0.2;

      clusters.push({ y, angle, type, baseSize });
    }

    let idx = 0;

    // Pearl strings spiraling around tree
    const pearlCount = 1400;
    for (let i = 0; i < pearlCount; i++) {
      if (idx >= count) break;
      const t = i / pearlCount;
      const y = 7.5 - t * 13;
      const theta = t * Math.PI * 16;
      const baseR = (1 - (y + 5.5) / treeHeight) * 5.2 + 0.3;

      const x = Math.cos(theta) * baseR;
      const z = Math.sin(theta) * baseR;

      const startPos: [number, number, number] = [x, y + Math.sin(theta * 3) * 0.1, z];
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y + Math.sin(theta * 3) * 0.1;
      pos[idx * 3 + 2] = z;

      positionStart[idx * 3] = x;
      positionStart[idx * 3 + 1] = y;
      positionStart[idx * 3 + 2] = z;

      const endPos = getExplosionTarget(config.explosionRadius);
      positionEnd[idx * 3] = endPos[0];
      positionEnd[idx * 3 + 1] = endPos[1];
      positionEnd[idx * 3 + 2] = endPos[2];

      const ctrlPt = calculateControlPoint(startPos, endPos);
      controlPoints[idx * 3] = ctrlPt[0];
      controlPoints[idx * 3 + 1] = ctrlPt[1];
      controlPoints[idx * 3 + 2] = ctrlPt[2];

      random[idx] = Math.random();
      branchAngles[idx] = theta;

      const c = i % 3 === 0 ? STATIC_COLORS.pearl : STATIC_COLORS.silver;
      col[idx * 3] = c.r * 1.5;
      col[idx * 3 + 1] = c.g * 1.5;
      col[idx * 3 + 2] = c.b * 1.5;
      siz[idx] = 0.4 * SIZE_COEFFICIENTS.PEARL + (i % 5 === 0 ? 0.3 : 0);
      idx++;
    }

    // Special ornament clusters
    clusters.forEach((cluster) => {
      const particlesPerCluster = 18;
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

        const startPos: [number, number, number] = [x, y, z];
        pos[idx * 3] = x;
        pos[idx * 3 + 1] = y;
        pos[idx * 3 + 2] = z;

        positionStart[idx * 3] = x;
        positionStart[idx * 3 + 1] = y;
        positionStart[idx * 3 + 2] = z;

        const endPos = getExplosionTarget(config.explosionRadius);
        positionEnd[idx * 3] = endPos[0];
        positionEnd[idx * 3 + 1] = endPos[1];
        positionEnd[idx * 3 + 2] = endPos[2];

        const ctrlPt = calculateControlPoint(startPos, endPos);
        controlPoints[idx * 3] = ctrlPt[0];
        controlPoints[idx * 3 + 1] = ctrlPt[1];
        controlPoints[idx * 3 + 2] = ctrlPt[2];

        random[idx] = Math.random();
        branchAngles[idx] = cluster.angle;

        // Color by ornament type
        let c: THREE.Color;
        switch (cluster.type) {
          case 'BUS':
            c = STATIC_COLORS.londonRed;
            break;
          case 'FLAG':
            c = p % 3 === 0 ? STATIC_COLORS.ukRed : p % 3 === 1 ? STATIC_COLORS.ukBlue : STATIC_COLORS.white;
            break;
          case 'CORGI':
            c = STATIC_COLORS.corgiTan;
            break;
          case 'BIG_BEN':
            c = STATIC_COLORS.silver;
            break;
          case 'GIFT':
            c = Math.random() > 0.5 ? colorVariants.base : STATIC_COLORS.white;
            break;
          default:
            c = STATIC_COLORS.silver;
        }

        col[idx * 3] = c.r;
        col[idx * 3 + 1] = c.g;
        col[idx * 3 + 2] = c.b;
        siz[idx] = 0.5 * sizeCoef;
        idx++;
      }
    });

    return {
      positions: pos,
      positionStart,
      positionEnd,
      controlPoints,
      colors: col,
      sizes: siz,
      random,
      branchAngles,
      count: idx
    };
  }, [config.explosionRadius, colorVariants]);


  // === GIFT BOXES ===
  const giftData = useMemo(() => {
    const count = 5500;
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);

    const gifts = [
      { r: 2.0, ang: 0, w: 2.2, h: 2.0, c: colorVariants.base, rib: STATIC_COLORS.white },
      { r: 2.3, ang: 1.2, w: 1.8, h: 1.6, c: STATIC_COLORS.silver, rib: colorVariants.dark },
      { r: 2.1, ang: 2.5, w: 2.5, h: 1.8, c: colorVariants.dark, rib: STATIC_COLORS.gold },
      { r: 2.4, ang: 3.8, w: 1.6, h: 2.2, c: STATIC_COLORS.white, rib: STATIC_COLORS.ukRed },
      { r: 2.2, ang: 5.0, w: 2.0, h: 1.5, c: STATIC_COLORS.cream, rib: STATIC_COLORS.silver },
      { r: 3.2, ang: 0.6, w: 1.4, h: 1.2, c: colorVariants.light, rib: STATIC_COLORS.silver },
      { r: 3.5, ang: 2.0, w: 1.6, h: 1.4, c: STATIC_COLORS.white, rib: colorVariants.base },
      { r: 3.3, ang: 3.5, w: 1.3, h: 1.1, c: STATIC_COLORS.silver, rib: STATIC_COLORS.gold },
      { r: 3.6, ang: 4.8, w: 1.5, h: 1.3, c: colorVariants.dark, rib: STATIC_COLORS.white },
      { r: 3.8, ang: 5.8, w: 1.2, h: 1.0, c: STATIC_COLORS.ukBlue, rib: STATIC_COLORS.white },
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

        const startPos: [number, number, number] = [fx, fy, fz];
        pos[idx * 3] = fx;
        pos[idx * 3 + 1] = fy;
        pos[idx * 3 + 2] = fz;

        positionStart[idx * 3] = fx;
        positionStart[idx * 3 + 1] = fy;
        positionStart[idx * 3 + 2] = fz;

        const endPos = getExplosionTarget(config.explosionRadius);
        positionEnd[idx * 3] = endPos[0];
        positionEnd[idx * 3 + 1] = endPos[1];
        positionEnd[idx * 3 + 2] = endPos[2];

        const ctrlPt = calculateControlPoint(startPos, endPos);
        controlPoints[idx * 3] = ctrlPt[0];
        controlPoints[idx * 3 + 1] = ctrlPt[1];
        controlPoints[idx * 3 + 2] = ctrlPt[2];

        random[idx] = Math.random();
        branchAngles[idx] = gift.ang;

        // Ribbon pattern
        const isRibbon = Math.abs(ux) < 0.12 || Math.abs(uz) < 0.12;
        const c = isRibbon ? gift.rib : gift.c;

        col[idx * 3] = c.r;
        col[idx * 3 + 1] = c.g;
        col[idx * 3 + 2] = c.b;
        siz[idx] = 0.5;
        idx++;
      }
    });

    return {
      positions: pos,
      positionStart,
      positionEnd,
      controlPoints,
      colors: col,
      sizes: siz,
      random,
      branchAngles,
      count: idx
    };
  }, [config.explosionRadius, colorVariants]);

  // === SHADER MATERIAL CREATION ===
  useEffect(() => {
    const treeColorThree = new THREE.Color(treeColor);

    // Create materials with proper base sizes matching original PointsMaterial
    // Entity layer: size 0.55, normal blending
    entityMaterialRef.current = createParticleShaderMaterial(treeColorThree, featherTexture, 0.55);
    entityMaterialRef.current.depthWrite = true;

    // Glow layer: size 0.45, additive blending
    glowMaterialRef.current = createParticleShaderMaterial(treeColorThree, sparkleTexture, 0.45);
    glowMaterialRef.current.blending = THREE.AdditiveBlending;

    // Ornaments: size 0.5, additive blending
    ornamentMaterialRef.current = createParticleShaderMaterial(treeColorThree, sparkleTexture, 0.5);
    ornamentMaterialRef.current.blending = THREE.AdditiveBlending;

    // Gifts: size 0.5, normal blending
    giftMaterialRef.current = createParticleShaderMaterial(treeColorThree, featherTexture, 0.5);
    giftMaterialRef.current.depthWrite = true;

    // Cleanup
    return () => {
      entityMaterialRef.current?.dispose();
      glowMaterialRef.current?.dispose();
      ornamentMaterialRef.current?.dispose();
      giftMaterialRef.current?.dispose();
    };
  }, [treeColor, featherTexture, sparkleTexture]);

  // === UPDATE TARGET PROGRESS ===
  useEffect(() => {
    targetProgressRef.current = isExploded ? 1.0 : 0.0;
  }, [isExploded]);

  // === ANIMATION FRAME ===
  const { camera } = useThree();

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const delta = state.clock.getDelta();

    // Update LOD based on camera distance
    const cameraDistance = camera.position.length();
    lodRef.current = getLODLevel(cameraDistance);

    // === GPU STATE MACHINE: Interpolate uProgress uniform ===
    // Damping factor for smooth transition (satisfies AC#6: "Midnight Magic" aesthetic)
    const dampingSpeed = isExploded ? 0.02 : 0.04; // Slower for explosion, faster for reset
    const diff = targetProgressRef.current - progressRef.current;
    progressRef.current += diff * dampingSpeed;

    // Update all shader materials with new uniform values
    const materials = [
      entityMaterialRef.current,
      glowMaterialRef.current,
      ornamentMaterialRef.current,
      giftMaterialRef.current,
    ];

    materials.forEach((mat) => {
      if (mat) {
        mat.uniforms.uProgress.value = progressRef.current;
        mat.uniforms.uTime.value = time;
      }
    });

    // Rotation animation for visual appeal
    const layers = [entityLayerRef, glowLayerRef, ornamentsRef, giftsRef];
    const rotSpeed = isExploded ? 0.0005 : config.rotationSpeed * 0.001;

    layers.forEach((ref) => {
      if (ref.current) {
        ref.current.rotation.y += rotSpeed;
      }
    });
  });

  const treeKey = `tree-${particleCount}-${treeColor}`;

  return (
    <group onClick={(e) => { e.stopPropagation(); onParticlesClick(); }}>
      {/* === ENTITY LAYER (Normal Blending + Depth Write) === */}
      <points key={`entity-${treeKey}`} ref={entityLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={entityLayerData.count} array={entityLayerData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-positionStart" count={entityLayerData.count} array={entityLayerData.positionStart} itemSize={3} />
          <bufferAttribute attach="attributes-positionEnd" count={entityLayerData.count} array={entityLayerData.positionEnd} itemSize={3} />
          <bufferAttribute attach="attributes-controlPoint" count={entityLayerData.count} array={entityLayerData.controlPoints} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={entityLayerData.count} array={entityLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={entityLayerData.count} array={entityLayerData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aRandom" count={entityLayerData.count} array={entityLayerData.random} itemSize={1} />
          <bufferAttribute attach="attributes-aBranchAngle" count={entityLayerData.count} array={entityLayerData.branchAngles} itemSize={1} />
        </bufferGeometry>
        {entityMaterialRef.current && <primitive object={entityMaterialRef.current} attach="material" />}
      </points>

      {/* === GLOW LAYER (Additive Blending) === */}
      <points key={`glow-${treeKey}`} ref={glowLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={glowLayerData.count} array={glowLayerData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-positionStart" count={glowLayerData.count} array={glowLayerData.positionStart} itemSize={3} />
          <bufferAttribute attach="attributes-positionEnd" count={glowLayerData.count} array={glowLayerData.positionEnd} itemSize={3} />
          <bufferAttribute attach="attributes-controlPoint" count={glowLayerData.count} array={glowLayerData.controlPoints} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={glowLayerData.count} array={glowLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={glowLayerData.count} array={glowLayerData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aRandom" count={glowLayerData.count} array={glowLayerData.random} itemSize={1} />
          <bufferAttribute attach="attributes-aBranchAngle" count={glowLayerData.count} array={glowLayerData.branchAngles} itemSize={1} />
        </bufferGeometry>
        {glowMaterialRef.current && <primitive object={glowMaterialRef.current} attach="material" />}
      </points>

      {/* Ornaments and pearls */}
      <points ref={ornamentsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={ornamentData.count} array={ornamentData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-positionStart" count={ornamentData.count} array={ornamentData.positionStart} itemSize={3} />
          <bufferAttribute attach="attributes-positionEnd" count={ornamentData.count} array={ornamentData.positionEnd} itemSize={3} />
          <bufferAttribute attach="attributes-controlPoint" count={ornamentData.count} array={ornamentData.controlPoints} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={ornamentData.count} array={ornamentData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={ornamentData.count} array={ornamentData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aRandom" count={ornamentData.count} array={ornamentData.random} itemSize={1} />
          <bufferAttribute attach="attributes-aBranchAngle" count={ornamentData.count} array={ornamentData.branchAngles} itemSize={1} />
        </bufferGeometry>
        {ornamentMaterialRef.current && <primitive object={ornamentMaterialRef.current} attach="material" />}
      </points>

      {/* Gift boxes */}
      <points ref={giftsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={giftData.count} array={giftData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-positionStart" count={giftData.count} array={giftData.positionStart} itemSize={3} />
          <bufferAttribute attach="attributes-positionEnd" count={giftData.count} array={giftData.positionEnd} itemSize={3} />
          <bufferAttribute attach="attributes-controlPoint" count={giftData.count} array={giftData.controlPoints} itemSize={3} />
          <bufferAttribute attach="attributes-aColor" count={giftData.count} array={giftData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={giftData.count} array={giftData.sizes} itemSize={1} />
          <bufferAttribute attach="attributes-aRandom" count={giftData.count} array={giftData.random} itemSize={1} />
          <bufferAttribute attach="attributes-aBranchAngle" count={giftData.count} array={giftData.branchAngles} itemSize={1} />
        </bufferGeometry>
        {giftMaterialRef.current && <primitive object={giftMaterialRef.current} attach="material" />}
      </points>
    </group>
  );
};
