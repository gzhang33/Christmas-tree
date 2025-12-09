import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PARTICLE_CONFIG } from '../../config/particles';
import magicDustVertexShader from '../../shaders/magicDust.vert?raw';
import magicDustFragmentShader from '../../shaders/magicDust.frag?raw';

interface MagicDustProps {
  count?: number;
  isExploded?: boolean;
}

// Meteor texture with comet-like glow
const createMeteorTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 64, 64);

  // Bright core with warm glow
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.1, 'rgba(255, 240, 200, 0.95)');
  grad.addColorStop(0.25, 'rgba(255, 215, 0, 0.7)');
  grad.addColorStop(0.5, 'rgba(255, 180, 100, 0.3)');
  grad.addColorStop(0.75, 'rgba(255, 150, 80, 0.1)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  // Small sparkle cross
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 20);
  ctx.lineTo(32, 44);
  ctx.moveTo(20, 32);
  ctx.lineTo(44, 32);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

export const MagicDust: React.FC<MagicDustProps> = ({ count = 600, isExploded = false }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meteorTexture = useMemo(() => createMeteorTexture(), []);

  // Destructure config for precise dependency tracking
  const {
    colors: configColors,
    ascentSpeed: configAscentSpeed,
    radiusVariation: configRadiusVariation,
    angleVariation: configAngleVariation,
    minSize: configMinSize,
    maxSize: configMaxSize,
    spiralTurns: configSpiralTurns,
    radiusOffset: configRadiusOffset
  } = PARTICLE_CONFIG.magicDust;

  const { treeHeight, treeBottomY } = PARTICLE_CONFIG;

  // Animation state for smooth transitions
  const progressRef = useRef(0.0);
  const targetProgressRef = useRef(0.0);

  // NEW: Pre-compute color objects from config to avoid recreation
  // Ensure at least 3 colors are available, pad with default gold if necessary
  const colors = useMemo(() => {
    const parsedColors = configColors.map(c => new THREE.Color(c));
    const defaultColor = new THREE.Color(0xffd700); // 金色作为默认回退颜色

    // 补充至少 3 种颜色以防止索引越界
    while (parsedColors.length < 3) {
      console.warn(`[MagicDust] 配置颜色不足 3 种（当前 ${parsedColors.length}），使用默认金色填充`);
      parsedColors.push(defaultColor.clone());
    }

    return parsedColors;
  }, [configColors]);

  // Increase particle count to account for trails which are now just more particles
  const totalParticles = count * 6; // *6 for trail density

  // Helper for erosion (Dissipation logic)
  const calculateErosionFactor = (yPosition: number): number => {
    const treeTopY = treeBottomY + treeHeight;
    const erosionRange = treeHeight + Math.abs(treeBottomY);
    const factor = (treeTopY - yPosition) / erosionRange;
    return Math.max(0, Math.min(1, factor)); // Clamp to [0,1]
  };

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

      // Color Logic - 使用安全的索引访问，防止数组越界
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
      const minS = configMinSize;
      const maxS = configMaxSize;
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
  }, [totalParticles, colors, configAscentSpeed, configRadiusVariation, configAngleVariation, configMinSize, configMaxSize, treeHeight, treeBottomY]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 }, // Animation progress
    uMap: { value: meteorTexture },
    uTreeHeight: { value: treeHeight },
    uTreeBottomY: { value: treeBottomY },
    uSpiralTurns: { value: configSpiralTurns },
    uRadiusOffset: { value: configRadiusOffset },
  }), [meteorTexture, treeHeight, treeBottomY, configSpiralTurns, configRadiusOffset]);

  // Explicitly update uniforms when config changes
  useEffect(() => {
    if (materialRef.current) {
      console.log('[MagicDust] Updating Config:', {
        radiusOffset: configRadiusOffset,
        spiralTurns: configSpiralTurns,
      });
      materialRef.current.uniforms.uTreeHeight.value = treeHeight;
      materialRef.current.uniforms.uTreeBottomY.value = treeBottomY;
      materialRef.current.uniforms.uSpiralTurns.value = configSpiralTurns;
      materialRef.current.uniforms.uRadiusOffset.value = configRadiusOffset;
    }
  }, [treeHeight, treeBottomY, configSpiralTurns, configRadiusOffset]);

  // Animation Loop - STRICTLY SYNCED with TreeParticles
  useFrame((state) => {
    // 1. Interpolate Progress based on isExploded prop
    // Logic must match TreeParticles.tsx exactly to prevent de-sync
    targetProgressRef.current = isExploded ? 1.0 : 0.0;

    const dampingSpeed = isExploded
      ? PARTICLE_CONFIG.animation.dampingSpeedExplosion
      : PARTICLE_CONFIG.animation.dampingSpeedReset;

    const diff = targetProgressRef.current - progressRef.current;
    progressRef.current += diff * dampingSpeed;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uProgress.value = progressRef.current;
    }
  });

  // Force remount when colors change
  return (
    <points key={JSON.stringify(configColors)}>
      <bufferGeometry>
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
