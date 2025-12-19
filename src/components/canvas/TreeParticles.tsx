import React, { useRef, useMemo, useEffect, useState, useCallback } from "react"; // Added useCallback

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { AppConfig } from "../../types.ts";
import { useStore } from "../../store/useStore";
import { getOptimizedCloudinaryUrl } from "../../utils/cloudinaryUtils"; // NEW: Cloudinary Optimization
import { COLOR_CONFIG } from "../../config/colors";
import { PARTICLE_CONFIG } from "../../config/particles";
import PhotoWorker from '../../workers/photoPositions.worker?worker'; // Import Worker
import {
  PHOTO_WALL_CONFIG,
  PhotoPosition,
} from "../../config/photoConfig";
import { generatePhotoPositions } from "../../utils/photoUtils";
import { getTreeRadius, calculateErosionFactor } from "../../utils/treeUtils";
import { ORNAMENT_CONFIG, type OrnamentType } from "../../config";

import particleVertexShader from "../../shaders/particle.vert?raw";
import particleFragmentShader from "../../shaders/particle.frag?raw";
import { PolaroidPhoto, masterPhotoMaterial } from "./PolaroidPhoto"; // NEW: Import masterPhotoMaterial for pool init
import { PhotoManager, PhotoAnimationData } from "./PhotoManager"; // NEW: Import PhotoManager
import { PhotoManagerOptimized } from "./PhotoManagerOptimized"; // Phase 2: Optimized version
import { usePerformanceMonitor } from "../../utils/performanceMonitor"; // Performance monitoring
import { TextureWarmup } from "./TextureWarmup"; // NEW: GPU texture pre-upload (Plan B)
import { ASSET_CONFIG } from "../../config/assets";
import { preloadTextures } from "../../utils/texturePreloader";

import { PhotoData } from "../../types.ts";
import { initPhotoMaterialPool, disposePhotoMaterialPool } from "../../utils/materialPool"; // NEW: Material pool
import { initFrameMaterialPool, disposeFrameMaterialPool } from "../../utils/frameMaterialPool"; // NEW: Frame material pool
import { SkeletonUtils } from "three-stdlib"; // NEW: For Model-to-Particle conversion & Scene cloning

import { useGLTF, Image, useTexture } from "@react-three/drei"; // NEW: Load user models & Images
import { GIFT_MODELS, GIFT_BOX_CONFIGS, calculateGiftPosition } from "../../config/giftBoxes";

// GiftMesh component moved to GiftBoxes.tsx for independent rendering

interface TreeParticlesProps {
  isExploded: boolean;
  config: AppConfig;
  onParticlesClick: () => void;
  photos: PhotoData[];
}

// === TEXTURE FACTORY ===





const assignOrnamentType = ORNAMENT_CONFIG.distribution.getOrnamentType;

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

// Note: calculateErosionFactor is imported from treeUtils for consistency with MagicDust

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
const SIZE_COEFFICIENTS = ORNAMENT_CONFIG.sizeCoefficients;

const ORNAMENT_IMAGE_MAP = ORNAMENT_CONFIG.imageMap;



// === CUSTOM SHADER MATERIAL ===
/**
 * Creates a custom ShaderMaterial for GPU-driven particle animation
 * Implements the GPU State Machine pattern from architecture.md
 * 
 * Dissipation animation parameters are sourced from PARTICLE_CONFIG.dissipation
 * to ensure synchronization with MagicDust particles.
 */
const createParticleShaderMaterial = (
  treeColor: THREE.Color,
  texture: THREE.Texture | null,
  baseSize: number = 0.55,
  brightness: number = 1.0,
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
      uBrightness: { value: brightness },
      uBreatheFreq1: { value: PARTICLE_CONFIG.animation.breatheFrequency1 },
      uBreatheFreq2: { value: PARTICLE_CONFIG.animation.breatheFrequency2 },
      uBreatheFreq3: { value: PARTICLE_CONFIG.animation.breatheFrequency3 },
      uBreatheAmp1: { value: PARTICLE_CONFIG.animation.breatheAmplitude1 },
      uBreatheAmp2: { value: PARTICLE_CONFIG.animation.breatheAmplitude2 },
      uBreatheAmp3: { value: PARTICLE_CONFIG.animation.breatheAmplitude3 },
      uSwayFreq: { value: PARTICLE_CONFIG.animation.swayFrequency },
      uSwayAmp: { value: PARTICLE_CONFIG.animation.swayAmplitude },
      uGlobalAlpha: { value: 0.0 }, // Start invisible for fade-in
      // Dual-layer particle system uniforms
      uDissipateOnly: { value: PARTICLE_CONFIG.dissipation.dissipateOnly ? 1.0 : 0.0 },
      uCoreLayerRatio: { value: PARTICLE_CONFIG.dissipation.coreLayerRatio },
      uIsEntrance: { value: 0.0 }, // Set dynamically based on landingPhase
      // Dissipation animation uniforms (synchronized with MagicDust)
      uProgressMultiplier: { value: PARTICLE_CONFIG.dissipation.progressMultiplier },
      uNoiseInfluence: { value: PARTICLE_CONFIG.dissipation.noiseInfluence },
      uHeightInfluence: { value: PARTICLE_CONFIG.dissipation.heightInfluence },
      uUpForce: { value: PARTICLE_CONFIG.dissipation.upForce },
      uDriftAmplitude: { value: PARTICLE_CONFIG.dissipation.driftAmplitude },
      uGrowPeakProgress: { value: PARTICLE_CONFIG.dissipation.growPeakProgress },
      uGrowAmount: { value: PARTICLE_CONFIG.dissipation.growAmount },
      uShrinkAmount: { value: PARTICLE_CONFIG.dissipation.shrinkAmount },
      uFadeStart: { value: PARTICLE_CONFIG.dissipation.fadeStart },
      uFadeEnd: { value: PARTICLE_CONFIG.dissipation.fadeEnd },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexColors: true,
  });
};

