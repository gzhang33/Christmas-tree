import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MagicDustProps {
  count?: number;
  isExploded?: boolean;
}

// === MAGIC PARTICLE SYSTEM SPECIFICATIONS ===
// Motion: Spiral ascent + turbulence perturbation
// Density: 800 particles/cubic meter
// Size range: 0.1~0.3 random
// Lifecycle: 3.5 seconds average
// Color gradient: Gold (#FFD700) → White (#FFFFFF)
// Flicker frequency: 2-5Hz random
// Trail effect: Motion residue (0.5 seconds)

// Sparkle star texture with enhanced glow
const createStarTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, 64, 64);

  // Central glow with HDR-like intensity
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.08, 'rgba(255, 250, 240, 0.95)');
  grad.addColorStop(0.2, 'rgba(255, 230, 200, 0.6)');
  grad.addColorStop(0.4, 'rgba(255, 200, 180, 0.25)');
  grad.addColorStop(0.7, 'rgba(255, 180, 200, 0.08)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 32, 0, Math.PI * 2);
  ctx.fill();

  // Four-point star flare
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(32, 2);
  ctx.lineTo(32, 62);
  ctx.moveTo(2, 32);
  ctx.lineTo(62, 32);
  ctx.stroke();

  // Diagonal flares (fainter)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(54, 54);
  ctx.moveTo(54, 10);
  ctx.lineTo(10, 54);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Trail texture for motion residue effect
const createTrailTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.3, 'rgba(255, 220, 200, 0.4)');
  grad.addColorStop(0.6, 'rgba(255, 200, 180, 0.15)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Color constants
const COLOR_GOLD = new THREE.Color('#FFD700');
const COLOR_WHITE = new THREE.Color('#FFFFFF');
const COLOR_PINK = new THREE.Color('#FFB6C1');
const COLOR_SILVER = new THREE.Color('#E8E8E8');

// Particle lifecycle data interface
interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  velocities: Float32Array;
  phases: Float32Array;
  lifetimes: Float32Array;
  ages: Float32Array;
  flickerFreqs: Float32Array;
  basePositions: Float32Array;
  count: number;
}

