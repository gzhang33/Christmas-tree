import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SNOW_CONFIG, SNOW_DEFAULTS } from '../../config/snow';
import { useStore } from '../../store/useStore';

interface SnowProps {
  count?: number;
  speed?: number;
  wind?: number;
}

import { useSnowTexture } from '../../hooks/useSnowTexture';

export const Snow: React.FC<SnowProps> = ({
  count = SNOW_DEFAULTS.count,
  speed = SNOW_DEFAULTS.speed,
  wind = SNOW_DEFAULTS.wind
}) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Use the shared hook for consistent texture
  const snowflakeTexture = useSnowTexture();

  // Subscribe to morphing state for throttling during explosion
  const treeMorphState = useStore((state) => state.treeMorphState);

  // Frame skip counter for throttling during explosion peak
  const frameSkipRef = useRef(0);

  // Initialize particle data
  const particles = useMemo(() => {
    const { particles: pCfg } = SNOW_CONFIG;
    const temp = [];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * pCfg.spawnArea.width;
      const y = Math.random() * pCfg.spawnArea.height;
      const z = (Math.random() - 0.5) * pCfg.spawnArea.depth;

      temp.push({
        position: new THREE.Vector3(x, y, z),
        velocity: Math.random() * (pCfg.velocity.max - pCfg.velocity.min) + pCfg.velocity.min,
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * pCfg.rotation.speedRange,
          (Math.random() - 0.5) * pCfg.rotation.speedRange,
          (Math.random() - 0.5) * pCfg.rotation.speedRange
        ),
        sway: {
          x: Math.random() * pCfg.sway.xRange,
          z: Math.random() * pCfg.sway.zRange,
          freq: Math.random() * (pCfg.sway.frequencyMax - pCfg.sway.frequencyMin) + pCfg.sway.frequencyMin,
          offset: Math.random() * Math.PI * 2
        },
        scale: Math.random() * (pCfg.scale.max - pCfg.scale.min) + pCfg.scale.min
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;

    // MOBILE OPTIMIZATION: Throttle snow updates during explosion peak
    // During 'morphing-out', skip every other frame to give GPU headroom for photo burst
    if (treeMorphState === 'morphing-out') {
      frameSkipRef.current++;
      if (frameSkipRef.current % 2 !== 0) {
        return; // Skip this frame
      }
    } else {
      frameSkipRef.current = 0; // Reset when not morphing
    }

    const { animation: aCfg, particles: pCfg } = SNOW_CONFIG;
    const time = state.clock.getElapsedTime();

    const pArr = particles;
    const count = pArr.length;
    for (let i = 0; i < count; i++) {
      const particle = pArr[i];
      // 1. Update Position (Free fall + Sway)
      particle.position.y -= particle.velocity * speed;

      // Complex sway motion (irregular)
      const swayX = Math.sin(time * particle.sway.freq + particle.sway.offset) * particle.sway.x;
      const swayZ = Math.cos(time * particle.sway.freq * aCfg.sway.frequencyScale + particle.sway.offset) * particle.sway.z;

      // Add wind drift
      const windForce = (Math.sin(time * aCfg.wind.timeModulation) + 0.5) * aCfg.wind.baseForce * wind * speed;
      const windX = windForce + Math.sin(time * aCfg.wind.xFrequency) * aCfg.wind.xAmplitude * wind;

      particle.position.x += (swayX + windX) * speed;
      particle.position.z += (swayZ + windForce * aCfg.wind.zScale) * speed;

      // Reset if below ground
      if (particle.position.y < aCfg.reset.yThreshold) {
        particle.position.y = aCfg.reset.respawnYMin + Math.random() * (aCfg.reset.respawnYMax - aCfg.reset.respawnYMin);
        // Respawn upwind to maintain density
        particle.position.x = (Math.random() - 0.5) * pCfg.spawnArea.width - (wind * aCfg.wind.respawnOffset);
        particle.position.z = (Math.random() - 0.5) * pCfg.spawnArea.depth;

        // Reset velocity slightly to keep it varied
        particle.velocity = Math.random() * (pCfg.velocity.max - pCfg.velocity.min) + pCfg.velocity.min;
      }

      // 2. Update Rotation (Tumbling)
      particle.rotation.x += particle.rotSpeed.x * speed;
      particle.rotation.y += particle.rotSpeed.y * speed;
      particle.rotation.z += particle.rotSpeed.z * speed;

      // 3. Update Matrix
      dummy.position.copy(particle.position);
      dummy.rotation.copy(particle.rotation);
      dummy.scale.set(particle.scale, particle.scale, particle.scale);
      dummy.updateMatrix();

      mesh.current.setMatrixAt(i, dummy.matrix);
    }

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  const { geometry: gCfg, material: mCfg } = SNOW_CONFIG;

  return (
    <instancedMesh key={`snow-${count}`} ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[gCfg.planeWidth, gCfg.planeHeight]} />
      <meshBasicMaterial
        map={snowflakeTexture}
        transparent={mCfg.transparent}
        opacity={mCfg.opacity}
        depthWrite={mCfg.depthWrite}
        side={mCfg.side}
        blending={mCfg.blending}
      />
    </instancedMesh>
  );
};

