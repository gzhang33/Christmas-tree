import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { UIState } from '../types';
import { Snow } from './Snow';
import { PhotoCard } from './PhotoCard';

interface ExperienceProps {
  uiState: UIState;
}

export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
  const { config, photos, isExploded } = uiState;
  const treeGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate tree particle positions in a conical Christmas tree shape
  const treeParticles = useMemo(() => {
    const particles = [];
    const count = config.particleCount;

    for (let i = 0; i < count; i++) {
      // Create conical tree shape
      const height = Math.random(); // 0 to 1
      const radius = (1 - height) * 0.8; // Wider at bottom, narrower at top
      const angle = Math.random() * Math.PI * 2;
      
      const x = (Math.random() - 0.5) * radius * 8;
      const z = (Math.random() - 0.5) * radius * 8;
      const y = height * 12 - 2; // Tree height from -2 to 10

      // Add some randomness for natural look
      const noiseX = (Math.random() - 0.5) * 0.3;
      const noiseZ = (Math.random() - 0.5) * 0.3;
      const noiseY = (Math.random() - 0.5) * 0.2;

      particles.push({
        position: new THREE.Vector3(x + noiseX, y + noiseY, z + noiseZ),
        originalPosition: new THREE.Vector3(x + noiseX, y + noiseY, z + noiseZ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        scale: Math.random() * 0.3 + 0.1
      });
    }

    return particles;
  }, [config.particleCount]);

  // Calculate photo positions for explosion effect
  const photoPositions = useMemo(() => {
    if (photos.length === 0) return [];
    
    return photos.map((photo, index) => {
      if (!isExploded) {
        // Before explosion: photos hidden at tree center
        return {
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          scale: 0
        };
      }

      // After explosion: distribute photos in sphere
      const radius = config.explosionRadius;
      const theta = (index / photos.length) * Math.PI * 2;
      const phi = Math.acos(2 * (index / photos.length) - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      return {
        position: [x, y, z] as [number, number, number],
        rotation: [
          Math.random() * Math.PI * 0.5,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 0.5
        ] as [number, number, number],
        scale: config.photoSize
      };
    });
  }, [photos, isExploded, config.explosionRadius, config.photoSize]);

  // Animate tree particles
  useFrame((state) => {
    if (!meshRef.current || !treeGroupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Rotate entire tree
    treeGroupRef.current.rotation.y += config.rotationSpeed * 0.01;

    // Update individual particles
    treeParticles.forEach((particle, i) => {
      // Gentle floating animation
      const floatY = Math.sin(time * 0.5 + i * 0.01) * 0.1;
      const floatX = Math.cos(time * 0.3 + i * 0.01) * 0.05;
      const floatZ = Math.sin(time * 0.4 + i * 0.01) * 0.05;

      const position = particle.originalPosition.clone();
      position.y += floatY;
      position.x += floatX;
      position.z += floatZ;

      // Update rotation
      particle.rotation.x += particle.rotSpeed.x;
      particle.rotation.y += particle.rotSpeed.y;
      particle.rotation.z += particle.rotSpeed.z;

      // Update matrix
      dummy.position.copy(position);
      dummy.rotation.copy(particle.rotation);
      dummy.scale.set(particle.scale, particle.scale, particle.scale);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Create particle material with tree color
  const particleMaterial = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, config.treeColor);
      gradient.addColorStop(0.5, config.treeColor + 'CC');
      gradient.addColorStop(1, config.treeColor + '00');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return (
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        color={config.treeColor}
      />
    );
  }, [config.treeColor]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color={config.treeColor} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color={config.treeColor} />
      <directionalLight position={[0, 20, 0]} intensity={0.3} />

      {/* Particle Christmas Tree */}
      <group ref={treeGroupRef}>
        <instancedMesh ref={meshRef} args={[undefined, undefined, config.particleCount]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          {particleMaterial}
        </instancedMesh>
      </group>

      {/* Snow Effect */}
      <Snow 
        count={config.snowDensity} 
        speed={config.snowSpeed} 
        wind={config.windStrength} 
      />

      {/* Photo Cards */}
      {photos.map((photo, index) => {
        const pos = photoPositions[index];
        if (!pos) return null;
        
        return (
          <PhotoCard
            key={photo.id}
            url={photo.url}
            position={pos.position}
            rotation={pos.rotation}
            scale={pos.scale}
            isExploded={isExploded}
          />
        );
      })}
    </>
  );
};

