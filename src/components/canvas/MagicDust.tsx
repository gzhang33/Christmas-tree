import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MagicDustProps {
  count?: number;
  isExploded?: boolean;
}

// === METEOR PARTICLE SYSTEM ===
// Motion: Tightly follow the spiral halo (pearl string) around tree
// Speed: Slow rotation with gradual upward ascent
// Effect: Meteor/dust particles orbiting like gravity-bound objects

// === TREE & SPIRAL GEOMETRY (matching pearl string in TreeParticles) ===
const TREE_BOTTOM_Y = -5.5;
const TREE_TOP_Y = 7.5;
const TREE_HEIGHT = 13; // From 7.5 to -5.5
const SPIRAL_TURNS = 8; // Number of spiral turns (matches pearl string: PI * 16 = 8 turns)

// Calculate spiral position at parameter t (0 to 1)
// This matches the pearl string spiral in TreeParticles.tsx
const getSpiralPosition = (t: number, radiusOffset: number = 0): [number, number, number] => {
  // Y position: from top (7.5) to bottom (-5.5)
  const y = TREE_TOP_Y - t * TREE_HEIGHT;
  
  // Angle: 8 complete turns from top to bottom
  const theta = t * Math.PI * 2 * SPIRAL_TURNS;
  
  // Radius: follows tree cone profile (wider at bottom)
  // baseR = (1 - (y + 5.5) / 14) * 5.2 + 0.3
  const heightRatio = (y - TREE_BOTTOM_Y) / (TREE_TOP_Y - TREE_BOTTOM_Y);
  const baseR = (1 - heightRatio) * 5.2 + 0.3;
  
  // Add small offset to stay close to (but not overlap) the pearl string
  const r = baseR + 0.15 + radiusOffset;
  
  const x = Math.cos(theta) * r;
  const z = Math.sin(theta) * r;
  
  return [x, y, z];
};

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

