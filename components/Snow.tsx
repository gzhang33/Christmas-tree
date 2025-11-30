import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowProps {
  count: number;
  speed?: number;
  wind?: number;
}

export const Snow: React.FC<SnowProps> = ({ count, speed = 1.0, wind = 0.5 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate a procedural snowflake texture
  const snowflakeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, 128, 128);

      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'white';

      const cx = 64;
      const cy = 64;
      const radius = 45;

      // Draw 6 branches
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((i * 60 * Math.PI) / 180);

        // Main branch
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -radius);
        ctx.stroke();

        // Sub-branches (V shapes)
        const branchSize = 12;
        // Inner V
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.4);
        ctx.lineTo(-branchSize, -radius * 0.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.4);
        ctx.lineTo(branchSize, -radius * 0.6);
        ctx.stroke();

        // Outer V
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.7);
        ctx.lineTo(-branchSize * 0.8, -radius * 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.7);
        ctx.lineTo(branchSize * 0.8, -radius * 0.9);
        ctx.stroke();

        ctx.restore();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Initialize particle data
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 40;
      const z = (Math.random() - 0.5) * 60;

      temp.push({
        position: new THREE.Vector3(x, y, z),
        velocity: Math.random() * 0.1 + 0.05, // Fall speed
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.05
        ),
        sway: {
          x: Math.random() * 0.02,
          z: Math.random() * 0.02,
          freq: Math.random() * 2 + 1,
          offset: Math.random() * Math.PI * 2
        },
        scale: Math.random() * 0.4 + 0.2 // Random size
      });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!mesh.current) return;

    const time = state.clock.getElapsedTime();

    particles.forEach((particle, i) => {
      // 1. Update Position (Free fall + Sway)
      particle.position.y -= particle.velocity * speed;

      // Complex sway motion (irregular)
      const swayX = Math.sin(time * particle.sway.freq + particle.sway.offset) * particle.sway.x;
      const swayZ = Math.cos(time * particle.sway.freq * 0.8 + particle.sway.offset) * particle.sway.z;

      // Add some "wind" drift
      // Wind pushes X and Z slightly, modulated by time
      const windForce = (Math.sin(time * 0.5) + 0.5) * 0.05 * wind * speed;
      const windX = windForce + Math.sin(time * 1.2) * 0.01 * wind;

      particle.position.x += (swayX + windX) * speed;
      particle.position.z += (swayZ + windForce * 0.2) * speed;

      // Reset if below ground
      if (particle.position.y < -10) {
        particle.position.y = 30 + Math.random() * 10;
        // Respawn upwind to maintain density
        particle.position.x = (Math.random() - 0.5) * 60 - (wind * 10);
        particle.position.z = (Math.random() - 0.5) * 60;

        // Reset velocity slightly to keep it varied
        particle.velocity = Math.random() * 0.1 + 0.05;
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

      mesh.current!.setMatrixAt(i, dummy.matrix);
    });

    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={snowflakeTexture}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide} // Visible from both sides
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
};