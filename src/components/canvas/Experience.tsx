import React, { useMemo, useRef } from 'react';
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
  PhotoPosition,
} from '../../config/photoConfig';
import * as THREE from 'three';

interface ExperienceProps {
  uiState: UIState;
}

// === LIGHTING CONFIGURATION (Matching specification) ===
// | Light Type  | Position        | Color     | Intensity | Function           |
// |-------------|-----------------|-----------|-----------|-------------------|
// | Main Spot   | [-5, 10, -5]    | #FFB7C5   | 1.2       | Tree main light   |
// | Rim Light   | [5, 8, 5]       | #E0F7FA   | 0.8       | Depth enhancement |
// | Ambient     | -               | #FFFFFF   | 0.15      | Base lighting     |

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
      {/* Simulated god rays using angled spot lights */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        return (
          <spotLight
            key={i}
            position={[
              Math.cos(angle) * 3,
              12,
              Math.sin(angle) * 3,
            ]}
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
 * These are distributed within the tree's inner volume
 * to provide starting points for the morph animation
 */
const generateParticleSourcePositions = (count: number): [number, number, number][] => {
  const positions: [number, number, number][] = [];
  const treeHeight = PARTICLE_CONFIG.treeHeight;
  const treeBottom = PARTICLE_CONFIG.treeBottomY;

  for (let i = 0; i < count; i++) {
    // Distribute particles within the inner 50% of tree volume
    // Focus on middle height range (20%-85% of tree height)
    const t = 0.2 + Math.random() * 0.65;
    const y = treeBottom + t * treeHeight;

    // Calculate radius at this height (inner volume)
    const maxRadius = 5.5 * (1 - t);
    const radius = Math.random() * maxRadius * 0.5; // Inner 50%

    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    positions.push([x, y, z]);
  }

  return positions;
};

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, isExploded, toggleExplosion, photos } = uiState;
  const particleCount = useStore((state) => state.particleCount);
  const { viewport } = useThree();

  const magicDustCount = useMemo(() => {
    return Math.floor(Math.max(particleCount * PARTICLE_CONFIG.ratios.magicDust, PARTICLE_CONFIG.minCounts.magicDust));
  }, [particleCount]);

  // Generate photo positions with center-bias and overlap avoidance
  const photoData = useMemo(() => {
    const aspectRatio = viewport.width / viewport.height;
    const photoPositions = generatePhotoPositions(PHOTO_COUNT, aspectRatio);
    const particleSources = generateParticleSourcePositions(PHOTO_COUNT);

    // Get available photo URLs
    const photoUrls: string[] = [];
    if (photos.length > 0) {
      // Use user-uploaded photos
      for (let i = 0; i < PHOTO_COUNT; i++) {
        photoUrls.push(photos[i % photos.length].url);
      }
    } else {
      // Use MEMORIES as fallback
      for (let i = 0; i < PHOTO_COUNT; i++) {
        photoUrls.push(MEMORIES[i % MEMORIES.length].image);
      }
    }

    return photoPositions.map((pos, i) => ({
      url: photoUrls[i],
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      rotation: pos.rotation,
      scale: pos.scale,
      particleStart: particleSources[i],
    }));
  }, [photos, viewport.width, viewport.height]);

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

      {/* === CINEMATIC LIGHTING SETUP (Per Specification) === */}

      {/* Ambient Light - #FFFFFF intensity 0.15 */}
      <ambientLight intensity={0.15} color="#FFFFFF" />

      {/* 1. Main Spotlight - Position [-5, 10, -5], Color #FFB7C5, Intensity 1.2 */}
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

      {/* 2. Rim Light - Position [5, 8, 5], Color #E0F7FA, Intensity 0.8 */}
      <spotLight
        position={[5, 8, 5]}
        intensity={0.8}
        color="#E0F7FA"
        angle={0.6}
        penumbra={1}
        decay={1.5}
        distance={40}
      />

      {/* 3. Fill Light - Soft pink from opposite side */}
      <pointLight
        position={[-10, 5, 10]}
        intensity={1.2}
        color="#FFB6C1"
        distance={30}
        decay={2}
      />

      {/* 4. Base/Gift Lighting - Warm accent from below */}
      <pointLight
        position={[0, -4, 8]}
        intensity={1.8}
        color="#FFC0CB"
        distance={18}
        decay={2}
      />

      {/* 5. Back Rim - Separation light */}
      <spotLight
        position={[-12, 6, -12]}
        intensity={2.0}
        color="#E6E6FA"
        angle={0.5}
        penumbra={1}
        decay={1.5}
        distance={35}
      />

      {/* Volumetric Light Rays */}
      <VolumetricRays isExploded={isExploded} />

      {/* === ENVIRONMENT === */}

      {/* Deep space stars */}
      <Stars
        radius={150}
        depth={60}
        count={6000}
        factor={4}
        saturation={0.1}
        fade
        speed={0.3}
      />

      {/* Snow particles */}
      <Snow count={Math.floor(config.snowDensity)} />

      {/* Magic dust and fairy particles */}
      <MagicDust count={magicDustCount} isExploded={isExploded} />

      {/* === THE TREE === */}
      <TreeParticles
        isExploded={isExploded}
        config={config}
        onParticlesClick={toggleExplosion}
      />

      {/* === POLAROID PHOTOS (Morphing from particles) === */}
      <group>
        {photoData.map((data, i) => (
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

      {/* === FLOOR === */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.6, 0]} receiveShadow>
        <circleGeometry args={[25, 64]} />
        <meshStandardMaterial
          color="#050001"
          metalness={0.7}
          roughness={0.3}
          envMapIntensity={0.5}
        />
      </mesh>

      {/* Floor reflection glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.55, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshBasicMaterial
          color="#3D1A2A"
          transparent
          opacity={0.3}
        />
      </mesh>
    </>
  );
};
