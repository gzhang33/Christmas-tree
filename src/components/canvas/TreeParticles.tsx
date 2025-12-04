import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AppConfig } from '../../types.ts';
import { useStore } from '../../store/useStore';
import { STATIC_COLORS } from '../../config/colors';

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
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const tTree = new Float32Array(count * 3);
    const tGalaxy = new Float32Array(count * 3);

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

      pos[i * 3] = x;
      pos[i * 3 + 1] = finalY;
      pos[i * 3 + 2] = z;

      tTree[i * 3] = x;
      tTree[i * 3 + 1] = finalY;
      tTree[i * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      tGalaxy[i * 3] = gx;
      tGalaxy[i * 3 + 1] = gy;
      tGalaxy[i * 3 + 2] = gz;

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

    return { positions: pos, colors: col, sizes: siz, targetTree: tTree, targetGalaxy: tGalaxy, count };
  }, [particleCount, config.explosionRadius, colorVariants]);

  // === GLOW LAYER (30% - Additive Blending) ===
  const glowLayerData = useMemo(() => {
    const totalParticles = Math.max(particleCount * 1.5, 1000);
    const count = Math.floor(totalParticles * 0.3); // 30% for glow layer
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const tTree = new Float32Array(count * 3);
    const tGalaxy = new Float32Array(count * 3);
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

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      tTree[i * 3] = x;
      tTree[i * 3 + 1] = y;
      tTree[i * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      tGalaxy[i * 3] = gx;
      tGalaxy[i * 3 + 1] = gy;
      tGalaxy[i * 3 + 2] = gz;

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

    return { positions: pos, colors: col, sizes: siz, targetTree: tTree, targetGalaxy: tGalaxy, flickerPhase, count };
  }, [particleCount, config.explosionRadius, colorVariants]);

  // === ORNAMENTS - Special ornaments with distribution algorithm ===
  const ornamentData = useMemo(() => {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const tTree = new Float32Array(count * 3);
    const tGalaxy = new Float32Array(count * 3);

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

      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y + Math.sin(theta * 3) * 0.1;
      pos[idx * 3 + 2] = z;

      tTree[idx * 3] = x;
      tTree[idx * 3 + 1] = y;
      tTree[idx * 3 + 2] = z;

      const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
      tGalaxy[idx * 3] = gx;
      tGalaxy[idx * 3 + 1] = gy;
      tGalaxy[idx * 3 + 2] = gz;

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

        pos[idx * 3] = cx + ox;
        pos[idx * 3 + 1] = cluster.y + oy;
        pos[idx * 3 + 2] = cz + oz;

        tTree[idx * 3] = cx + ox;
        tTree[idx * 3 + 1] = cluster.y + oy;
        tTree[idx * 3 + 2] = cz + oz;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        tGalaxy[idx * 3] = gx;
        tGalaxy[idx * 3 + 1] = gy;
        tGalaxy[idx * 3 + 2] = gz;

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

    return { positions: pos, colors: col, sizes: siz, targetTree: tTree, targetGalaxy: tGalaxy, count: idx };
  }, [config.explosionRadius, colorVariants]);


  // === GIFT BOXES ===
  const giftData = useMemo(() => {
    const count = 5500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const tTree = new Float32Array(count * 3);
    const tGalaxy = new Float32Array(count * 3);

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

        pos[idx * 3] = fx;
        pos[idx * 3 + 1] = fy;
        pos[idx * 3 + 2] = fz;
        tTree[idx * 3] = fx;
        tTree[idx * 3 + 1] = fy;
        tTree[idx * 3 + 2] = fz;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        tGalaxy[idx * 3] = gx;
        tGalaxy[idx * 3 + 1] = gy;
        tGalaxy[idx * 3 + 2] = gz;

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

    return { positions: pos, colors: col, sizes: siz, targetTree: tTree, targetGalaxy: tGalaxy, count: idx };
  }, [config.explosionRadius, colorVariants]);

  // === ANIMATION FRAME ===
  const { camera } = useThree();

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update LOD based on camera distance
    const cameraDistance = camera.position.length();
    lodRef.current = getLODLevel(cameraDistance);

    // Animation data for all layers
    const layers = [
      { ref: entityLayerRef, tTree: entityLayerData.targetTree, tGalaxy: entityLayerData.targetGalaxy },
      { ref: glowLayerRef, tTree: glowLayerData.targetTree, tGalaxy: glowLayerData.targetGalaxy, flickerPhase: glowLayerData.flickerPhase },
      { ref: ornamentsRef, tTree: ornamentData.targetTree, tGalaxy: ornamentData.targetGalaxy },
      { ref: giftsRef, tTree: giftData.targetTree, tGalaxy: giftData.targetGalaxy },
    ];

    const lerpSpeed = isExploded ? 0.02 : 0.04;

    layers.forEach(({ ref, tTree, tGalaxy, flickerPhase }) => {
      if (!ref.current) return;

      const currentPos = ref.current.geometry.attributes.position.array as Float32Array;
      const target = isExploded ? tGalaxy : tTree;
      const len = Math.min(currentPos.length, target.length);

      // Position interpolation
      for (let i = 0; i < len; i++) {
        currentPos[i] += (target[i] - currentPos[i]) * lerpSpeed;
      }
      ref.current.geometry.attributes.position.needsUpdate = true;

      // Sparkle animation for glow layer
      if (flickerPhase && ref.current.geometry.attributes.color && !isExploded) {
        const colors = ref.current.geometry.attributes.color.array as Float32Array;
        const baseCols = glowLayerData.colors;

        for (let i = 0; i < flickerPhase.length; i++) {
          // Flicker frequency: 2-5Hz
          const freq = 2 + (flickerPhase[i] % 1) * 3;
          const flicker = 0.7 + Math.sin(time * freq * Math.PI * 2 + flickerPhase[i]) * 0.3;

          colors[i * 3] = baseCols[i * 3] * flicker;
          colors[i * 3 + 1] = baseCols[i * 3 + 1] * flicker;
          colors[i * 3 + 2] = baseCols[i * 3 + 2] * flicker;
        }
        ref.current.geometry.attributes.color.needsUpdate = true;
      }

      // Rotation
      const rotSpeed = isExploded ? 0.0005 : config.rotationSpeed * 0.001;
      ref.current.rotation.y += rotSpeed;
    });
  });

  const treeKey = `tree-${particleCount}-${treeColor}`;

  return (
    <group onClick={(e) => { e.stopPropagation(); onParticlesClick(); }}>
      {/* === ENTITY LAYER (Normal Blending + Depth Write) === */}
      <points key={`entity-${treeKey}`} ref={entityLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={entityLayerData.count} array={entityLayerData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={entityLayerData.count} array={entityLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={entityLayerData.count} array={entityLayerData.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={featherTexture}
          alphaMap={featherTexture}
          transparent
          opacity={0.95}
          depthWrite={true}
          size={0.55}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>

      {/* === GLOW LAYER (Additive Blending) === */}
      <points key={`glow-${treeKey}`} ref={glowLayerRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={glowLayerData.count} array={glowLayerData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={glowLayerData.count} array={glowLayerData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={glowLayerData.count} array={glowLayerData.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={sparkleTexture}
          alphaMap={sparkleTexture}
          transparent
          opacity={0.9}
          depthWrite={false}
          size={0.45}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Ornaments and pearls */}
      <points ref={ornamentsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={ornamentData.count} array={ornamentData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={ornamentData.count} array={ornamentData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={ornamentData.count} array={ornamentData.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={sparkleTexture}
          alphaMap={sparkleTexture}
          transparent
          opacity={1}
          depthWrite={false}
          size={0.5}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Gift boxes */}
      <points ref={giftsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={giftData.count} array={giftData.positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={giftData.count} array={giftData.colors} itemSize={3} />
          <bufferAttribute attach="attributes-size" count={giftData.count} array={giftData.sizes} itemSize={1} />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={featherTexture}
          alphaMap={featherTexture}
          transparent
          opacity={1}
          depthWrite={true}
          size={0.5}
          blending={THREE.NormalBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
