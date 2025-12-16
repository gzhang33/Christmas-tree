import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_CONFIG, TREE_SHAPE_CONFIG } from '../../config/particles';
import { useStore } from '../../store/useStore';
import { calculateErosionFactor } from '../../utils/treeUtils';
import magicDustVertexShader from '../../shaders/magicDust.vert?raw';
import magicDustFragmentShader from '../../shaders/magicDust.frag?raw';
import { useTexture } from '@react-three/drei';

interface MagicDustProps {
  count?: number;
  // Note: isExploded is now read directly from store for synchronization with TreeParticles
}

export const MagicDust: React.FC<MagicDustProps> = ({ count }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const meteorTexture = useTexture('/textures/sparkle.png');

  // Get dynamic color from store
  const magicDustColor = useStore((state) => state.magicDustColor);

  // Get global particle count from store for ratio-based calculation
  const particleCount = useStore((state) => state.particleCount);

  // Calculate count based on global particle budget and configured ratio
  // If count prop is provided, use it; otherwise calculate from ratio
  const baseCount = count ?? Math.floor(
    Math.max(
      particleCount * PARTICLE_CONFIG.ratios.magicDust,
      PARTICLE_CONFIG.minCounts.magicDust,
    )
  );

  // Read isExploded directly from store for perfect synchronization with TreeParticles
  const isExploded = useStore((state) => state.isExploded);

  // Destructure config for precise dependency tracking
  const {
    ascentSpeed: configAscentSpeed,
    radiusVariation: configRadiusVariation,
    angleVariation: configAngleVariation,
    // minSize & maxSize usage reverted to magicDust object until config refactor is complete
    spiralTurns: configSpiralTurns,
    radiusOffset: configRadiusOffset
  } = PARTICLE_CONFIG.magicDust;

  const { treeHeight, treeBottomY } = PARTICLE_CONFIG;

  // Dissipation config for synchronized animation with TreeParticles
  const {
    progressMultiplier: configProgressMultiplier,
    noiseInfluence: configNoiseInfluence,
    heightInfluence: configHeightInfluence,
    upForce: configUpForce,
    driftAmplitude: configDriftAmplitude,
    growPeakProgress: configGrowPeakProgress,
    growAmount: configGrowAmount,
    shrinkAmount: configShrinkAmount,
    fadeStart: configFadeStart,
    fadeEnd: configFadeEnd,
  } = PARTICLE_CONFIG.dissipation;

  // Get landing phase for synchronized entrance animation
  const landingPhase = useStore((state) => state.landingPhase);

  // Animation state for smooth transitions
  // Start exploded (1.2) if we are in morphing phase (Entrance) to sync with tree
  const isEntrance = landingPhase === 'morphing';
  const progressRef = useRef(isEntrance ? 1.2 : 0.0);

  const targetProgressRef = useRef(0.0);

  // Generate color variations from the selected color
  const colors = useMemo(() => {
    const baseColor = new THREE.Color(magicDustColor);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    // Create 3 variations: lighter, base, darker
    return [
      new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.8, 1), Math.min(hsl.l + 0.2, 0.95)), // Lighter
      baseColor.clone(), // Base
      new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 1.2, 1), Math.max(hsl.l - 0.1, 0.2)), // Darker
    ];
  }, [magicDustColor]);

  // Increase particle count to account for trails which are now just more particles
  const totalParticles = baseCount * 6; // *6 for trail density

  // Note: calculateErosionFactor is imported from treeUtils for consistency with TreeParticles

  const data = useMemo(() => {
    const positions = new Float32Array(totalParticles * 3); // Dummy positions, shader does layout
    const spiralT = new Float32Array(totalParticles);
    const ascentSpeed = new Float32Array(totalParticles);
    const radiusOffset = new Float32Array(totalParticles);
    const angleOffset = new Float32Array(totalParticles);
    const flickerPhase = new Float32Array(totalParticles);
    const colorsArray = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    // NEW attributes for dissipation
    const erosionFactors = new Float32Array(totalParticles);
    const randoms = new Float32Array(totalParticles);

    for (let i = 0; i < totalParticles; i++) {
      // Distribute along the spiral
      const t = Math.random();
      spiralT[i] = t;

      // Variable ascent speed for organic flow
      ascentSpeed[i] = configAscentSpeed * (0.8 + Math.random() * 0.4);

      // Radius variation - slight band
      radiusOffset[i] = (Math.random() - 0.5) * configRadiusVariation;

      // Angle variation - spread around ribbon
      angleOffset[i] = (Math.random() - 0.5) * configAngleVariation;

      flickerPhase[i] = Math.random() * Math.PI * 2;
      randoms[i] = Math.random();

      // Color Logic - safely access array indices to prevent out-of-bounds errors
      const colorChoice = Math.random();
      let c: THREE.Color;
      // Simple weighted choice based on index with bounds checking
      if (colorChoice < 0.3) c = colors[0] ?? colors[colors.length - 1];
      else if (colorChoice < 0.7) c = colors[1] ?? colors[colors.length - 1];
      else c = colors[2] ?? colors[colors.length - 1];

      colorsArray[i * 3] = c.r;
      colorsArray[i * 3 + 1] = c.g;
      colorsArray[i * 3 + 2] = c.b;

      // Size variation
      const minS = PARTICLE_CONFIG.magicDust.minSize;
      const maxS = PARTICLE_CONFIG.magicDust.maxSize;
      sizes[i] = minS + Math.random() * (maxS - minS);

      // Calculate approximate Y for erosion factor
      // Note: Actual Y is dynamic in shader, but we estimate based on spiralT
      // spiralT=0 -> Top? Or Bottom?
      // In shader: y = topY - currentT * treeHeight
      // So currentT approx ~ t (if we ignore time for initial state)
      // t=0 (Top) -> y = topY
      // t=1 (Bottom) -> y = treeBottomY
      const topY = treeBottomY + treeHeight;
      const estimatedY = topY - t * treeHeight;
      erosionFactors[i] = calculateErosionFactor(estimatedY);
    }

    return {
      positions,
      spiralT,
      ascentSpeed,
      radiusOffset,
      angleOffset,
      flickerPhase,
      colors: colorsArray,
      sizes,
      erosionFactors,
      randoms
    };
  }, [totalParticles, colors, configAscentSpeed, configRadiusVariation, configAngleVariation, PARTICLE_CONFIG.magicDust.minSize, PARTICLE_CONFIG.magicDust.maxSize, treeHeight, treeBottomY]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 }, // Animation progress
    uMap: { value: meteorTexture },
    uTreeHeight: { value: treeHeight },
    uTreeBottomY: { value: treeBottomY },
    uSpiralTurns: { value: configSpiralTurns },
    uRadiusOffset: { value: configRadiusOffset },
    // Tree shape parameters (from TREE_SHAPE_CONFIG in treeUtils)
    uMaxRadius: { value: TREE_SHAPE_CONFIG.maxRadius },
    uRadiusScale: { value: TREE_SHAPE_CONFIG.radiusScale },
    uMinRadius: { value: TREE_SHAPE_CONFIG.minRadius },
    // Dissipation animation parameters (synchronized with TreeParticles)
    uProgressMultiplier: { value: configProgressMultiplier },
    uNoiseInfluence: { value: configNoiseInfluence },
    uHeightInfluence: { value: configHeightInfluence },
    uUpForce: { value: configUpForce },
    uDriftAmplitude: { value: configDriftAmplitude },
    uGrowPeakProgress: { value: configGrowPeakProgress },
    uGrowAmount: { value: configGrowAmount },
    uShrinkAmount: { value: configShrinkAmount },
    uFadeStart: { value: configFadeStart },
    uFadeEnd: { value: configFadeEnd },
  }), [
    meteorTexture, treeHeight, treeBottomY, configSpiralTurns, configRadiusOffset,
    configProgressMultiplier, configNoiseInfluence, configHeightInfluence,
    configUpForce, configDriftAmplitude, configGrowPeakProgress,
    configGrowAmount, configShrinkAmount, configFadeStart, configFadeEnd
  ]);

  // Explicitly update uniforms when config changes
  useEffect(() => {
    if (materialRef.current) {
      // Tree shape parameters
      materialRef.current.uniforms.uTreeHeight.value = treeHeight;
      materialRef.current.uniforms.uTreeBottomY.value = treeBottomY;
      materialRef.current.uniforms.uSpiralTurns.value = configSpiralTurns;
      materialRef.current.uniforms.uRadiusOffset.value = configRadiusOffset;
      // Dissipation animation parameters (synchronized with TreeParticles)
      materialRef.current.uniforms.uProgressMultiplier.value = configProgressMultiplier;
      materialRef.current.uniforms.uNoiseInfluence.value = configNoiseInfluence;
      materialRef.current.uniforms.uHeightInfluence.value = configHeightInfluence;
      materialRef.current.uniforms.uUpForce.value = configUpForce;
      materialRef.current.uniforms.uDriftAmplitude.value = configDriftAmplitude;
      materialRef.current.uniforms.uGrowPeakProgress.value = configGrowPeakProgress;
      materialRef.current.uniforms.uGrowAmount.value = configGrowAmount;
      materialRef.current.uniforms.uShrinkAmount.value = configShrinkAmount;
      materialRef.current.uniforms.uFadeStart.value = configFadeStart;
      materialRef.current.uniforms.uFadeEnd.value = configFadeEnd;
    }
  }, [
    treeHeight, treeBottomY, configSpiralTurns, configRadiusOffset,
    configProgressMultiplier, configNoiseInfluence, configHeightInfluence,
    configUpForce, configDriftAmplitude, configGrowPeakProgress,
    configGrowAmount, configShrinkAmount, configFadeStart, configFadeEnd
  ]);

  // Update color buffer when magicDustColor changes (avoid full remount)
  useEffect(() => {
    if (geometryRef.current) {
      const geometry = geometryRef.current;
      const colorAttribute = geometry.getAttribute('aColor') as THREE.BufferAttribute;

      if (colorAttribute) {
        const colorsArray = colorAttribute.array as Float32Array;

        // Regenerate color variations from new color
        const baseColor = new THREE.Color(magicDustColor);
        const hsl = { h: 0, s: 0, l: 0 };
        baseColor.getHSL(hsl);

        const newColors = [
          new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.8, 1), Math.min(hsl.l + 0.2, 0.95)),
          baseColor.clone(),
          new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 1.2, 1), Math.max(hsl.l - 0.1, 0.2)),
        ];

        // Update each particle's color
        for (let i = 0; i < totalParticles; i++) {
          const colorChoice = Math.random();
          let c: THREE.Color;
          if (colorChoice < 0.3) c = newColors[0] ?? newColors[newColors.length - 1];
          else if (colorChoice < 0.7) c = newColors[1] ?? newColors[newColors.length - 1];
          else c = newColors[2] ?? newColors[newColors.length - 1];

          colorsArray[i * 3] = c.r;
          colorsArray[i * 3 + 1] = c.g;
          colorsArray[i * 3 + 2] = c.b;
        }

        // Mark buffer for update
        colorAttribute.needsUpdate = true;
      }
    }
  }, [magicDustColor, totalParticles]);

  // Track previous phase to detect transitions
  const prevPhaseRef = useRef(landingPhase);

  // Animation Loop - STRICTLY SYNCED with TreeParticles
  useFrame((state) => {
    const delta = state.clock.getDelta(); // Although we don't use delta for damping yet (per original design), we might need it later.

    // Detect phase change to 'morphing' and reset progress instantly
    if (landingPhase === 'morphing' && prevPhaseRef.current !== 'morphing') {
      progressRef.current = 1.2;
    }
    prevPhaseRef.current = landingPhase;

    // 1. Interpolate Progress based on isExploded state
    // Determine target: 1.0 if exploded, 0.0 if reset (implode to tree)
    targetProgressRef.current = isExploded ? 1.0 : 0.0;
    // Select damping speed based on phase
    let dampingSpeed;
    if (landingPhase === 'morphing') {
      dampingSpeed = PARTICLE_CONFIG.animation.dampingSpeedEntrance;
    } else {
      dampingSpeed = isExploded
        ? PARTICLE_CONFIG.animation.dampingSpeedExplosion
        : PARTICLE_CONFIG.animation.dampingSpeedReset;
    }

    const diff = targetProgressRef.current - progressRef.current;
    progressRef.current += diff * dampingSpeed;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progressRef.current;
    }
  });

  return (
    <points key={`magic-dust-${totalParticles}`}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          count={totalParticles}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSpiralT"
          count={totalParticles}
          array={data.spiralT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aAscentSpeed"
          count={totalParticles}
          array={data.ascentSpeed}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRadiusOffset"
          count={totalParticles}
          array={data.radiusOffset}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aAngleOffset"
          count={totalParticles}
          array={data.angleOffset}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aFlickerPhase"
          count={totalParticles}
          array={data.flickerPhase}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={totalParticles}
          array={data.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={totalParticles}
          array={data.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aErosionFactor"
          count={totalParticles}
          array={data.erosionFactors}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={totalParticles}
          array={data.randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={magicDustVertexShader}
        fragmentShader={magicDustFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