// Trail texture
const createTrailTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
  grad.addColorStop(0.3, 'rgba(255, 180, 100, 0.5)');
  grad.addColorStop(0.6, 'rgba(255, 150, 80, 0.2)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

// Color palette
const COLOR_GOLD = new THREE.Color('#FFD700');
const COLOR_ORANGE = new THREE.Color('#FFA500');
const COLOR_WHITE = new THREE.Color('#FFFAF0');
const COLOR_AMBER = new THREE.Color('#FFBF00');

export const MagicDust: React.FC<MagicDustProps> = ({ count = 600, isExploded = false }) => {
  const meteorRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.Points>(null);

  const meteorTexture = useMemo(() => createMeteorTexture(), []);
  const trailTexture = useMemo(() => createTrailTexture(), []);

  // === METEOR PARTICLES DATA ===
  // Each meteor follows the spiral path, ascending slowly
  const meteorData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    // Spiral parameters
    const spiralT = new Float32Array(count);        // Position along spiral (0-1)
    const ascentSpeed = new Float32Array(count);    // How fast it climbs
    const radiusOffset = new Float32Array(count);   // Small offset from spiral center
    const angleOffset = new Float32Array(count);    // Angular offset for spread
    const rotationSpeed = new Float32Array(count);  // Independent rotation speed (radians/sec)
    const flickerPhase = new Float32Array(count);   // For twinkling
    const baseColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute meteors along the spiral
      spiralT[i] = Math.random();
      
      // Faster ascent for more visible upward movement: ~10-20 seconds per spiral
      ascentSpeed[i] = 0.03 + Math.random() * 0.04;
      
      // Small radius offset to create "band" effect around the halo
      radiusOffset[i] = (Math.random() - 0.5) * 0.4;
      
      // Angular offset to spread particles around the spiral
      angleOffset[i] = (Math.random() - 0.5) * 0.3;
      
      // Independent rotation speed: faster than tree rotation to create visible relative motion
      // Tree rotates at ~0.0006 rad/frame (0.6 * 0.001), we use 0.002-0.004 rad/frame
      // This creates 3-6x faster rotation, making upward ascent clearly visible
      rotationSpeed[i] = 0.102 + Math.random() * 0.002;
      
      // Get initial position
      const [x, y, z] = getSpiralPosition(spiralT[i], radiusOffset[i]);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color palette: warm meteor colors
      const colorChoice = Math.random();
      let c: THREE.Color;
      if (colorChoice < 0.4) c = COLOR_GOLD.clone();
      else if (colorChoice < 0.65) c = COLOR_AMBER.clone();
      else if (colorChoice < 0.85) c = COLOR_ORANGE.clone();
      else c = COLOR_WHITE.clone();

      baseColors[i * 3] = c.r;
      baseColors[i * 3 + 1] = c.g;
      baseColors[i * 3 + 2] = c.b;

      // HDR boost for visibility
      const intensity = 2.0 + Math.random() * 1.0;
      colors[i * 3] = c.r * intensity;
      colors[i * 3 + 1] = c.g * intensity;
      colors[i * 3 + 2] = c.b * intensity;

      // Size: larger meteors for better visibility
      sizes[i] = 0.25 + Math.random() * 0.35;
      
      flickerPhase[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions, colors, sizes,
      spiralT, ascentSpeed, radiusOffset, angleOffset, rotationSpeed,
      flickerPhase, baseColors, count
    };
  }, [count]);

  // === TRAIL PARTICLES ===
  const trailData = useMemo(() => {
    const trailPerMeteor = 6;
    const totalTrails = count * trailPerMeteor;
    
    const positions = new Float32Array(totalTrails * 3);
    const colors = new Float32Array(totalTrails * 3);
    const sizes = new Float32Array(totalTrails);
    const parentIndices = new Uint16Array(totalTrails);
    const trailOffsets = new Float32Array(totalTrails);

    for (let i = 0; i < count; i++) {
      for (let t = 0; t < trailPerMeteor; t++) {
        const idx = i * trailPerMeteor + t;
        parentIndices[idx] = i;
        // Trail offset: how far behind the meteor (in spiral t units)
        trailOffsets[idx] = (t + 1) * 0.003; // Tighter trail

        // Fade along trail
        const fade = 1 - (t / trailPerMeteor);
        colors[idx * 3] = COLOR_GOLD.r * fade * 1.5;
        colors[idx * 3 + 1] = COLOR_GOLD.g * fade * 1.2;
        colors[idx * 3 + 2] = COLOR_GOLD.b * fade * 0.8;

        sizes[idx] = 0.2 * fade;
      }
    }

    return { positions, colors, sizes, parentIndices, trailOffsets, count: totalTrails, trailPerMeteor };
  }, [count]);

  // === ANIMATION LOOP ===
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const deltaTime = Math.min(state.clock.getDelta() || 1/60, 0.1);

    if (isExploded) return;

    // === METEOR ANIMATION ===
    if (meteorRef.current) {
      const pos = meteorRef.current.geometry.attributes.position.array as Float32Array;
      const cols = meteorRef.current.geometry.attributes.color.array as Float32Array;
      const sizesAttr = meteorRef.current.geometry.attributes.size.array as Float32Array;

      for (let i = 0; i < meteorData.count; i++) {
        // Slowly advance along spiral (ascending)
        // Negative because we go from t=1 (bottom) to t=0 (top)
        meteorData.spiralT[i] -= meteorData.ascentSpeed[i] * deltaTime;
        
        // Wrap: when reaching top, respawn at bottom
        if (meteorData.spiralT[i] <= 0) {
          meteorData.spiralT[i] = 1;
          // Slight randomization on respawn
          meteorData.radiusOffset[i] = (Math.random() - 0.5) * 0.4;
          meteorData.angleOffset[i] = (Math.random() - 0.5) * 0.3;
        }

        const t = meteorData.spiralT[i];
        
        // Get base spiral position
        const [baseX, baseY, baseZ] = getSpiralPosition(t, meteorData.radiusOffset[i]);
        
        // Add subtle orbital wobble (like meteor in orbit)
        const wobbleAngle = time * 0.3 + i * 0.1;
        const wobbleR = Math.sin(wobbleAngle) * 0.1;
        const wobbleY = Math.sin(wobbleAngle * 1.5) * 0.08;
        
        // Calculate spiral angle with INDEPENDENT rotation speed
        // This creates relative motion vs the tree, making upward ascent clearly visible
        const baseTheta = t * Math.PI * 2 * SPIRAL_TURNS;
        const independentRotation = time * meteorData.rotationSpeed[i];
        const theta = baseTheta + independentRotation + meteorData.angleOffset[i];
        
        const heightRatio = (baseY - TREE_BOTTOM_Y) / (TREE_TOP_Y - TREE_BOTTOM_Y);
        const baseR = (1 - heightRatio) * 5.2 + 0.3 + 0.15 + meteorData.radiusOffset[i];
        const r = baseR + wobbleR;
        
        pos[i * 3] = Math.cos(theta) * r;
        pos[i * 3 + 1] = baseY + wobbleY;
        pos[i * 3 + 2] = Math.sin(theta) * r;

        // Color: warmer as it rises (bottom=gold, top=white)
        const baseR_c = meteorData.baseColors[i * 3];
        const baseG_c = meteorData.baseColors[i * 3 + 1];
        const baseB_c = meteorData.baseColors[i * 3 + 2];
        
        const whiteFactor = (1 - t) * 0.4; // More white at top
        const lerpR = baseR_c + (COLOR_WHITE.r - baseR_c) * whiteFactor;
        const lerpG = baseG_c + (COLOR_WHITE.g - baseG_c) * whiteFactor;
        const lerpB = baseB_c + (COLOR_WHITE.b - baseB_c) * whiteFactor;

        // Flicker effect
        const flickerFreq = 3 + (meteorData.flickerPhase[i] % 2);
        const flicker = 0.8 + Math.sin(time * flickerFreq + meteorData.flickerPhase[i]) * 0.2;
        
        // Fade at edges of spiral
        const fadeIn = Math.min((1 - t) * 8, 1);
        const fadeOut = t < 0.1 ? t * 10 : 1;
        const fade = fadeIn * fadeOut;

        const intensity = (2.0 + Math.random() * 0.3) * flicker * fade;
        cols[i * 3] = lerpR * intensity;
        cols[i * 3 + 1] = lerpG * intensity;
        cols[i * 3 + 2] = lerpB * intensity;

        // Size pulsation
        sizesAttr[i] = meteorData.sizes[i] * (0.85 + flicker * 0.3) * fade;
      }

      meteorRef.current.geometry.attributes.position.needsUpdate = true;
      meteorRef.current.geometry.attributes.color.needsUpdate = true;
      meteorRef.current.geometry.attributes.size.needsUpdate = true;
    }

    // === TRAIL ANIMATION ===
    if (trailRef.current) {
      const trailPos = trailRef.current.geometry.attributes.position.array as Float32Array;
      const trailCols = trailRef.current.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < trailData.count; i++) {
        const parentIdx = trailData.parentIndices[i];
        const offset = trailData.trailOffsets[i];
        
        // Trail follows parent but lagged in spiral position
        const parentT = meteorData.spiralT[parentIdx];
        const trailT = Math.min(parentT + offset, 1); // Trail is behind (higher t = lower position)
        
        const [x, y, z] = getSpiralPosition(trailT, meteorData.radiusOffset[parentIdx]);
        
        // Apply same angular offset and independent rotation as parent
        const baseTheta = trailT * Math.PI * 2 * SPIRAL_TURNS;
        const independentRotation = time * meteorData.rotationSpeed[parentIdx];
        const theta = baseTheta + independentRotation + meteorData.angleOffset[parentIdx];
        
        const heightRatio = (y - TREE_BOTTOM_Y) / (TREE_TOP_Y - TREE_BOTTOM_Y);
        const baseR = (1 - heightRatio) * 5.2 + 0.3 + 0.15 + meteorData.radiusOffset[parentIdx];
        
        trailPos[i * 3] = Math.cos(theta) * baseR;
        trailPos[i * 3 + 1] = y;
        trailPos[i * 3 + 2] = Math.sin(theta) * baseR;

        // Fade trail
        const trailIdx = i % trailData.trailPerMeteor;
        const fade = (1 - trailIdx / trailData.trailPerMeteor) * 0.7;
        
        trailCols[i * 3] = COLOR_GOLD.r * fade * 1.5;
        trailCols[i * 3 + 1] = COLOR_GOLD.g * fade * 1.2;
        trailCols[i * 3 + 2] = COLOR_GOLD.b * fade * 0.6;
      }

      trailRef.current.geometry.attributes.position.needsUpdate = true;
      trailRef.current.geometry.attributes.color.needsUpdate = true;
    }
  });

  if (isExploded) return null;

  return (
    <group>
      {/* Meteor particles - tightly following spiral halo */}
      <points ref={meteorRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={meteorData.count}
            array={meteorData.positions.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={meteorData.count}
            array={meteorData.colors.slice()}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={meteorData.count}
            array={meteorData.sizes.slice()}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          map={meteorTexture}
          alphaMap={meteorTexture}
          transparent
          opacity={1}
          depthWrite={false}
          size={0.6}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      {/* Trail particles */}
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
          opacity={0.8}
          depthWrite={false}
          size={0.4}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    </group>
  );
};
