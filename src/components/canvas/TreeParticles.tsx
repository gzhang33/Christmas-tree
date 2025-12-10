import React, { useRef, useMemo, useEffect, useState, useCallback } from "react"; // Added useCallback

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AppConfig } from "../../types.ts";
import { useStore } from "../../store/useStore";
import { getOptimizedCloudinaryUrl } from "../../utils/cloudinaryUtils"; // NEW: Cloudinary Optimization
import { STATIC_COLORS, DEFAULT_TREE_COLOR } from "../../config/colors";
import { PARTICLE_CONFIG } from "../../config/particles";
import PhotoWorker from '../../workers/photoPositions.worker?worker'; // Import Worker
import {
  PHOTO_COUNT,
  generatePhotoPositions,
  PhotoPosition,
} from "../../config/photoConfig";
import { getTreeRadius } from "../../utils/treeUtils";

import particleVertexShader from "../../shaders/particle.vert?raw";
import particleFragmentShader from "../../shaders/particle.frag?raw";
import { PolaroidPhoto, masterPhotoMaterial } from "./PolaroidPhoto"; // NEW: Import masterPhotoMaterial for pool init
import { PhotoManager, PhotoAnimationData } from "./PhotoManager"; // NEW: Import PhotoManager
import { MEMORIES } from "../../config/assets";
import { preloadTextures } from "../../utils/texturePreloader";
import { distributePhotos } from "../../utils/photoDistribution";
import { PhotoData } from "../../types.ts";
import { initPhotoMaterialPool, disposePhotoMaterialPool } from "../../utils/materialPool"; // NEW: Material pool

interface TreeParticlesProps {
  isExploded: boolean;
  config: AppConfig;
  onParticlesClick: () => void;
  photos: PhotoData[];
}

// === TEXTURE FACTORY ===

// Feathery texture for entity layer (Normal blending)
const createFeatherTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Soft feathery gradient with depth
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.1, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.3, "rgba(255, 255, 255, 0.7)");
  grad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
  grad.addColorStop(0.7, "rgba(255, 255, 255, 0.15)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Dynamic sparkle texture for glow layer (Additive blending)
const createSparkleTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, 64, 64);

  // Core glow
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255, 255, 255, 1)");
  grad.addColorStop(0.1, "rgba(255, 255, 255, 0.95)");
  grad.addColorStop(0.25, "rgba(255, 255, 255, 0.6)");
  grad.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  // Cross flare for sparkle effect
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(32, 60);
  ctx.moveTo(4, 32);
  ctx.lineTo(60, 32);
  ctx.stroke();

  // Diagonal flares
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
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
type OrnamentType =
  | "BIG_BEN"
  | "FLAG"
  | "BUS"
  | "CORGI"
  | "GIFT"
  | "PEARL"
  | "BAUBLE";

const assignOrnamentType = (heightRatio: number): OrnamentType => {
  const rand = Math.random();
  if (heightRatio > 0.8) {
    // Top 20%: Big Ben
    return "BIG_BEN";
  } else if (heightRatio > 0.5) {
    // Middle 30%: Flag or Bus
    return rand < 0.4 ? "FLAG" : "BUS";
  } else {
    // Bottom 50%: Corgi or Gift
    return rand < 0.3 ? "CORGI" : "GIFT";
  }
};

/**
 * Calculate explosion target position in 3D space
 * Creates a spherical distribution for the photo cloud
 */