export const MagicDust: React.FC<MagicDustProps> = ({ count = 1200, isExploded = false }) => {
  const spiralRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);
  const floatingRef = useRef<THREE.Points>(null);

  const starTexture = useMemo(() => createStarTexture(), []);
  const trailTexture = useMemo(() => createTrailTexture(), []);

  // === SPIRAL MAGIC DUST with lifecycle ===
  const spiralData = useMemo((): ParticleData => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count);
    const phases = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);
    const flickerFreqs = new Float32Array(count);
    const basePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spiral distribution around tree
      const t = i / count;
      const y = -6 + t * 17;
      const spiralAngle = t * Math.PI * 10; // More spiral turns
      const baseRadius = 5.5 + Math.sin(t * Math.PI) * 2.5;
      const radiusVariation = (Math.random() - 0.5) * 2;

      const x = Math.cos(spiralAngle) * (baseRadius + radiusVariation);
      const z = Math.sin(spiralAngle) * (baseRadius + radiusVariation);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      // Initial color - start gold, will lerp to white
      const colorChoice = Math.random();
      let c: THREE.Color;
      if (colorChoice < 0.5) c = COLOR_GOLD.clone();
      else if (colorChoice < 0.8) c = COLOR_WHITE.clone();
      else if (colorChoice < 0.9) c = COLOR_PINK.clone();
      else c = COLOR_SILVER.clone();

      // HDR intensity boost
      const intensity = 1.5 + Math.random() * 1.0;
      colors[i * 3] = c.r * intensity;
      colors[i * 3 + 1] = c.g * intensity;
      colors[i * 3 + 2] = c.b * intensity;

      // Size range: 0.1~0.3 as per spec
      sizes[i] = 0.1 + Math.random() * 0.2;

      velocities[i] = 0.3 + Math.random() * 1.2;
      phases[i] = Math.random() * Math.PI * 2;

      // Lifecycle: 3.5 seconds average with variance
      lifetimes[i] = 2.5 + Math.random() * 2.0; // 2.5-4.5s range
      ages[i] = Math.random() * lifetimes[i]; // Stagger initial ages

      // Flicker frequency: 2-5Hz random
      flickerFreqs[i] = 2 + Math.random() * 3;
    }

    return { positions, colors, sizes, velocities, phases, lifetimes, ages, flickerFreqs, basePositions, count };
  }, [count]);

  // === TRAIL PARTICLES (motion residue) ===
  const trailData = useMemo(() => {
    const trailCount = Math.floor(count * 0.4);
    const trailLength = 3; // Number of trail points per particle
    const totalTrails = trailCount * trailLength;

    const positions = new Float32Array(totalTrails * 3);
    const colors = new Float32Array(totalTrails * 3);
    const sizes = new Float32Array(totalTrails);
    const parentIndices = new Float32Array(totalTrails);
    const trailOffsets = new Float32Array(totalTrails);

    for (let i = 0; i < trailCount; i++) {
      for (let t = 0; t < trailLength; t++) {
        const idx = i * trailLength + t;
        parentIndices[idx] = i;
        trailOffsets[idx] = t / trailLength; // 0, 0.33, 0.66

        // Initial positions (will be updated in animation)
        positions[idx * 3] = 0;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = 0;

        // Trail fades out
        const fade = 1 - (t / trailLength);
        colors[idx * 3] = COLOR_GOLD.r * fade * 1.2;
        colors[idx * 3 + 1] = COLOR_GOLD.g * fade * 1.2;
        colors[idx * 3 + 2] = COLOR_GOLD.b * fade * 1.2;

        sizes[idx] = 0.15 * fade;
      }
    }

    return { positions, colors, sizes, parentIndices, trailOffsets, count: totalTrails, trailLength };
  }, [count]);

  // === FLOATING FAIRY DUST ===
  const floatingData = useMemo(() => {
    const floatCount = Math.floor(count * 0.5);
    const positions = new Float32Array(floatCount * 3);
    const colors = new Float32Array(floatCount * 3);
    const sizes = new Float32Array(floatCount);
    const phases = new Float32Array(floatCount * 3);
    const flickerFreqs = new Float32Array(floatCount);

    for (let i = 0; i < floatCount; i++) {
      // Random distribution around tree
      const theta = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * 7;
      const y = -5 + Math.random() * 16;

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      // Color with intensity
      const c = Math.random() > 0.4 ? COLOR_WHITE : COLOR_PINK;
      const intensity = 1.4 + Math.random() * 0.6;
      colors[i * 3] = c.r * intensity;
      colors[i * 3 + 1] = c.g * intensity;
      colors[i * 3 + 2] = c.b * intensity;

      sizes[i] = 0.1 + Math.random() * 0.25;
      phases[i * 3] = Math.random() * Math.PI * 2;
      phases[i * 3 + 1] = Math.random() * Math.PI * 2;
      phases[i * 3 + 2] = 0.15 + Math.random() * 0.4; // Speed
      flickerFreqs[i] = 2 + Math.random() * 3;
    }

    return { positions, colors, sizes, phases, flickerFreqs, count: floatCount };
  }, [count]);

  // Position history for trail effect
  const positionHistory = useRef<Float32Array[]>([]);

  useEffect(() => {
    // Initialize position history for trail effect
    positionHistory.current = Array.from({ length: 4 }, () => 
      new Float32Array(spiralData.positions)
    );
  }, [spiralData.positions]);

  // === ANIMATION LOOP ===
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const deltaTime = 1 / 60; // Approximate delta

    // === SPIRAL PARTICLES ANIMATION ===
    if (spiralRef.current && !isExploded) {
      const pos = spiralRef.current.geometry.attributes.position.array as Float32Array;
      const cols = spiralRef.current.geometry.attributes.color.array as Float32Array;
      const sizesAttr = spiralRef.current.geometry.attributes.size.array as Float32Array;
      const basePos = spiralData.basePositions;

      for (let i = 0; i < spiralData.count; i++) {
        // Update age and check lifecycle
        spiralData.ages[i] += deltaTime;
        if (spiralData.ages[i] >= spiralData.lifetimes[i]) {
          // Respawn particle
          spiralData.ages[i] = 0;
          spiralData.phases[i] = Math.random() * Math.PI * 2;
        }

        const lifeRatio = spiralData.ages[i] / spiralData.lifetimes[i];
        const phase = spiralData.phases[i];
        const vel = spiralData.velocities[i];

        // Spiral ascent with turbulence
        const baseAngle = time * vel * 0.2 + phase;
        const bx = basePos[i * 3];
        const by = basePos[i * 3 + 1];
        const bz = basePos[i * 3 + 2];
        const r = Math.sqrt(bx * bx + bz * bz);

        // Add turbulence perturbation
        const turbulenceX = Math.sin(time * 1.5 + phase * 2) * 0.3;
        const turbulenceY = Math.sin(time * 0.8 + phase * 3) * 0.5;
        const turbulenceZ = Math.cos(time * 1.2 + phase) * 0.3;

        pos[i * 3] = Math.cos(baseAngle) * r + turbulenceX;
        pos[i * 3 + 1] = by + lifeRatio * 2 + turbulenceY; // Ascent with lifecycle
        pos[i * 3 + 2] = Math.sin(baseAngle) * r + turbulenceZ;

        // Color gradient: Gold → White over lifetime
        const goldToWhite = lifeRatio;
        const lerpedR = COLOR_GOLD.r + (COLOR_WHITE.r - COLOR_GOLD.r) * goldToWhite;
        const lerpedG = COLOR_GOLD.g + (COLOR_WHITE.g - COLOR_GOLD.g) * goldToWhite;
        const lerpedB = COLOR_GOLD.b + (COLOR_WHITE.b - COLOR_GOLD.b) * goldToWhite;

        // Flicker effect (2-5Hz)
        const flickerFreq = spiralData.flickerFreqs[i];
        const flicker = 0.6 + Math.sin(time * flickerFreq * Math.PI * 2 + phase) * 0.4;

        // Fade out at end of life
        const fadeOut = lifeRatio > 0.8 ? 1 - (lifeRatio - 0.8) / 0.2 : 1;
        const intensity = (1.5 + Math.random() * 0.3) * flicker * fadeOut;

        cols[i * 3] = lerpedR * intensity;
        cols[i * 3 + 1] = lerpedG * intensity;
        cols[i * 3 + 2] = lerpedB * intensity;

        // Size pulsation
        sizesAttr[i] = (0.1 + Math.random() * 0.15) * (0.8 + flicker * 0.4) * fadeOut;
      }

      spiralRef.current.geometry.attributes.position.needsUpdate = true;
      spiralRef.current.geometry.attributes.color.needsUpdate = true;
      spiralRef.current.geometry.attributes.size.needsUpdate = true;
      spiralRef.current.rotation.y += 0.003;

      // Update position history for trails
      if (positionHistory.current.length > 0) {
        positionHistory.current.pop();
        positionHistory.current.unshift(new Float32Array(pos));
      }
    }

    // === TRAIL PARTICLES ANIMATION ===
    if (trailRef.current && !isExploded && positionHistory.current.length >= 3) {
      const trailPos = trailRef.current.geometry.attributes.position.array as Float32Array;
      const trailCols = trailRef.current.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < trailData.count; i++) {
        const parentIdx = Math.floor(trailData.parentIndices[i]);
        const offset = trailData.trailOffsets[i];
        const historyIdx = Math.min(Math.floor(offset * 3) + 1, positionHistory.current.length - 1);

        if (parentIdx < spiralData.count && positionHistory.current[historyIdx]) {
          const histPos = positionHistory.current[historyIdx];
          trailPos[i * 3] = histPos[parentIdx * 3];
          trailPos[i * 3 + 1] = histPos[parentIdx * 3 + 1];
          trailPos[i * 3 + 2] = histPos[parentIdx * 3 + 2];

          // Fade trail based on offset
          const fade = (1 - offset) * 0.6;
          trailCols[i * 3] = COLOR_GOLD.r * fade;
          trailCols[i * 3 + 1] = COLOR_GOLD.g * fade;
          trailCols[i * 3 + 2] = COLOR_GOLD.b * fade;
        }
      }

      trailRef.current.geometry.attributes.position.needsUpdate = true;
      trailRef.current.geometry.attributes.color.needsUpdate = true;
      trailRef.current.rotation.y += 0.003;
    }

    // === FLOATING PARTICLES ANIMATION ===
    if (floatingRef.current && !isExploded) {
      const pos = floatingRef.current.geometry.attributes.position.array as Float32Array;
      const cols = floatingRef.current.geometry.attributes.color.array as Float32Array;
      const basePos = floatingData.positions;
      const phases = floatingData.phases;

      for (let i = 0; i < floatingData.count; i++) {
        const px = phases[i * 3];
        const py = phases[i * 3 + 1];
        const speed = phases[i * 3 + 2];

        // Floating motion with gentle oscillation
        pos[i * 3] = basePos[i * 3] + Math.sin(time * speed + px) * 0.6;
        pos[i * 3 + 1] = basePos[i * 3 + 1] + Math.sin(time * speed * 0.7 + py) * 0.9;
        pos[i * 3 + 2] = basePos[i * 3 + 2] + Math.cos(time * speed + px) * 0.6;

        // Flicker effect
        const flickerFreq = floatingData.flickerFreqs[i];
        const flicker = 0.65 + Math.sin(time * flickerFreq * Math.PI * 2 + px) * 0.35;

        cols[i * 3] = floatingData.colors[i * 3] * flicker;
        cols[i * 3 + 1] = floatingData.colors[i * 3 + 1] * flicker;
        cols[i * 3 + 2] = floatingData.colors[i * 3 + 2] * flicker;
      }

      floatingRef.current.geometry.attributes.position.needsUpdate = true;
      floatingRef.current.geometry.attributes.color.needsUpdate = true;
      floatingRef.current.rotation.y += 0.0015;
    }
  });

  if (isExploded) return null;

  return (
    <group>
      {/* Spiral magic dust with lifecycle */}
      <points ref={spiralRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={spiralData.count}
            array={spiralData.positions.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={spiralData.count}
            array={spiralData.colors.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={spiralData.count}
            array={spiralData.sizes.slice()}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={starTexture}
          alphaMap={starTexture}
          transparent
          opacity={0.95}
          depthWrite={false}
          size={0.5}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Trail particles (motion residue) */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={trailData.count}
            array={trailData.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={trailData.count}
            array={trailData.colors.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={trailData.count}
            array={trailData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={trailTexture}
          alphaMap={trailTexture}
          transparent
          opacity={0.7}
          depthWrite={false}
          size={0.3}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Floating fairy particles */}
      <points ref={floatingRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={floatingData.count}
            array={floatingData.positions.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={floatingData.count}
            array={floatingData.colors.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={floatingData.count}
            array={floatingData.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={starTexture}
          alphaMap={starTexture}
          transparent
          opacity={0.9}
          depthWrite={false}
          size={0.4}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
