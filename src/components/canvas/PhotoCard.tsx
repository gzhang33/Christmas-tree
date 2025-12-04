import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isExploded) {
      setVisible(false);
      return;
    }

    // Dispose any existing texture from state before starting a new load
    setTexture((prevTexture) => {
      if (prevTexture) {
        prevTexture.dispose();
      }
      return null;
    });

    let loadedTexture: THREE.Texture | null = null;
    let isCancelled = false;

    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      if (isCancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      loadedTexture = tex;
      setTexture(tex);
      setVisible(true);
    });

    // Cleanup function: dispose whichever texture is currently set
    return () => {
      isCancelled = true;
      if (loadedTexture) {
        loadedTexture.dispose();
        loadedTexture = null;
      }
      // 仅重置状态，不再重复 dispose
      // 因为 loadedTexture 和 prevTexture 可能是同一个对象
      setTexture(null);
    };
  }, [url, isExploded]);

  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Gentle floating rotation
    groupRef.current.rotation.y += 0.005;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.1;

    // Scale animation based on explosion state
    const targetScale = isExploded ? scale : 0;
    targetVec.set(targetScale, targetScale, targetScale);
    groupRef.current.scale.lerp(targetVec, 0.1);
  });

  // Don't render anything when not exploded
  if (!isExploded && !visible) return null;

  return (
  <group ref={groupRef} position={position} rotation={rotation} scale={0}>
    {/* Polaroid Frame */}
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[1, 1.2, 0.02]} />
      <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
    </mesh>

    {/* Photo Image */}
    {texture && (
      <mesh position={[0, 0.1, 0.02]}>
        <planeGeometry args={[0.85, 0.85]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
      </mesh>
    )}
  </group>
);
};