// === DISSOLVING IMAGE COMPONENT ===
const DissolvingImage = ({
  url,
  position,
  scale,
  rotation,
  progressRef,
  erosionFactor,
}: {
  url: string;
  position: [number, number, number];
  scale: [number, number] | number; // Updated type compatibility
  rotation: [number, number, number];
  progressRef: React.MutableRefObject<number>;
  erosionFactor: number;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Access the material using 'any' to bypass TS check for 'opacity' on Material type
      // The Image component uses a MeshBasicMaterial behind the scenes
      const material = (meshRef.current.material as THREE.MeshBasicMaterial);

      // Calculate opacity based on erosion logic
      // If progress > erosionFactor, we are eroding.
      // We want a sharp but smooth fade.
      const progress = progressRef.current;

      // Threshold: visible if progress <= erosionFactor
      // Let's add a small smooth transition
      const visibilityThreshold = erosionFactor * 0.8;
      const fadeWidth = 0.15;

      let alpha = 1.0;
      if (progress > visibilityThreshold) {
        // Fading out
        // Normalized fade progress: 0 (start) -> 1 (fully faded)
        const fadeProgress = (progress - visibilityThreshold) / fadeWidth;
        alpha = 1.0 - Math.min(Math.max(fadeProgress, 0.0), 1.0);
      } else {
        // Fully visible
        alpha = 1.0;
      }

      material.opacity = alpha;
      material.transparent = true;
      material.depthWrite = false; // Proper transparency rendering
    }
  });

  return (
    <Image
      ref={meshRef}
      url={url}
      position={position}
      scale={scale}
      rotation={rotation}
      transparent
    />
  );
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
  const landingPhase = useStore((state) => state.landingPhase);
  const treeMorphState = useStore((state) => state.treeMorphState); // NEW: For warmup timing
  const { viewport } = useThree();

  const globalAlphaRef = useRef(0.0);

  // Phase 2: 性能监控 (始终初始化，通过内部逻辑控制启用)
  const performanceMonitor = usePerformanceMonitor('PhotoWall');
  useEffect(() => {
    if (!PARTICLE_CONFIG.performance.enableDebugLogs) {
      performanceMonitor.disable();
    } else {
      performanceMonitor.enable();
    }
  }, [performanceMonitor]);

  // === GIFT BOX GLB MODELS ===
  // GLB rendering moved to independent GiftBoxes component
  // Only keeping giftGltfs for geometry extraction (used in particle effects)
  const giftGltfs = useGLTF(GIFT_MODELS);

  // Extract geometries from loaded GLTFs (for particle effects)
  const giftGeometries = useMemo(() => {
    const gltfArray = Array.isArray(giftGltfs) ? giftGltfs : [giftGltfs];
    return gltfArray.map((gltf) => {
      let geo: THREE.BufferGeometry | null = null;
      gltf.scene.traverse((child) => {
        if (!geo && (child as THREE.Mesh).isMesh) {
          geo = (child as THREE.Mesh).geometry;
        }
      });
      // Fallback if no mesh found
      return geo || new THREE.BoxGeometry(1, 1, 1);
    });
  }, [giftGltfs]);

  // Local State
  const [texturesLoaded, setTexturesLoaded] = React.useState(false);
  const [poolsInitialized, setPoolsInitialized] = React.useState(false); // NEW: Track pool readiness
  const preloadStartedRef = useRef<string | null>(null);
  const initCleanupRef = useRef<(() => void) | null>(null); // NEW: Store cleanup for scheduled init
  const explosionStartTimeRef = useRef(0);

  // Photo animation optimization: Use Map for O(1) updates, batch setState
  const [photoAnimations, setPhotoAnimations] = useState<PhotoAnimationData[]>([]);
  const animationMapRef = useRef<Map<number, PhotoAnimationData>>(new Map());
  const pendingUpdateRef = useRef(false);

  // Refs for each layer
  const entityLayerRef = useRef<THREE.Points>(null);
  const imageOrnamentsRef = useRef<THREE.Group>(null); // NEW: Group for image ornaments
  const treeBaseRef = useRef<THREE.Points>(null);

  // Shader material refs
  const entityMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const treeBaseMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Master material refs for pool initialization (need to be disposed separately)
  const masterFrameMatRef = useRef<THREE.MeshStandardMaterial | null>(null);

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
  // Start exploded (1.5) if we are in morphing phase (Entrance)
  // Otherwise 0.0 (Tree)
  const isEntrance = useStore.getState().landingPhase === 'morphing';
  const progressRef = useRef(isEntrance ? 0.81 : 0.0);

  const targetProgressRef = useRef(0.0);
  const rootRef = useRef<THREE.Group>(null);
  const shakeIntensity = useRef(0);



  // Textures
  const particleTexture = useTexture('/textures/sparkle.png');


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
      : ASSET_CONFIG.memories.map((m) => m.image)
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
    const isMobile = viewport.width < 10;
    const photoCount = isMobile ? PHOTO_WALL_CONFIG.count.compact : PHOTO_WALL_CONFIG.count.normal;

    worker.postMessage({
      count: photoCount,
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

    // OPTIMIZED: Delay material pool initialization to avoid competing with tree morphing animation
    // Use requestIdleCallback if available, otherwise setTimeout with delay
    const initMaterialPools = () => {
      try {
        const isMobile = viewport.width < 10;
        const poolSize = isMobile ? PHOTO_WALL_CONFIG.count.compact + 20 : PHOTO_WALL_CONFIG.count.normal + 20;

        // Pre-warm photo materials
        initPhotoMaterialPool(masterPhotoMaterial, poolSize);
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log(`[MaterialPool] Initialized with ${poolSize} pre-warmed instances`);

        // Pre-warm frame materials
        const masterFrameMat = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          roughness: 0.4,
          metalness: 0.1,
          emissive: new THREE.Color(0xfffee0),
          emissiveIntensity: 0,
          side: THREE.FrontSide,
          transparent: true,
          opacity: 0,
          depthWrite: true,
        });
        masterFrameMatRef.current = masterFrameMat;
        initFrameMaterialPool(masterFrameMat, poolSize);
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log(`[FrameMaterialPool] Initialized with ${poolSize} pre-warmed instances`);

        // NEW: Mark as initialized
        setPoolsInitialized(true);
      } catch (e) {
        console.warn('[MaterialPool] Initialization failed:', e);
      }
    };

    // NEW: Use requestIdleCallback for non-blocking initialization
    if (typeof requestIdleCallback !== 'undefined') {
      const idleCallbackId = requestIdleCallback(initMaterialPools, { timeout: 2000 });

      // Cleanup callback on unmount
      initCleanupRef.current = () => {
        cancelIdleCallback(idleCallbackId);
      };
    } else {
      // Fallback: Delay initialization by 300ms to let tree animation start smoothly
      const timerId = setTimeout(initMaterialPools, 300);

      // Cleanup timer on unmount
      initCleanupRef.current = () => {
        clearTimeout(timerId);
      };
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

    // Cleanup: Dispose material pools on unmount
    return () => {
      // NEW: Clear scheduled initialization
      if (initCleanupRef.current) {
        initCleanupRef.current();
        initCleanupRef.current = null;
      }

      try {
        disposePhotoMaterialPool(true, true); // NEW: silent=true
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[MaterialPool] Disposed');
      } catch (e) {
        console.warn('[MaterialPool] Disposal failed:', e);
      }

      try {
        // User manually reverted this function to 1 argument
        disposeFrameMaterialPool(true);
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[FrameMaterialPool] Disposed');
      } catch (e) {
        console.warn('[FrameMaterialPool] Disposal failed:', e);
      }

      // Dispose master frame material separately to prevent memory leak
      if (masterFrameMatRef.current) {
        masterFrameMatRef.current.dispose();
        masterFrameMatRef.current = null;
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[FrameMaterialPool] Master material disposed');
      }

      // Reset readiness flags
      setPoolsInitialized(false);
      setTexturesLoaded(false);
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
        PARTICLE_CONFIG.minCounts.entity * 0.7,
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
          c = COLOR_CONFIG.static.warmGold;
        } else if (colorRoll < 0.48) {
          c = COLOR_CONFIG.static.cream;
        } else {
          c = colorVariants.light;
        }
      } else if (isInner) {
        // Inner: mostly deep, with 5% deep red accent
        if (colorRoll < 0.05) {
          c = COLOR_CONFIG.static.deepRed;
        } else {
          c = colorVariants.deep;
        }
      } else {
        // Middle: base gradient with 3% warm gold and 2% deep red
        if (colorRoll < 0.03) {
          c = COLOR_CONFIG.static.warmGold;
        } else if (colorRoll < 0.05) {
          c = COLOR_CONFIG.static.deepRed;
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
      // Size with tip enhancement using config
      const { minScale, maxScale, tipBoost } = PARTICLE_CONFIG.rendering.entity;
      siz[i] = minScale + Math.random() * (maxScale - minScale) + (isTip ? tipBoost : 0);

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



  // === ORNAMENTS - Special ornaments with distribution algorithm ===
  // === ORNAMENTS - Special ornaments with distribution algorithm ===
  const ornamentData = useMemo(() => {
    // No particle-based ornaments anymore, only images
    const count = 0;

    // Empty arrays for particle system (since we removed particle rendering for ornaments)
    const pos = new Float32Array(0);
    const positionStart = new Float32Array(0);
    const positionEnd = new Float32Array(0);
    const controlPoints = new Float32Array(0);
    const col = new Float32Array(0);
    const siz = new Float32Array(0);
    const random = new Float32Array(0);
    const branchAngles = new Float32Array(0);
    const isPhotoParticle = new Float32Array(0);
    const erosionFactors = new Float32Array(0);

    const treeHeight = PARTICLE_CONFIG.treeHeight;
    const treeBottom = PARTICLE_CONFIG.treeBottomY;

    // Image ornaments list
    const imageItems: Array<{
      type: OrnamentType;
      position: [number, number, number];
      scale: number;
      rotation: number;
      erosionFactor: number;
    }> = [];

    // Helper to check distance
    const isTooClose = (
      pos: { x: number, y: number, z: number },
      type: OrnamentType,
      existing: typeof imageItems,
      minDistSame: number = 3.5,
      minDistDiff: number = 2.0
    ) => {
      for (const item of existing) {
        const dx = pos.x - item.position[0];
        const dy = pos.y - item.position[1];
        const dz = pos.z - item.position[2];
        const distSq = dx * dx + dy * dy + dz * dz;

        const limit = item.type === type ? minDistSame : minDistDiff;
        if (distSq < limit * limit) return true;
      }
      return false;
    };

    let attempts = 0;
    const isMobile = viewport.width < 10;
    const maxItems = isMobile ? PARTICLE_CONFIG.rendering.ornament.count.compact : PARTICLE_CONFIG.rendering.ornament.count.normal;
    const baseScale = PARTICLE_CONFIG.rendering.ornament.scale;
    let placedCount = 0;

    while (placedCount < maxItems && attempts < 500) {
      attempts++;
      const t = 0.1 + Math.random() * 0.85; // Avoid very top and bottom
      const y = treeBottom + t * treeHeight;
      const heightRatio = t;

      const angle = Math.random() * Math.PI * 2;
      const type = assignOrnamentType(heightRatio);

      // Strict surface placement
      const surfaceR = getTreeRadius(heightRatio);
      // Place EXACTLY on surface, pushed out slightly to avoid clipping
      const r = surfaceR + 0.2;

      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;

      // Check distance
      if (isTooClose(
        { x: cx, y, z: cz },
        type,
        imageItems,
        2.5, // Min dist specific
        1.5  // Min dist generic
      )) {
        continue;
      }

      // If image ornament, add to image list
      if (ORNAMENT_IMAGE_MAP[type]) {
        const sizeCoef = SIZE_COEFFICIENTS[type];
        imageItems.push({
          type: type,
          position: [cx, y, cz],
          scale: (0.3 + Math.random() * 0.2) * sizeCoef * baseScale,
          rotation: -angle,
          erosionFactor: calculateErosionFactor(y)
        });
        placedCount++;
      }
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

      count: 0, // Particle count is 0
      imageItems, // Return image items
    };
  }, [particleCount, config.explosionRadius, colorVariants, PARTICLE_CONFIG]);

  // === GIFT BOX CONFIG ===
  const gifts = useMemo(() => [
    {
      r: 3.2,
      ang: 0.6,
      w: 2.2,
      h: 2.0,
      c: colorVariants.base,
      rib: COLOR_CONFIG.static.white,
    },
    {
      r: 2.3,
      ang: 1.2,
      w: 1.8,
      h: 1.6,
      c: COLOR_CONFIG.static.silver,
      rib: colorVariants.dark,
    },
    {
      r: 2.1,
      ang: 2.5,
      w: 2.5,
      h: 1.8,
      c: colorVariants.dark,
      rib: COLOR_CONFIG.static.gold,
    },
    {
      r: 2.4,
      ang: 3.8,
      w: 1.6,
      h: 2.2,
      c: COLOR_CONFIG.static.white,
      rib: COLOR_CONFIG.static.ukRed,
    },
    {
      r: 2.2,
      ang: 5.0,
      w: 2.0,
      h: 1.5,
      c: COLOR_CONFIG.static.cream,
      rib: COLOR_CONFIG.static.silver,
    },
    {
      r: 3.2,
      ang: 0.6,
      w: 1.4,
      h: 1.2,
      c: colorVariants.light,
      rib: COLOR_CONFIG.static.silver,
    },
    {
      r: 3.5,
      ang: 2.0,
      w: 1.6,
      h: 1.4,
      c: COLOR_CONFIG.static.white,
      rib: colorVariants.base,
    },
    {
      r: 3.3,
      ang: 3.5,
      w: 1.3,
      h: 1.1,
      c: COLOR_CONFIG.static.silver,
      rib: COLOR_CONFIG.static.gold,
    },
    {
      r: 3.6,
      ang: 4.8,
      w: 1.5,
      h: 1.3,
      c: colorVariants.dark,
      rib: COLOR_CONFIG.static.white,
    },
    {
      r: 3.8,
      ang: 5.8,
      w: 1.2,
      h: 1.0,
      c: COLOR_CONFIG.static.ukBlue,
      rib: COLOR_CONFIG.static.white,
    },
  ], [colorVariants]);

  // === GIFT BOXES (Photo Source) ===
  const giftData = useMemo(() => {
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
      const cy = PARTICLE_CONFIG.treeBase.centerY + gift.h * 0.3;
      // Spawn point is at the top of the box
      giftCenters.push({ center: [cx, cy + gift.h / 2, cz], angle: gift.ang });
    });

    // Store start positions of particles chosen to be photos
    const photoParticleStartPositions: [number, number, number][] = [];

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
      positions: new Float32Array(0),
      positionStart: new Float32Array(0),
      positionEnd: new Float32Array(0),
      controlPoints: new Float32Array(0),
      colors: new Float32Array(0),
      sizes: new Float32Array(0),
      random: new Float32Array(0),
      branchAngles: new Float32Array(0),
      isPhotoParticle: new Float32Array(0), // All zeros, keeping boxes solid
      photoParticleStartPositions,
      count: 0,
    };
  }, [
    particleCount,
    config.explosionRadius,
    colorVariants,
    PARTICLE_CONFIG,
    photoData,
    giftGeometries,
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
    const count = Math.floor(particleCount * PARTICLE_CONFIG.ratios.treeBase);

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
        c = COLOR_CONFIG.static.white;
      } else if (colorChoice < 0.6) {
        c = COLOR_CONFIG.static.silver;
      } else if (colorChoice < 0.75) {
        c = COLOR_CONFIG.static.cream;
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
  // === MATERIALS INITIALIZATION ===
  const [materialsReady, setMaterialsReady] = useState(false);

  useEffect(() => {
    const treeColorThree = new THREE.Color(treeColor);

    // Create materials with proper base sizes matching original PointsMaterial
    // Add error handling with fallback to ShaderMaterial if shader compilation fails
    try {
      // Entity layer: size from config, normal blending
      entityMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        particleTexture,
        PARTICLE_CONFIG.rendering.entity.baseSize,
        PARTICLE_CONFIG.rendering.entity.brightness,
      );
      entityMaterialRef.current.depthWrite = true;

      // Ornaments: size from config, additive blending
      // Ornament material removed (replaced by images)

      // Gifts material removed

      // Tree Base: size from config, additive blending (snow effect)
      treeBaseMaterialRef.current = createParticleShaderMaterial(
        treeColorThree,
        null,
        PARTICLE_CONFIG.rendering.treeBase.baseSize,
        1.0, // Default brightness for tree base
      );
      treeBaseMaterialRef.current.blending = THREE.AdditiveBlending;

      // Mark materials as ready to prevent white cone flash
      setMaterialsReady(true);

    } catch (error) {
      console.error(
        "Shader compilation failed, falling back to safe ShaderMaterial",
        error,
      );
      // Fallback to proper ShaderMaterial with same uniforms to avoid runtime crashes
      const createFallbackShaderMaterial = (
        baseSize: number,
        texture: THREE.Texture | null,
        brightness: number = 1.0,
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
            uBrightness: { value: brightness },
            uBreatheFreq1: { value: PARTICLE_CONFIG.animation.breatheFrequency1 },
            uBreatheFreq2: { value: PARTICLE_CONFIG.animation.breatheFrequency2 },
            uBreatheFreq3: { value: PARTICLE_CONFIG.animation.breatheFrequency3 },
            uBreatheAmp1: { value: PARTICLE_CONFIG.animation.breatheAmplitude1 },
            uBreatheAmp2: { value: PARTICLE_CONFIG.animation.breatheAmplitude2 },
            uBreatheAmp3: { value: PARTICLE_CONFIG.animation.breatheAmplitude3 },
            uSwayFreq: { value: PARTICLE_CONFIG.animation.swayFrequency },
            uSwayAmp: { value: PARTICLE_CONFIG.animation.swayAmplitude },
            uGlobalAlpha: { value: 0.0 },
            // Dual-layer particle system uniforms
            uDissipateOnly: { value: PARTICLE_CONFIG.dissipation.dissipateOnly ? 1.0 : 0.0 },
            uCoreLayerRatio: { value: PARTICLE_CONFIG.dissipation.coreLayerRatio },
            uIsEntrance: { value: 0.0 }, // Set dynamically based on landingPhase
            // Dissipation animation uniforms (synchronized with MagicDust)
            uProgressMultiplier: { value: PARTICLE_CONFIG.dissipation.progressMultiplier },
            uNoiseInfluence: { value: PARTICLE_CONFIG.dissipation.noiseInfluence },
            uHeightInfluence: { value: PARTICLE_CONFIG.dissipation.heightInfluence },
            uUpForce: { value: PARTICLE_CONFIG.dissipation.upForce },
            uDriftAmplitude: { value: PARTICLE_CONFIG.dissipation.driftAmplitude },
            uGrowPeakProgress: { value: PARTICLE_CONFIG.dissipation.growPeakProgress },
            uGrowAmount: { value: PARTICLE_CONFIG.dissipation.growAmount },
            uShrinkAmount: { value: PARTICLE_CONFIG.dissipation.shrinkAmount },
            uFadeStart: { value: PARTICLE_CONFIG.dissipation.fadeStart },
            uFadeEnd: { value: PARTICLE_CONFIG.dissipation.fadeEnd },
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
        particleTexture,
        PARTICLE_CONFIG.rendering.entity.brightness,
      );
      entityMaterialRef.current.depthWrite = true;

      // Ornament fallback material removed


      // Gift material fallback removed

      treeBaseMaterialRef.current = createFallbackShaderMaterial(
        0.5,
        null,
        1.0,
      );
      treeBaseMaterialRef.current.blending = THREE.AdditiveBlending;

      // Mark materials as ready even in fallback
      setMaterialsReady(true);
    }

    // Cleanup
    return () => {
      setMaterialsReady(false);
      setMaterialsReady(false);
      entityMaterialRef.current?.dispose();
      treeBaseMaterialRef.current?.dispose();
    };
  }, [treeColor, particleTexture]);

  // === UPDATE TARGET PROGRESS & START TIME ===
  const prevIsExplodedRef = useRef(isExploded);

  useEffect(() => {
    // Detect explosion start: transition from tree (false) to photo sea (true)
    if (isExploded && !prevIsExplodedRef.current) {
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Starting explosion animation (morphing-out)');
      useStore.getState().setTreeMorphState('morphing-out');
    }
    // Detect reset: transition from photo sea (true) back to tree (false)
    if (!isExploded && prevIsExplodedRef.current) {
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Starting reset animation (morphing-in)');
      useStore.getState().setTreeMorphState('morphing-in');
    }

    prevIsExplodedRef.current = isExploded;
  }, [isExploded]);

  // === UPDATE TREE PARTICLE COUNT ===
  useEffect(() => {
    const totalCount =
      entityLayerData.count +
      ornamentData.count +
      giftData.count +
      treeBaseData.count;

    useStore.getState().setTreeParticleCount(totalCount);
  }, [
    entityLayerData.count,
    ornamentData.count,
    giftData.count,
    treeBaseData.count
  ]);

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
      // ornament/gift materials removed
    ];

    materials.forEach(mat => {
      if (mat && mat.uniforms) {
        if (mat.uniforms.uBreatheAmp1) mat.uniforms.uBreatheAmp1.value = amp1;
        if (mat.uniforms.uBreatheAmp2) mat.uniforms.uBreatheAmp2.value = amp2;
        if (mat.uniforms.uBreatheAmp3) mat.uniforms.uBreatheAmp3.value = amp3;
      }
    });

    if (PARTICLE_CONFIG.performance.enableDebugLogs) {
      console.log('[TreeParticles] Breathing Animation:', enableBreathing ? 'ENABLED' : 'DISABLED');
    }

  }, [
    PARTICLE_CONFIG.animation.enableBreathing,
    PARTICLE_CONFIG.animation.breatheAmplitude1,
    PARTICLE_CONFIG.animation.breatheAmplitude2,
    PARTICLE_CONFIG.animation.breatheAmplitude3
  ]);

  // Track previous phase to detect transitions
  const prevPhaseRef = useRef(landingPhase);

  // Track animation completion to avoid re-triggering
  const animationCompletionFlags = useRef({
    entranceComplete: false,
    explosionComplete: false,
    resetComplete: false
  });

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const delta = state.clock.getDelta();

    // === ENTRANCE ANIMATION: Detect phase change to 'morphing' ===
    if (landingPhase === 'morphing' && prevPhaseRef.current !== 'morphing') {
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Entrance animation started (morphing phase)');
      progressRef.current = 0.61; // Start from exploded state
      targetProgressRef.current = 0.0; // Target is tree form
      animationCompletionFlags.current.entranceComplete = false;
      useStore.getState().setTreeMorphState('morphing-in');
    }
    prevPhaseRef.current = landingPhase;

    // === DETERMINE TARGET PROGRESS ===
    // Only update target if NOT in entrance morphing phase (which sets its own target)
    if (landingPhase !== 'morphing') {
      targetProgressRef.current = isExploded ? 1.0 : 0.0;
    }

    // === SELECT DAMPING SPEED ===
    let dampingSpeed;
    if (landingPhase === 'morphing') {
      // Entrance animation
      dampingSpeed = PARTICLE_CONFIG.animation.dampingSpeedEntrance;
    } else {
      // Tree <-> Photo Sea transitions
      dampingSpeed = isExploded
        ? PARTICLE_CONFIG.animation.dampingSpeedExplosion
        : PARTICLE_CONFIG.animation.dampingSpeedReset;
    }

    // === INTERPOLATE PROGRESS ===
    const diff = targetProgressRef.current - progressRef.current;

    // Performance Fix: Make interpolation frame-rate independent
    // Original: progressRef.current += diff * dampingSpeed;
    // New: Use exponential decay with delta
    // Using a base adjustment to keep desktop feeling similar (dampingSpeed * 60)
    const lerpFactor = 1 - Math.exp(-dampingSpeed * 60 * delta);
    progressRef.current += diff * Math.min(lerpFactor, 1.0);

    // === CHECK ANIMATION COMPLETION ===
    // Use relaxed thresholds and OR logic for faster detection
    const diffThreshold = 0.01; // More lenient than 0.005
    const progressNearTarget = Math.abs(diff) < diffThreshold;
    const currentMorphState = useStore.getState().treeMorphState;

    // === ENTRANCE ANIMATION COMPLETION (morphing-in during entrance) ===
    // Complete when: progress is close to 0 OR diff is very small
    if (
      landingPhase === 'morphing' &&
      !animationCompletionFlags.current.entranceComplete &&
      (progressNearTarget || progressRef.current < 0.1)
    ) {
      animationCompletionFlags.current.entranceComplete = true;
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Entrance animation complete, transitioning to tree phase');
      useStore.getState().setLandingPhase('tree');
      useStore.getState().setTreeMorphState('idle');
    }

    // === EXPLOSION ANIMATION COMPLETION (morphing-out) ===
    // Complete when: progress is close to 1.0 OR diff is very small
    if (
      isExploded &&
      currentMorphState === 'morphing-out' &&
      !animationCompletionFlags.current.explosionComplete &&
      (progressNearTarget || progressRef.current > 0.8)
    ) {
      animationCompletionFlags.current.explosionComplete = true;
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Explosion animation complete, setting to idle');
      useStore.getState().setTreeMorphState('idle');
    }

    // Reset explosion completion flag when starting new explosion
    if (currentMorphState === 'morphing-out' && animationCompletionFlags.current.explosionComplete === false) {
      // Already reset, do nothing
    } else if (currentMorphState !== 'morphing-out' && animationCompletionFlags.current.explosionComplete === true) {
      // Reset flag when leaving morphing-out state
      animationCompletionFlags.current.explosionComplete = false;
    }

    // === RESET ANIMATION COMPLETION ===
    if (
      !isExploded &&
      landingPhase === 'tree' &&
      currentMorphState === 'morphing-in' &&
      !animationCompletionFlags.current.resetComplete &&
      (progressNearTarget || progressRef.current < 0.1)
    ) {
      animationCompletionFlags.current.resetComplete = true;
      if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Reset animation complete, setting to idle');
      useStore.getState().setTreeMorphState('idle');
    }

    // === MOBILE OPTIMIZATION: Throttled Photo Activation ===
    // If it's mobile and we just started exploding, we can use this loop to 
    // potentially signal PhotoManager to stagger its work, but PhotoManagerOptimized 
    // already has some visibility logic. Let's ensure it's effective.

    // Reset reset completion flag when starting new reset
    if (currentMorphState === 'morphing-in' && landingPhase === 'tree' && animationCompletionFlags.current.resetComplete === false) {
      // Already reset, do nothing
    } else if ((currentMorphState !== 'morphing-in' || landingPhase !== 'tree') && animationCompletionFlags.current.resetComplete === true) {
      // Reset flag when leaving morphing-in state
      animationCompletionFlags.current.resetComplete = false;
    }

    // Update progress in store for debug monitoring (throttled for performance)
    const currentProgress = progressRef.current;
    if (Math.abs(useStore.getState().treeProgress - currentProgress) > 0.01) {
      useStore.getState().setTreeProgress(currentProgress);
    }

    // Update all shader materials with new uniform values
    const materials = [
      entityMaterialRef.current,
      treeBaseMaterialRef.current,
    ];

    // Mobile optimization: Skip non-critical updates during explosion peak
    const isMobile = viewport.width < 10;
    const explosionJustStarted = isExploded && currentMorphState === 'morphing-out' && progressRef.current < 0.3;
    const shouldSkipUpdates = isMobile && explosionJustStarted;

    if (!shouldSkipUpdates) {
      materials.forEach((mat) => {
        if (mat && mat instanceof THREE.ShaderMaterial && mat.uniforms) {
          mat.uniforms.uProgress.value = progressRef.current;
          mat.uniforms.uTime.value = time;
          if (mat.uniforms.uIsEntrance) {
            mat.uniforms.uIsEntrance.value = landingPhase === 'morphing' ? 1.0 : 0.0;
          }
          if (mat.uniforms.uGlobalAlpha) {
            mat.uniforms.uGlobalAlpha.value = 1.0;
          }
        }
      });

      // Rotation animation for visual appeal
      const rotSpeed = isExploded ? 0.0005 : config.rotationSpeed * 0.001;

      if (entityLayerRef.current) entityLayerRef.current.rotation.y += rotSpeed;
      if (imageOrnamentsRef.current) imageOrnamentsRef.current.rotation.y += rotSpeed;
    } else {
      // During peak: only update critical progress uniform
      materials.forEach((mat) => {
        if (mat && mat instanceof THREE.ShaderMaterial && mat.uniforms) {
          mat.uniforms.uProgress.value = progressRef.current;
        }
      });
    }

    // Ensure root position is reset
    if (rootRef.current && rootRef.current.position.lengthSq() > 0) {
      rootRef.current.position.set(0, 0, 0);
    }
  });

  const treeKey = 'tree - ' + particleCount + '-' + treeColor;

  // NEW: Custom Double-tap detection for mobile (onDoubleClick is unreliable on touch)
  const lastClickTimeRef = useRef(0);

  return (
    <group
      ref={rootRef}
      onClick={(e) => {
        e.stopPropagation();

        const now = Date.now();
        const diff = now - lastClickTimeRef.current;
        lastClickTimeRef.current = now;

        // Double-tap/Double-click detected (within 300ms)
        if (diff < 300) {
          if (isExploded) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] Double-tap detected - Restoring tree');
            onParticlesClick();
          }
          return;
        }

        // Single click logic
        if (!isExploded) {
          onParticlesClick();
        }
      }}
    >
      {materialsReady && (
        <>
          {/* === ENTITY LAYER (Normal Blending + Depth Write) === */}
          <points key={'entity - ' + treeKey} ref={entityLayerRef}>
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

          {/* Gift Boxes moved to independent GiftBoxes component for earlier rendering */}

          {/* Ornaments and pearls */}
          {/* Ornaments particles removed */}

          {/* Image Ornaments Group */}
          <group ref={imageOrnamentsRef}>
            {ornamentData.imageItems.map((item, i) => (
              <DissolvingImage
                key={i}
                url={ORNAMENT_IMAGE_MAP[item.type]!}
                position={item.position}
                scale={item.scale}
                rotation={[0, item.rotation + Math.PI / 2, 0]}
                progressRef={progressRef}
                erosionFactor={item.erosionFactor}
              />
            ))}
          </group>

          {/* Gift boxes */}
          {/* Gift boxes particles removed as requested */}
        </>
      )}

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
              textureReady={texturesLoaded && poolsInitialized} // Updated: Depend on pool readiness
              poolsReady={poolsInitialized} // NEW: Explicitly pass pool readiness
              instanceId={i}
              useExternalAnimation={true} // NEW: Enable external animation
              onRegisterAnimation={onRegisterAnimation} // NEW: Stable callback
            />
          );
        })}
      </group>

      {/* NEW: GPU Texture Warmup - Pre-upload textures to GPU during entrance animation */}
      {/* Start during morphing phase to ensure textures are GPU-ready before user can click */}
      {texturesLoaded && !isExploded && (landingPhase === 'morphing' || landingPhase === 'tree') && (
        <TextureWarmup
          textureUrls={photoData.urls}
          onWarmupComplete={() => {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[TreeParticles] GPU texture warmup complete');
          }}
          enabled={true}
          startDelay={landingPhase === 'morphing' ? 200 : 500} // Start faster during morphing
        />
      )}

      {/* Phase 2: PhotoManager - 根据配置切换原版/优化版 */}
      {PARTICLE_CONFIG.performance.useOptimizedPhotoManager ? (
        <PhotoManagerOptimized photos={photoAnimations} isExploded={isExploded} />
      ) : (
        <PhotoManager photos={photoAnimations} isExploded={isExploded} />
      )}
    </group>
  );
};
