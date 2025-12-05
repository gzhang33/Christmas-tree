import React, { useMemo, useRef, useEffect, useState } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Snow } from './Snow.tsx';
import { TreeParticles } from './TreeParticles.tsx';
import { MagicDust } from './MagicDust.tsx';
import { PolaroidPhoto } from './PolaroidPhoto.tsx';
import { UIState } from '../../types.ts';
import { MEMORIES } from '../../config/assets.ts';
import { useStore } from '../../store/useStore';
import { PARTICLE_CONFIG } from '../../config/particles';
import {
  PHOTO_COUNT,
  generatePhotoPositions,
} from '../../config/photoConfig';
import { preloadTextures } from '../../utils/texturePreloader';
import * as THREE from 'three';

interface ExperienceProps {
  uiState: UIState;
}

// Volumetric light rays component
const VolumetricRays: React.FC<{ isExploded: boolean }> = ({ isExploded }) => {
  const raysRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (raysRef.current && !isExploded) {
      raysRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  if (isExploded) return null;

  return (
    <group ref={raysRef} position={[0, 2, 0]}>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <spotLight
            key={i}
            position={[Math.cos(angle) * 3, 12, Math.sin(angle) * 3]}
            target-position={[0, -5, 0]}
            color="#FFF0F5"
            intensity={0.4}
            angle={0.15}
            penumbra={1}
            decay={1.5}
            distance={25}
          />
        );
      })}
    </group>
  );
};

/**
 * Generate photo particle source positions
 */
const generateParticleSourcePositions = (count: number): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  const treeHeight = PARTICLE_CONFIG.treeHeight;
  const treeBottom = PARTICLE_CONFIG.treeBottomY;

  for (let i = 0; i < count; i++) {
    const t = 0.2 + Math.random() * 0.65;
    const y = treeBottom + t * treeHeight;
    const maxRadius = 5.5 * (1 - t);
    const radius = Math.random() * maxRadius * 0.5;
    const angle = Math.random() * Math.PI * 2;
    positions.push([Math.cos(angle) * radius, y, Math.sin(angle) * radius]);
  }

  return positions;
};

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, isExploded, toggleExplosion, photos } = uiState;
  const particleCount = useStore((state) => state.particleCount);
  const { viewport } = useThree();

  // Track texture preload status
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const preloadStartedRef = useRef(false);

  const magicDustCount = useMemo(() => {
    return Math.floor(
      Math.max(particleCount * PARTICLE_CONFIG.ratios.magicDust, PARTICLE_CONFIG.minCounts.magicDust)
    );
  }, [particleCount]);

  // Generate photo data (positions, urls, etc.)
  const photoData = useMemo(() => {
    const aspectRatio = viewport.width / viewport.height;
    const photoPositions = generatePhotoPositions(PHOTO_COUNT, aspectRatio);
    const particleSources = generateParticleSourcePositions(PHOTO_COUNT);

    // Get available photo URLs
    const photoUrls: string[] = [];
    if (photos.length > 0) {
      for (let i = 0; i < PHOTO_COUNT; i++) {
        photoUrls.push(photos[i % photos.length].url);
      }
    } else {
      for (let i = 0; i < PHOTO_COUNT; i++) {
        photoUrls.push(MEMORIES[i % MEMORIES.length].image);
      }
    }

    return {
      items: photoPositions.map((pos, i) => ({
        url: photoUrls[i],
        position: [pos.x, pos.y, pos.z] as [number, number, number],
        rotation: pos.rotation,
        scale: pos.scale,
        particleStart: particleSources[i],
      })),
      urls: photoUrls,
    };
  }, [photos, viewport.width, viewport.height]);

  // Preload textures on mount (before explosion)
  useEffect(() => {
    if (preloadStartedRef.current) return;
    preloadStartedRef.current = true;

    // Extract unique URLs
    const uniqueUrls = [...new Set(photoData.urls)];

    // Preload in batches of 5 to avoid overwhelming the browser
    preloadTextures(uniqueUrls, 5, (loaded, total) => {
      if (loaded === total) {
        setTexturesLoaded(true);
        console.log(`Preloaded ${total} textures`);
      }
    }).catch((err) => {
      console.warn('Texture preload error:', err);
      setTexturesLoaded(true); // Continue anyway
    });
  }, [photoData.urls]);

  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={50}
        autoRotate={isExploded}
        autoRotateSpeed={0.3}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />

      {/* === CINEMATIC LIGHTING === */}
      <ambientLight intensity={0.15} color="#FFFFFF" />

      <spotLight
        position={[-5, 10, -5]}
        intensity={1.2}
        color="#FFB7C5"
        angle={0.7}
        penumbra={1}
        decay={1.5}
        distance={50}
        castShadow={false}
      />

      <spotLight
        position={[5, 8, 5]}
        intensity={0.8}
        color="#E0F7FA"
        angle={0.6}
        penumbra={1}
        decay={1.5}
        distance={40}
      />

      <pointLight position={[-10, 5, 10]} intensity={1.2} color="#FFB6C1" distance={30} decay={2} />

      <pointLight position={[0, -4, 8]} intensity={1.8} color="#FFC0CB" distance={18} decay={2} />

      <spotLight
        position={[-12, 6, -12]}
        intensity={2.0}
        color="#E6E6FA"
        angle={0.5}
        penumbra={1}
        decay={1.5}
        distance={35}
      />

      <VolumetricRays isExploded={isExploded} />

      {/* === ENVIRONMENT === */}
      <Stars radius={150} depth={60} count={6000} factor={4} saturation={0.1} fade speed={0.3} />

      <Snow count={Math.floor(config.snowDensity)} />

      <MagicDust count={magicDustCount} isExploded={isExploded} />

      {/* === THE TREE === */}
      <TreeParticles isExploded={isExploded} config={config} onParticlesClick={toggleExplosion} />

      {/* === POLAROID PHOTOS (only render when textures preloaded) === */}
      {texturesLoaded && (
        <group>
          {photoData.items.map((data, i) => (
            <PolaroidPhoto
              key={i}
              url={data.url}
              position={data.position}
              rotation={data.rotation}
              scale={data.scale * config.photoSize}
              isExploded={isExploded}
              particleStartPosition={data.particleStart}
              morphIndex={i}
            />
          ))}
        </group>
      )}

      {/* === FLOOR === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.6, 0]} receiveShadow>
        <circleGeometry args={[25, 64]} />
        <meshStandardMaterial color="#050001" metalness={0.7} roughness={0.3} envMapIntensity={0.5} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.55, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshBasicMaterial color="#3D1A2A" transparent opacity={0.3} />
      </mesh>
    </>
  );
};
