import React, { useMemo, useEffect } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Snow } from './Snow.tsx';
import { TreeParticles } from './TreeParticles.tsx';
import { PhotoCard } from './PhotoCard.tsx';
import { UIState } from '../types.ts';
import * as THREE from 'three';

interface ExperienceProps {
  uiState: UIState;
}

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, isExploded, toggleExplosion, photos } = uiState;
  const { camera } = useThree();

  // Adjust camera for mobile to prevent tree from being too large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        // Mobile: Move camera further back
        camera.position.set(0, 2, 42);
      } else {
        // Desktop: Original position
        camera.position.set(0, 4, 25);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera]);

  // Universe Photos
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
        rot: [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number]
      });
    }
    return posData;
  }, [config.explosionRadius]);

  return (
    <>
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={45}
        autoRotate={isExploded}
        autoRotateSpeed={0.3}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />

      {/* --- Cinematic Lighting --- */}

      {/* 1. Dramatic Rim Light (Cool Blue) */}
      <spotLight position={[-15, 10, -15]} intensity={3} color="#E6E6FA" angle={0.6} penumbra={1} />

      {/* 2. Key Light (Soft Warm Pink) */}
      <pointLight position={[10, 8, 10]} intensity={2.0} color="#FFD1DC" distance={40} />

      {/* 3. Fill Light for Gifts (Low) */}
      <pointLight position={[0, -5, 8]} intensity={1.5} color="#FFB6C1" distance={20} />

      {/* 4. Top Highlight */}
      <spotLight position={[0, 20, 0]} target-position={[0, 0, 0]} intensity={1} color="#FFF" angle={0.5} />

      {/* --- Environment --- */}
      <Stars radius={120} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
      <Snow count={Math.floor(config.snowDensity)} speed={config.snowSpeed} wind={config.windStrength} />

      {/* --- The Tree & Gifts --- */}
      <TreeParticles
        isExploded={isExploded}
        config={config}
        onParticlesClick={toggleExplosion}
      />

      {/* --- The Photos --- */}
      <group>
        {photoPositions.map((data, i) => {
          const photoUrl = photos.length > 0
            ? photos[i % photos.length].url
            : `https://picsum.photos/seed/${i + 999}/300/360`;

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

      {/* --- Floor --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.6, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#080002"
          metalness={0.6}
          roughness={0.4}
        />
      </mesh>
    </>
  );
};