import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { UIState } from '../types';
import { Snow } from './Snow';
import { TreeParticles } from './TreeParticles';
import { PhotoCard } from './PhotoCard';

interface ExperienceProps {
  uiState: UIState;
}

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, isExploded, toggleExplosion, photos } = uiState;
  const { camera } = useThree();

  // Adaptive camera positioning
  useEffect(() => {
    const handleResize = () => {
      const aspect = window.innerWidth / window.innerHeight;

      // Tree dimensions approximation
      const targetHeight = 22; // Height with some margin
      const targetWidth = 18;  // Width with some margin

      // Calculate required distance to fit height and width
      // tan(FOV/2) = (Size/2) / Distance
      // Distance = (Size/2) / tan(FOV/2)
      const cam = camera as THREE.PerspectiveCamera;
      const fovRad = (cam.fov * Math.PI) / 180;
      const distH = targetHeight / (2 * Math.tan(fovRad / 2));
      const distW = targetWidth / (2 * Math.tan(fovRad / 2) * aspect);

      // Choose the larger distance to ensure both fit
      const dist = Math.max(distH, distW);

      // Adjust Y offset based on aspect to center visually
      // We want the tree centered. Tree center is roughly Y=1.
      const yPos = 1 + (dist * 0.1);

      camera.position.set(0, yPos, dist);
      camera.updateProjectionMatrix();
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

      {/* --- Decorative Base --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.55, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#220000" roughness={0.8} />
      </mesh>

      {/* --- Floor --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.6, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#050505"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </>
  );
};