const getExplosionTarget = (
  explosionRadius: number,
): [number, number, number] => {
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
 * Calculate erosion factor for particle dissipation effect
 * Returns a normalized value [0,1] where:
 * - 0 = top of tree (erodes first)
 * - 1 = bottom of tree (erodes last)
 * 
 * @param yPosition - Y coordinate of the particle
 * @returns Clamped erosion factor [0,1]
 */
const calculateErosionFactor = (yPosition: number): number => {
  const treeTopY = PARTICLE_CONFIG.treeBottomY + PARTICLE_CONFIG.treeHeight;
  const erosionRange = PARTICLE_CONFIG.treeHeight + Math.abs(PARTICLE_CONFIG.treeBottomY);
  const factor = (treeTopY - yPosition) / erosionRange;
  return Math.max(0, Math.min(1, factor)); // Clamp to [0,1]
};

/**
 * Calculate Bezier control point for explosion arc
 * Control Point = Start + Explosion Vector (radial outward * force)
 */
const calculateControlPoint = (
  start: [number, number, number],
  end: [number, number, number],
  explosionForce: number = 8.0,
): [number, number, number] => {
  // Direction from origin for radial explosion
  const radialDir = [start[0], start[1], start[2]];
  const radialLen = Math.sqrt(
    radialDir[0] ** 2 + radialDir[1] ** 2 + radialDir[2] ** 2,
  );

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



// === CUSTOM SHADER MATERIAL ===
/**
 * Creates a custom ShaderMaterial for GPU-driven particle animation
 * Implements the GPU State Machine pattern from architecture.md
 */
const createParticleShaderMaterial = (
  treeColor: THREE.Color,
  texture: THREE.Texture | null,
  baseSize: number = 0.55,
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
      uBreatheFreq1: { value: PARTICLE_CONFIG.animation.breatheFrequency1 },
      uBreatheFreq2: { value: PARTICLE_CONFIG.animation.breatheFrequency2 },
      uBreatheFreq3: { value: PARTICLE_CONFIG.animation.breatheFrequency3 },
      uBreatheAmp1: { value: PARTICLE_CONFIG.animation.breatheAmplitude1 },
      uBreatheAmp2: { value: PARTICLE_CONFIG.animation.breatheAmplitude2 },
      uBreatheAmp3: { value: PARTICLE_CONFIG.animation.breatheAmplitude3 },
      uSwayFreq: { value: PARTICLE_CONFIG.animation.swayFrequency },
      uSwayAmp: { value: PARTICLE_CONFIG.animation.swayAmplitude },
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
  photos,
}) => {
  // Global State
  const treeColor = useStore((state) => state.treeColor);
  const particleCount = useStore((state) => state.particleCount);
  const { viewport } = useThree();

  // Local State
  const [texturesLoaded, setTexturesLoaded] = React.useState(false);
  const preloadStartedRef = useRef<string | null>(null);
  const explosionStartTimeRef = useRef(0);

  // Photo animation optimization: Use Map for O(1) updates, batch setState
  const [photoAnimations, setPhotoAnimations] = useState<PhotoAnimationData[]>([]);
  const animationMapRef = useRef<Map<number, PhotoAnimationData>>(new Map());
  const pendingUpdateRef = useRef(false);

  // Refs for each layer
  const entityLayerRef = useRef<THREE.Points>(null);
  const glowLayerRef = useRef<THREE.Points>(null);
  const ornamentsRef = useRef<THREE.Points>(null);
  const giftsRef = useRef<THREE.Points>(null);
  const treeBaseRef = useRef<THREE.Points>(null);

  // Shader material refs
  const entityMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const glowMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const ornamentMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const giftMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const treeBaseMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Stable animation registration callback (avoids recreation every render)
  const onRegisterAnimation = useCallback((data: PhotoAnimationData) => {
    // O(1) Map update instead of O(N) findIndex
    animationMapRef.current.set(data.instanceId, data);
    pendingUpdateRef.current = true; // Mark for batch update
  }, []);

  // Batch flush animation updates to avoid N setState calls
  useEffect(() => {
    if (!pendingUpdateRef.current) return;

    // Convert Map to array (happens once for all registrations)
    const animations = Array.from(animationMapRef.current.values());
    setPhotoAnimations(animations);
    pendingUpdateRef.current = false;
  }); // Run after every render if pending

  // Animation state
  const progressRef = useRef(0.0);
  const targetProgressRef = useRef(0.0);
  const rootRef = useRef<THREE.Group>(null);
  const shakeIntensity = useRef(0);



  // Textures
  const featherTexture = useMemo(() => createFeatherTexture(), []);
  const sparkleTexture = useMemo(() => createSparkleTexture(), []);

  // === PHOTO DATA GENERATION (ASYNC WORKER) ===
  const [photoData, setPhotoData] = useState<{
    positions: PhotoPosition[];
    urls: string[];
    count: number;
  }>({ positions: [], urls: [], count: 0 });

  useEffect(() => {
    const aspectRatio = viewport.width / viewport.height;

    // Get available source URLs (unique set)
    // Get available source URLs (unique set)
    // OPTIMIZED: Apply Cloudinary transformations if applicable
    const sourceUrls = (photos.length > 0
      ? photos.map((p) => p.url)
      : MEMORIES.map((m) => m.image)
    ).map(url => getOptimizedCloudinaryUrl(url, 512)); // Optimize to 512px width

    let cancelled = false;
    // Instantiate Worker
    const worker = new PhotoWorker();

    worker.onmessage = (e) => {
      if (cancelled) return;

      const { success, positions, error } = e.data;

      if (success && Array.isArray(positions)) {
        setPhotoData({
          positions: positions,
          urls: sourceUrls,
          count: positions.length
        });
      } else {
        console.warn('[PhotoWorker] Generation failed:', error);
        // Fallback or empty state could be handled here
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.warn('[PhotoWorker] Error:', err);
      worker.terminate();
    };
    worker.postMessage({
      count: PHOTO_COUNT,
      aspectRatio,
      sourceUrls
    });

    return () => {
      cancelled = true;
      worker.terminate();
    };
  }, [photos, viewport.width, viewport.height]);

  // Deprecated synchronous logic
  /* 
  const photoData = useMemo(() => { ... } 
  */

  // === PRELOAD TEXTURES ===
  useEffect(() => {
    // Compute key from URL list (sorted unique URLs joined)
    const uniqueUrls = [...new Set(photoData.urls)].sort();
    const currentKey = uniqueUrls.join("|");

    // Skip if this exact batch was already preloaded
    if (preloadStartedRef.current === currentKey) return;

    // Update ref with current batch key before preloading
    preloadStartedRef.current = currentKey;

    // OPTIMIZED: Initialize material pool before preloading textures
    // This ensures the pool is ready when PolaroidPhoto components mount
    try {
      initPhotoMaterialPool(masterPhotoMaterial);
      console.log('[MaterialPool] Initialized with master material');
    } catch (e) {
      console.warn('[MaterialPool] Initialization failed:', e);
    }

    // Preload in batches
    preloadTextures(uniqueUrls, 5, (loaded, total) => {
      if (loaded === total) {
        setTexturesLoaded(true);
      }
    }).catch((err) => {
      console.warn("Texture preload error:", err);
      setTexturesLoaded(true);
    });

    // Cleanup: Dispose material pool on unmount
    return () => {
      try {
        disposePhotoMaterialPool();
        console.log('[MaterialPool] Disposed');
      } catch (e) {
        console.warn('[MaterialPool] Disposal failed:', e);
      }
    };
  }, [photoData.urls]);

  // === DYNAMIC COLOR VARIANTS ===
  // Generates color variants (base, light, deep, dark) from the selected tree color
  // This is a color selection feature.
  const colorVariants = useMemo(() => {
    const base = new THREE.Color(treeColor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);

    return {
      base: base,
      light: new THREE.Color().setHSL(
        hsl.h,
        hsl.s * 0.8,
        Math.min(hsl.l + 0.2, 0.95),
      ),
      deep: new THREE.Color().setHSL(
        hsl.h,
        hsl.s * 1.2,
        Math.max(hsl.l - 0.15, 0.2),
      ),
      dark: new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(hsl.l - 0.3, 0.1)),
    };
  }, [treeColor]);

  // === ENTITY LAYER (50% - Normal Blending) ===
  // Extended with photo particle marking for morph effect
  const entityLayerData = useMemo(() => {
    // Calculate count based on total particle budget
    const count = Math.floor(
      Math.max(
        particleCount * PARTICLE_CONFIG.ratios.entity,
        PARTICLE_CONFIG.minCounts.tree * 0.7,
      ),
    );

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
    // Photo particle flag (1.0 = photo, 0.0 = regular)
    const isPhotoParticle = new Float32Array(count);
    const erosionFactors = new Float32Array(count);

    const treeHeight = PARTICLE_CONFIG.treeHeight;

    for (let i = 0; i < count; i++) {
      // Vertical distribution - bias towards bottom to match cone volume
      // Power > 1.0 pushes values towards 0 (bottom)
      const t = Math.pow(Math.random(), 1.8);
      const y = PARTICLE_CONFIG.treeBottomY + t * treeHeight;

      // Tiered tree radius
      const baseRadius = getTreeRadius(t);
      const layerNoise = Math.sin(y * 2.5) * 0.15;
      const coneR = baseRadius + layerNoise;

      // Branch structure
      const branchAngle = Math.random() * Math.PI * 2;

      // Silhouette Optimization: Enforce a surface layer
      // 75% of particles are forced to the edge (0.95-1.0) to define the shape
      // The rest fill the volume with a bias towards the outside
      const isSurface = Math.random() > 0.25;
      let distFromTrunk;

      if (isSurface) {
        distFromTrunk = 0.95 + Math.random() * 0.05;
      } else {
        distFromTrunk = Math.pow(Math.random(), 0.5);
      }

      // Natural droop at tips
      const droop = distFromTrunk * distFromTrunk * 1.0;

      // Position with reduced flocking noise for sharper edges
      const r = distFromTrunk * coneR;
      const flockNoise = (Math.random() - 0.5) * 0.1; // Reduced from 0.25
      const x = Math.cos(branchAngle) * r + flockNoise;
      const z = Math.sin(branchAngle) * r + flockNoise;
      const finalY = y - droop + (Math.random() - 0.5) * 0.3;

      // Store start position (tree shape)
      const startPos: [number, number, number] = [x, finalY, z];
      positionStart[i * 3] = x;
      positionStart[i * 3 + 1] = finalY;
      positionStart[i * 3 + 2] = z;

      // Calculate Erosion Factor (Pre-computed from Shader)
      // Uses finalY (with sag/droop) to match the actual rendered particle position
      erosionFactors[i] = calculateErosionFactor(finalY);

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
      // TREE-04: Enhanced color mixing with Warm Gold and Deep Red accents
      const colorRoll = Math.random();
      if (isTip) {
        // Tips: mostly cream/light, with 8% warm gold accent
        if (colorRoll < 0.08) {
          c = STATIC_COLORS.warmGold;
        } else if (colorRoll < 0.48) {
          c = STATIC_COLORS.cream;
        } else {
          c = colorVariants.light;
        }
      } else if (isInner) {
        // Inner: mostly deep, with 5% deep red accent
        if (colorRoll < 0.05) {
          c = STATIC_COLORS.deepRed;
        } else {
          c = colorVariants.deep;
        }
      } else {
        // Middle: base gradient with 3% warm gold and 2% deep red
        if (colorRoll < 0.03) {
          c = STATIC_COLORS.warmGold;
        } else if (colorRoll < 0.05) {
          c = STATIC_COLORS.deepRed;
        } else {
          c = colorVariants.base
            .clone()
            .lerp(colorVariants.light, heightFactor * 0.5);
        }
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      // Size with tip enhancement
      siz[i] = 0.5 + Math.random() * 0.4 + (isTip ? 0.2 : 0);

      // Initialize as non-photo particle
      isPhotoParticle[i] = 0.0;
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
      isPhotoParticle,
      erosionFactors,
      count,
    };
  }, [particleCount, config.explosionRadius, colorVariants, PARTICLE_CONFIG]);

  // === GLOW LAYER (20% - Additive Blending) ===
  const glowLayerData = useMemo(() => {
    const count = Math.floor(
      Math.max(
        particleCount * PARTICLE_CONFIG.ratios.glow,
        PARTICLE_CONFIG.minCounts.tree * 0.3,
      ),
    );
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);
    const flickerPhase = new Float32Array(count); // For sparkle animation
    const isPhotoParticle = new Float32Array(count); // All zeros - no photo particles in glow
    const erosionFactors = new Float32Array(count);

    const treeHeight = PARTICLE_CONFIG.treeHeight;

    for (let i = 0; i < count; i++) {
      // Vertical distribution - bias towards bottom
      const t = Math.pow(Math.random(), 1.8);
      const y = PARTICLE_CONFIG.treeBottomY + t * treeHeight;

      const baseRadius = getTreeRadius(t);
      const coneR = baseRadius + Math.sin(y * 2) * 0.2;

      const branchAngle = Math.random() * Math.PI * 2;
      // Push glow towards surface for better definition
      const distFromTrunk = 0.4 + Math.pow(Math.random(), 0.8) * 0.6;
      const r = distFromTrunk * coneR;

      const x = Math.cos(branchAngle) * r;
      const z = Math.sin(branchAngle) * r;

      const startPos: [number, number, number] = [x, y, z];
      positionStart[i * 3] = x;
      positionStart[i * 3 + 1] = y;
      positionStart[i * 3 + 2] = z;

      // Uses raw y (no sag) since glow layer doesn't apply droop/sag adjustments
      erosionFactors[i] = calculateErosionFactor(y);

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
      isPhotoParticle,
      erosionFactors,
      count,
    };
  }, [particleCount, config.explosionRadius, colorVariants, PARTICLE_CONFIG]);

  // === ORNAMENTS - Special ornaments with distribution algorithm ===
  const ornamentData = useMemo(() => {
    // Scale ornaments proportionally to particle count
    const count = Math.floor(
      Math.max(
        particleCount * PARTICLE_CONFIG.ratios.ornament,
        PARTICLE_CONFIG.minCounts.ornament,
      ),
    );
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);
    const isPhotoParticle = new Float32Array(count); // All zeros - no photo particles in ornaments
    const erosionFactors = new Float32Array(count);

    const treeHeight = PARTICLE_CONFIG.treeHeight;
    const treeBottom = PARTICLE_CONFIG.treeBottomY;

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
      const baseR = getTreeRadius(1 - t) * 0.95 + 0.3;

      const x = Math.cos(theta) * baseR;
      const z = Math.sin(theta) * baseR;

      const startPos: [number, number, number] = [
        x,
        y + Math.sin(theta * 3) * 0.1,
        z,
      ];
      pos[idx * 3] = x;
      pos[idx * 3 + 1] = y + Math.sin(theta * 3) * 0.1;
      pos[idx * 3 + 2] = z;

      positionStart[idx * 3] = x;
      positionStart[idx * 3 + 1] = y;
      positionStart[idx * 3 + 2] = z;

      erosionFactors[idx] = calculateErosionFactor(y);

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
      const heightRatio =
        (cluster.y - PARTICLE_CONFIG.treeBottomY) / treeHeight;
      const baseR = getTreeRadius(heightRatio) * 0.9 + 0.5;
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

        erosionFactors[idx] = calculateErosionFactor(y);

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
          case "BUS":
            c = STATIC_COLORS.londonRed;
            break;
          case "FLAG":
            c =
              p % 3 === 0
                ? STATIC_COLORS.ukRed
                : p % 3 === 1
                  ? STATIC_COLORS.ukBlue
                  : STATIC_COLORS.white;
            break;
          case "CORGI":
            c = STATIC_COLORS.corgiTan;
            break;
          case "BIG_BEN":
            c = STATIC_COLORS.silver;
            break;
          case "GIFT":
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
      isPhotoParticle,
      erosionFactors,
      count: idx,
    };
  }, [particleCount, config.explosionRadius, colorVariants, PARTICLE_CONFIG]);

  // === GIFT BOXES (Photo Source) ===
  const giftData = useMemo(() => {
    // Scale gifts proportionally to particle count
    const count = Math.floor(
      Math.max(
        particleCount * PARTICLE_CONFIG.ratios.gift,
        PARTICLE_CONFIG.minCounts.gift,
      ),
    );
    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);
    const isPhotoParticle = new Float32Array(count);

    // Store start positions of particles chosen to be photos
    // This will be used by PolaroidPhoto components to match the particle they replace
    const photoParticleStartPositions: [number, number, number][] = [];

    const gifts = [
      {
        r: 2.0,
        ang: 0,
        w: 2.2,
        h: 2.0,
        c: colorVariants.base,
        rib: STATIC_COLORS.white,
      },
      {
        r: 2.3,
        ang: 1.2,
        w: 1.8,
        h: 1.6,
        c: STATIC_COLORS.silver,
        rib: colorVariants.dark,
      },
      {
        r: 2.1,
        ang: 2.5,
        w: 2.5,
        h: 1.8,
        c: colorVariants.dark,
        rib: STATIC_COLORS.gold,
      },
      {
        r: 2.4,
        ang: 3.8,
        w: 1.6,
        h: 2.2,
        c: STATIC_COLORS.white,
        rib: STATIC_COLORS.ukRed,
      },
      {
        r: 2.2,
        ang: 5.0,
        w: 2.0,
        h: 1.5,
        c: STATIC_COLORS.cream,
        rib: STATIC_COLORS.silver,
      },
      {
        r: 3.2,
        ang: 0.6,
        w: 1.4,
        h: 1.2,
        c: colorVariants.light,
        rib: STATIC_COLORS.silver,
      },
      {
        r: 3.5,
        ang: 2.0,
        w: 1.6,
        h: 1.4,
        c: STATIC_COLORS.white,
        rib: colorVariants.base,
      },
      {
        r: 3.3,
        ang: 3.5,
        w: 1.3,
        h: 1.1,
        c: STATIC_COLORS.silver,
        rib: STATIC_COLORS.gold,
      },
      {
        r: 3.6,
        ang: 4.8,
        w: 1.5,
        h: 1.3,
        c: colorVariants.dark,
        rib: STATIC_COLORS.white,
      },
      {
        r: 3.8,
        ang: 5.8,
        w: 1.2,
        h: 1.0,
        c: STATIC_COLORS.ukBlue,
        rib: STATIC_COLORS.white,
      },
    ];

    const perGift = Math.floor(count / gifts.length);
    let idx = 0;

    gifts.forEach((gift) => {
      const cx = Math.cos(gift.ang) * gift.r;
      const cz = Math.sin(gift.ang) * gift.r;
      const cy = PARTICLE_CONFIG.treeBase.centerY + gift.h * 0.3;
      const rot = Math.random() * Math.PI;

      for (let i = 0; i < perGift; i++) {
        if (idx >= count) break;

        let ux = Math.random() - 0.5;
        let uy = Math.random() - 0.5;
        let uz = Math.random() - 0.5;

        // Bias to surface for box appearance
        if (Math.random() > 0.1) {
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

        // Default explosion target
        let endPos = getExplosionTarget(config.explosionRadius);

        // WILL BE OVERRIDDEN if this particle is selected as a photo
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
        siz[idx] = 0.8;

        isPhotoParticle[idx] = 0.0;
        idx++;
      }
    });

    // Select particles to be photos - BUT DO NOT MARK THEM AS PHOTOS in the shader
    // We want the box to remain INTACT until the photos are printed.
    // Instead, we just capture the spawn positions for the PolaroidPhoto components.

    // We want to distribute photos evenly across the gifts
    const photosPerGift = Math.ceil(photoData.count / gifts.length);
    const giftCenters: { center: [number, number, number]; angle: number }[] =
      [];

    // Calculate centers for all gifts
    gifts.forEach((gift) => {
      const cx = Math.cos(gift.ang) * gift.r;
      const cz = Math.sin(gift.ang) * gift.r;
      const cy = -6.5 + gift.h / 2;
      // Spawn point is at the top of the box
      giftCenters.push({ center: [cx, cy + gift.h / 2, cz], angle: gift.ang });
    });

    // Assign each photo to a gift box in round-robin fashion
    for (let i = 0; i < photoData.count; i++) {
      const giftIndex = i % giftCenters.length;
      const spawnPoint = giftCenters[giftIndex].center;

      photoParticleStartPositions.push([
        spawnPoint[0],
        spawnPoint[1],
        spawnPoint[2],
      ]);
    }

    return {
      positions: pos,
      positionStart,
      positionEnd, // We don't need to modify this anymore as gifts don't morph
      controlPoints,
      colors: col,
      sizes: siz,
      random,
      branchAngles,
      isPhotoParticle, // All zeros, keeping boxes solid
      photoParticleStartPositions,
      count: idx,
    };
  }, [
    particleCount,
    config.explosionRadius,
    colorVariants,
    PARTICLE_CONFIG,
    photoData,
  ]);

  // === TREE BASE LAYER (Ground ring to fix floating tree) ===
  const treeBaseData = useMemo(() => {
    if (!PARTICLE_CONFIG.treeBase.enabled) {
      return {
        positions: new Float32Array(0),
        positionStart: new Float32Array(0),
        positionEnd: new Float32Array(0),
        controlPoints: new Float32Array(0),
        colors: new Float32Array(0),
        sizes: new Float32Array(0),
        random: new Float32Array(0),
        branchAngles: new Float32Array(0),
        isPhotoParticle: new Float32Array(0),
        erosionFactors: new Float32Array(0),
        count: 0,
      };
    }

    const baseConfig = PARTICLE_CONFIG.treeBase;
    const count = Math.floor(particleCount * baseConfig.particleRatio);

    const pos = new Float32Array(count * 3);
    const positionStart = new Float32Array(count * 3);
    const positionEnd = new Float32Array(count * 3);
    const controlPoints = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const random = new Float32Array(count);
    const branchAngles = new Float32Array(count);
    const isPhotoParticle = new Float32Array(count);
    const erosionFactors = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Angle distribution - full circle
      const angle = Math.random() * Math.PI * 2;

      // Radial distribution with density falloff towards edges
      const radiusRatio = Math.pow(Math.random(), baseConfig.densityFalloff);
      const radius = baseConfig.innerRadius + radiusRatio * (baseConfig.outerRadius - baseConfig.innerRadius);

      // Position
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = baseConfig.centerY + (Math.random() - 0.5) * baseConfig.heightSpread;

      const startPos: [number, number, number] = [x, y, z];
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      positionStart[i * 3] = x;
      positionStart[i * 3 + 1] = y;
      positionStart[i * 3 + 2] = z;

      // Explosion target
      const endPos = getExplosionTarget(config.explosionRadius);
      positionEnd[i * 3] = endPos[0];
      positionEnd[i * 3 + 1] = endPos[1];
      positionEnd[i * 3 + 2] = endPos[2];

      // Control point for Bezier curve
      const ctrlPt = calculateControlPoint(startPos, endPos);
      controlPoints[i * 3] = ctrlPt[0];
      controlPoints[i * 3 + 1] = ctrlPt[1];
      controlPoints[i * 3 + 2] = ctrlPt[2];

      random[i] = Math.random();
      branchAngles[i] = angle;

      // Calculate erosion factor based on Y position
      erosionFactors[i] = calculateErosionFactor(y);

      // Color: snow/frost-like colors for base, mixing with tree colors
      const colorChoice = Math.random();
      let c: THREE.Color;
      if (colorChoice < 0.4) {
        // White/Silver - snow effect
        c = STATIC_COLORS.white;
      } else if (colorChoice < 0.6) {
        c = STATIC_COLORS.silver;
      } else if (colorChoice < 0.75) {
        c = STATIC_COLORS.cream;
      } else {
        // Tree color accent to tie into the tree
        c = colorVariants.light;
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;

      // Size - smaller towards edges for fade effect
      siz[i] = (0.3 + Math.random() * 0.3) * (1 - radiusRatio * 0.5);

      isPhotoParticle[i] = 0.0;
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
      isPhotoParticle,
      erosionFactors,
      count,
    };
  }, [particleCount, config.explosionRadius, colorVariants, PARTICLE_CONFIG]);

  // === SHADER MATERIAL CREATION ===
  useEffect(() => {
    const treeColorThree = new THREE.Color(treeColor);

    // Create materials with proper base sizes matching original PointsMaterial
    // Add error handling with fallback to ShaderMaterial if shader compilation fails
    try {
      // Entity layer: size 0.55, normal blending
      entityMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        featherTexture,
        0.55,
      );
      entityMaterialRef.current.depthWrite = true;

      // Glow layer: size 0.45, additive blending
      glowMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        sparkleTexture,
        0.45,
      );
      glowMaterialRef.current.blending = THREE.AdditiveBlending;

      // Ornaments: size 0.5, additive blending
      ornamentMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        sparkleTexture,
        0.5,
      );
      ornamentMaterialRef.current.blending = THREE.AdditiveBlending;

      // Gifts: size 0.7, normal blending
      giftMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        featherTexture,
        0.7,
      );
      giftMaterialRef.current.depthWrite = true;

      // Tree Base: size 0.5, additive blending (snow effect)
      treeBaseMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        sparkleTexture,
        0.5,
      );
      treeBaseMaterialRef.current.blending = THREE.AdditiveBlending;
    } catch (error) {
      console.error(
        "Shader compilation failed, falling back to safe ShaderMaterial",
        error,
      );
      // Fallback to proper ShaderMaterial with same uniforms to avoid runtime crashes
      const createFallbackShaderMaterial = (
        baseSize: number,
        texture: THREE.Texture | null,
      ): THREE.ShaderMaterial => {
        return new THREE.ShaderMaterial({
          vertexShader: particleVertexShader,
          fragmentShader: particleFragmentShader,
          uniforms: {
            uProgress: { value: 0.0 },
            uTime: { value: 0.0 },
            uTreeColor: { value: treeColorThree },
            uMap: { value: texture },
            uBaseSize: { value: baseSize },
            uBreatheFreq1: { value: PARTICLE_CONFIG.animation.breatheFrequency1 },
            uBreatheFreq2: { value: PARTICLE_CONFIG.animation.breatheFrequency2 },
            uBreatheFreq3: { value: PARTICLE_CONFIG.animation.breatheFrequency3 },
            uBreatheAmp1: { value: PARTICLE_CONFIG.animation.breatheAmplitude1 },
            uBreatheAmp2: { value: PARTICLE_CONFIG.animation.breatheAmplitude2 },
            uBreatheAmp3: { value: PARTICLE_CONFIG.animation.breatheAmplitude3 },
            uSwayFreq: { value: PARTICLE_CONFIG.animation.swayFrequency },
            uSwayAmp: { value: PARTICLE_CONFIG.animation.swayAmplitude },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.NormalBlending,
          vertexColors: true,
        });
      };

      // Create fallback materials with proper ShaderMaterial instances
      entityMaterialRef.current = createFallbackShaderMaterial(
        0.55,
        featherTexture,
      );
      entityMaterialRef.current.depthWrite = true;

      glowMaterialRef.current = createFallbackShaderMaterial(
        0.45,
        sparkleTexture,
      );
      glowMaterialRef.current.blending = THREE.AdditiveBlending;

      ornamentMaterialRef.current = createFallbackShaderMaterial(
        0.5,
        sparkleTexture,
      );
      ornamentMaterialRef.current.blending = THREE.AdditiveBlending;

      giftMaterialRef.current = createFallbackShaderMaterial(
        0.7,
        featherTexture,
      );
      giftMaterialRef.current.depthWrite = true;

      treeBaseMaterialRef.current = createFallbackShaderMaterial(
        0.5,
        sparkleTexture,
      );
      treeBaseMaterialRef.current.blending = THREE.AdditiveBlending;
    }

    // Cleanup
    return () => {
      entityMaterialRef.current?.dispose();
      glowMaterialRef.current?.dispose();
      ornamentMaterialRef.current?.dispose();
      giftMaterialRef.current?.dispose();
      treeBaseMaterialRef.current?.dispose();
    };
  }, [treeColor, featherTexture, sparkleTexture]);

  // === UPDATE TARGET PROGRESS & START TIME ===
  useEffect(() => {
    targetProgressRef.current = isExploded ? 1.0 : 0.0;
    if (isExploded) {
      // Capture the timestamp when explosion starts
      // We can't access 'state.clock' here easily without a hook,
      // but we can assume this effect runs on frame or shortly after.
      // Actually best to set a flag and capture time in useFrame
      // OR just look at uTime in shader.
      // Let's rely on useFrame to capture "transition start".
    }
  }, [isExploded]);

  // === ANIMATION FRAME ===
  const { camera, clock } = useThree(); // Get clock directly

  // Track explosion start in a ref accessible to logic
  useEffect(() => {
    if (isExploded) {
      explosionStartTimeRef.current = clock.elapsedTime;
    }
  }, [isExploded, clock]); // Clock is stable from useThree

  // NEW: Update breathing uniforms based on config toggle
  useEffect(() => {
    const {
      enableBreathing,
      breatheAmplitude1, breatheAmplitude2, breatheAmplitude3
    } = PARTICLE_CONFIG.animation;

    // If disabled, zero out amplitudes
    const amp1 = enableBreathing ? breatheAmplitude1 : 0.0;
    const amp2 = enableBreathing ? breatheAmplitude2 : 0.0;
    const amp3 = enableBreathing ? breatheAmplitude3 : 0.0;

    const materials = [
      entityMaterialRef.current,
      glowMaterialRef.current,
      ornamentMaterialRef.current,
      giftMaterialRef.current
    ];

    materials.forEach(mat => {
      if (mat && mat.uniforms) {
        if (mat.uniforms.uBreatheAmp1) mat.uniforms.uBreatheAmp1.value = amp1;
        if (mat.uniforms.uBreatheAmp2) mat.uniforms.uBreatheAmp2.value = amp2;
        if (mat.uniforms.uBreatheAmp3) mat.uniforms.uBreatheAmp3.value = amp3;
      }
    });

    console.log('[TreeParticles] Breathing Animation:', enableBreathing ? 'ENABLED' : 'DISABLED');

  }, [
    PARTICLE_CONFIG.animation.enableBreathing,
    PARTICLE_CONFIG.animation.breatheAmplitude1,
    PARTICLE_CONFIG.animation.breatheAmplitude2,
    PARTICLE_CONFIG.animation.breatheAmplitude3
  ]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const delta = state.clock.getDelta();

    // === GPU STATE MACHINE: Interpolate uProgress uniform ===
    // Damping speeds: Explosion (0.02) is slower for high-velocity effect,
    // Reset (0.04) is faster for quicker return. Matches AC6 "Midnight Magic" aesthetic
    // requirement: "high velocity, rapid damping" for explosion phase.
    const dampingSpeed = isExploded
      ? PARTICLE_CONFIG.animation.dampingSpeedExplosion
      : PARTICLE_CONFIG.animation.dampingSpeedReset;
    const diff = targetProgressRef.current - progressRef.current;
    progressRef.current += diff * dampingSpeed;

    // Update all shader materials with new uniform values
    const materials = [
      entityMaterialRef.current,
      glowMaterialRef.current,
      ornamentMaterialRef.current,
      // giftMaterialRef.current is handled separately below
    ];

    materials.forEach((mat) => {
      if (mat && mat instanceof THREE.ShaderMaterial && mat.uniforms) {
        mat.uniforms.uProgress.value = progressRef.current;
        mat.uniforms.uTime.value = time;
      }
    });

    // === BOX DISSOLVE LOGIC ===
    // Gifts should remain solid while photos are printing.
    // Printing duration = (Total Photos * Stagger Delay) + Individual Animation Time
    // 99 photos * 0.05s = 4.95s. Plus 1.5s buffer.
    const printingDuration = PHOTO_COUNT * 0.05 + 1.5;

    if (
      giftMaterialRef.current &&
      giftMaterialRef.current instanceof THREE.ShaderMaterial &&
      giftMaterialRef.current.uniforms
    ) {
      if (isExploded) {
        // Fix for disappearing particles:
        // Keep gift boxes solid and at their original position (uProgress = 0.0)
        // throughout the entire explosion sequence. They serve as the anchor.
        giftMaterialRef.current.uniforms.uProgress.value = 0.0;
      } else {
        // When resetting, follow the main progress (which goes back to 0.0)
        giftMaterialRef.current.uniforms.uProgress.value = progressRef.current;
      }
      giftMaterialRef.current.uniforms.uTime.value = time;
    }

    // Rotation animation for visual appeal
    const rotSpeed = isExploded ? 0.0005 : config.rotationSpeed * 0.001;

    // Check if refs exist before accessing rotation
    if (entityLayerRef.current) entityLayerRef.current.rotation.y += rotSpeed;
    if (glowLayerRef.current) glowLayerRef.current.rotation.y += rotSpeed;
    if (ornamentsRef.current) ornamentsRef.current.rotation.y += rotSpeed;
    if (giftsRef.current) giftsRef.current.rotation.y += rotSpeed;

    // Ensure root position is reset (shake animation removed)
    if (rootRef.current && rootRef.current.position.lengthSq() > 0) {
      rootRef.current.position.set(0, 0, 0);
    }
  });

  const treeKey = `tree-${particleCount}-${treeColor}`;

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();
        onParticlesClick();
      }}
    >
      {/* === ENTITY LAYER (Normal Blending + Depth Write) === */}
      <points key={`entity-${treeKey}`} ref={entityLayerRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={entityLayerData.count}
            array={entityLayerData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionStart"
            count={entityLayerData.count}
            array={entityLayerData.positionStart}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionEnd"
            count={entityLayerData.count}
            array={entityLayerData.positionEnd}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-controlPoint"
            count={entityLayerData.count}
            array={entityLayerData.controlPoints}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={entityLayerData.count}
            array={entityLayerData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={entityLayerData.count}
            array={entityLayerData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={entityLayerData.count}
            array={entityLayerData.random}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBranchAngle"
            count={entityLayerData.count}
            array={entityLayerData.branchAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsPhotoParticle"
            count={entityLayerData.count}
            array={entityLayerData.isPhotoParticle}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aErosionFactor"
            count={entityLayerData.count}
            array={entityLayerData.erosionFactors}
            itemSize={1}
          />
        </bufferGeometry>
        {entityMaterialRef.current && (
          <primitive object={entityMaterialRef.current} attach="material" />
        )}
      </points>

      {/* === GLOW LAYER (Additive Blending) === */}
      <points key={`glow-${treeKey}`} ref={glowLayerRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={glowLayerData.count}
            array={glowLayerData.positions}
            itemSize={3}
          />

          <bufferAttribute
            attach="attributes-positionStart"
            count={glowLayerData.count}
            array={glowLayerData.positionStart}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionEnd"
            count={glowLayerData.count}
            array={glowLayerData.positionEnd}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-controlPoint"
            count={glowLayerData.count}
            array={glowLayerData.controlPoints}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={glowLayerData.count}
            array={glowLayerData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={glowLayerData.count}
            array={glowLayerData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={glowLayerData.count}
            array={glowLayerData.random}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBranchAngle"
            count={glowLayerData.count}
            array={glowLayerData.branchAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsPhotoParticle"
            count={glowLayerData.count}
            array={glowLayerData.isPhotoParticle}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aErosionFactor"
            count={glowLayerData.count}
            array={glowLayerData.erosionFactors}
            itemSize={1}
          />
        </bufferGeometry>
        {glowMaterialRef.current && (
          <primitive object={glowMaterialRef.current} attach="material" />
        )}
      </points>

      {/* Tree Base Layer */}
      <points ref={treeBaseRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={treeBaseData.count}
            array={treeBaseData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionStart"
            count={treeBaseData.count}
            array={treeBaseData.positionStart}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionEnd"
            count={treeBaseData.count}
            array={treeBaseData.positionEnd}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-controlPoint"
            count={treeBaseData.count}
            array={treeBaseData.controlPoints}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={treeBaseData.count}
            array={treeBaseData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={treeBaseData.count}
            array={treeBaseData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={treeBaseData.count}
            array={treeBaseData.random}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBranchAngle"
            count={treeBaseData.count}
            array={treeBaseData.branchAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsPhotoParticle"
            count={treeBaseData.count}
            array={treeBaseData.isPhotoParticle}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aErosionFactor"
            count={treeBaseData.count}
            array={treeBaseData.erosionFactors}
            itemSize={1}
          />
        </bufferGeometry>
        {treeBaseMaterialRef.current && (
          <primitive object={treeBaseMaterialRef.current} attach="material" />
        )}
      </points>

      {/* Ornaments and pearls */}
      <points ref={ornamentsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={ornamentData.count}
            array={ornamentData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionStart"
            count={ornamentData.count}
            array={ornamentData.positionStart}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionEnd"
            count={ornamentData.count}
            array={ornamentData.positionEnd}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-controlPoint"
            count={ornamentData.count}
            array={ornamentData.controlPoints}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={ornamentData.count}
            array={ornamentData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={ornamentData.count}
            array={ornamentData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={ornamentData.count}
            array={ornamentData.random}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBranchAngle"
            count={ornamentData.count}
            array={ornamentData.branchAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsPhotoParticle"
            count={ornamentData.count}
            array={ornamentData.isPhotoParticle}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aErosionFactor"
            count={ornamentData.count}
            array={ornamentData.erosionFactors}
            itemSize={1}
          />
        </bufferGeometry>
        {ornamentMaterialRef.current && (
          <primitive object={ornamentMaterialRef.current} attach="material" />
        )}
      </points>

      {/* Gift boxes */}
      <points ref={giftsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={giftData.count}
            array={giftData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionStart"
            count={giftData.count}
            array={giftData.positionStart}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-positionEnd"
            count={giftData.count}
            array={giftData.positionEnd}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-controlPoint"
            count={giftData.count}
            array={giftData.controlPoints}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aColor"
            count={giftData.count}
            array={giftData.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={giftData.count}
            array={giftData.sizes}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={giftData.count}
            array={giftData.random}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBranchAngle"
            count={giftData.count}
            array={giftData.branchAngles}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aIsPhotoParticle"
            count={giftData.count}
            array={giftData.isPhotoParticle}
            itemSize={1}
          />
        </bufferGeometry>
        {giftMaterialRef.current && (
          <primitive object={giftMaterialRef.current} attach="material" />
        )}
      </points>

      {/* === POLAROID PHOTOS === */}
      {/* Mounted always to avoid render lag on click, but hidden until needed */}
      <group>
        {(photoData.positions || []).map((pos, i) => {
          // Only render if we have a matching start position from the gifts
          if (i >= giftData.photoParticleStartPositions.length) return null;

          return (
            <PolaroidPhoto
              key={i}
              url={photoData.urls[i % photoData.urls.length]}
              position={[pos.x, pos.y, pos.z]}
              rotation={pos.rotation}
              scale={pos.scale * config.photoSize}
              isExploded={isExploded}
              particleStartPosition={giftData.photoParticleStartPositions[i]}
              morphIndex={i}
              totalPhotos={photoData.positions.length}
              textureReady={texturesLoaded}
              instanceId={i}
              useExternalAnimation={true} // NEW: Enable external animation
              onRegisterAnimation={onRegisterAnimation} // NEW: Stable callback
            />
          );
        })}
      </group>

      {/* NEW: PhotoManager - Single useFrame for all photos */}
      <PhotoManager photos={photoAnimations} isExploded={isExploded} />    </group>
  );
};
