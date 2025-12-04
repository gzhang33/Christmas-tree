import React, { useMemo, useRef } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Snow } from './Snow.tsx';
import { TreeParticles } from './TreeParticles.tsx';
import { MagicDust } from './MagicDust.tsx';
import { PhotoCard } from './PhotoCard.tsx';
import { UIState } from '../../types.ts';
import { PLACEHOLDERS } from '../../config/assets.ts';
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

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, isExploded, toggleExplosion, photos } = uiState;

  // Universe Photos positions
  const photoPositions = useMemo(() => {
    const slots = 150;
    const posData = [];
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < slots; i++) {
      const y = 1 - (i / (slots - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const r = 12 + Math.random() * (config.explosionRadius || 20);
      const x = Math.cos(theta) * radius * r;
      const z = Math.sin(theta) * radius * r;
      const yPos = y * r;

      posData.push({
        pos: [x, yPos, z] as [number, number, number],
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number],
      });
    }
    return posData;
  }, [config.explosionRadius]);

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
      <MagicDust count={1200} isExploded={isExploded} />

      {/* === THE TREE === */}
      <TreeParticles
        isExploded={isExploded}
        config={config}
        onParticlesClick={toggleExplosion}
      />

      {/* === PHOTO CARDS (Exploded Universe) === */}
      <group>
        {photoPositions.map((data, i) => {
          const photoUrl =
            photos.length > 0
              ? photos[i % photos.length].url
              : PLACEHOLDERS.photoSeed.replace('{seed}', (i + 999).toString());

          return (
            <PhotoCard
              key={i}
              url={photoUrl}
              position={data.pos}
              rotation={data.rot}
              scale={config.photoSize}
              isExploded={isExploded}
            />
          );
        })}
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
