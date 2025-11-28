import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface PhotoCardProps {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  isExploded: boolean;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ url, position, rotation, scale, isExploded }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    setLoadError(false);
    
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      (error) => {
        console.warn('Failed to load photo texture:', error);
        setLoadError(true);
      }
    );
  }, [url]);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Gentle floating rotation
    groupRef.current.rotation.y += 0.005;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1;

    // Scale animation based on explosion state
    const targetScale = isExploded ? scale : 0;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Polaroid Frame */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1.2, 0.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
      </mesh>
      
      {/* Photo Image */}
      {texture ? (
        <mesh position={[0, 0.1, 0.02]}>
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
        </mesh>
      ) : loadError ? (
        <mesh position={[0, 0.1, 0.02]}>
          <planeGeometry args={[0.85, 0.85]} />
          <meshBasicMaterial color="#cccccc" side={THREE.DoubleSide} />
        </mesh>
      ) : null}

      {/* Backside Text */}
      <Text
        position={[0, -0.4, -0.02]}
        rotation={[0, Math.PI, 0]}
        fontSize={0.1}
        color="#333"
      >
        Memory
      </Text>
    </group>
  );
};