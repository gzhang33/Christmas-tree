import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowProps {
  count: number;
}

export const Snow: React.FC<SnowProps> = ({ count }) => {
  const mesh = useRef<THREE.Points>(null);

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50; // x
      positions[i * 3 + 1] = Math.random() * 40;     // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50; // z
    }
    return positions;
  }, [count]);

  const speeds = useMemo(() => {
    return new Float32Array(count).map(() => Math.random() * 0.1 + 0.05);
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    
    const geometry = mesh.current.geometry;
    if (!geometry || !geometry.attributes.position) return;

    const positions = geometry.attributes.position.array as Float32Array;
    
    // Safety check for dynamic resizing
    const maxIndex = positions.length / 3;
    const loopCount = Math.min(count, maxIndex);

    for (let i = 0; i < loopCount; i++) {
      // Move down
      positions[i * 3 + 1] -= speeds[i];

      // Reset if too low
      if (positions[i * 3 + 1] < -10) {
        positions[i * 3 + 1] = 20;
        positions[i * 3] = (Math.random() - 0.5) * 50;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh} key={count}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#ffffff"
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
};