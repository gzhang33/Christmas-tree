import React, { useMemo, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useSnowTexture } from '../../hooks/useSnowTexture';
import { SCENE_CONFIG } from '../../config';

interface SnowFloorProps {
    count?: number;
    opacity?: number;
}

/**
 * SnowFloor Component
 * 
 * Renders a layer of static, sparse snowflakes on the floor using InstancedMesh.
 * Uses the same procedural texture as the falling snow for visual consistency.
 * 
 * Designed to be subtle and not distract from the main tree.
 */
export const SnowFloor: React.FC<SnowFloorProps> = ({
    count = 2000,    // Sparse density
    opacity = 0.35,  // Low opacity to blend with dark floor
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const texture = useSnowTexture();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Generate static positions for the snow accumulation
    useLayoutEffect(() => {
        if (!meshRef.current) return;

        const floorRadius = SCENE_CONFIG.floor.radius;
        const tempColor = new THREE.Color();

        for (let i = 0; i < count; i++) {
            // Random position within the floor circle
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * floorRadius; // Uniform distribution in circle

            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            // Slightly above the floor to avoid z-fighting with the reflective surface
            // Floor is at y=0 relative to its container, but check SCENE_CONFIG.floor.position
            // Experience.tsx positions floor at SCENE_CONFIG.floor.position.
            // But this component will likely be placed INSIDE the same group or independent.
            // If independent, we need to match floor position.
            // Let's assume this component is placed at (0,0,0) and we use local coordinates matching the floor.
            // SCENE_CONFIG.floor.position is [0, -6.6, 0].
            // So we need to position flakes relative to that if we put this component at root.
            // Or better, we position the Mesh at SCENE_CONFIG.floor.position and flakes at y=0.05.

            const y = 0.05; // Slightly above ground

            // Random scale
            const scale = Math.random() * 0.15 + 0.1; // Small flakes

            // Random Rotation (lying flat implies rotation around Y only? No, flakes can be messy)
            // But to look like "accumulated" on a flat surface, they should generally be flat-ish.
            dummy.position.set(x, y, z);
            dummy.rotation.set(
                -Math.PI / 2, // Lay flat corresponding to plane geometry
                0,
                Math.random() * Math.PI * 2 // Random rotation around center
            );
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [count, dummy]);

    return (
        <instancedMesh
            ref={meshRef}
            args={[undefined, undefined, count]}
            position={SCENE_CONFIG.floor.position as [number, number, number]}
        >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={opacity}
                depthWrite={false} // Don't write to depth buffer to avoid sorting issues with floor
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending} // Additive blending for "glowy" snow or NormalBlending?
            // NormalBlending is better for "physical" snow, Additive makes it look like light.
            // User wants "accumulated snow", so NormalBlending is probably safer, or maybe somewhat additive.
            // Let's stick to default (Normal) but with transparency.
            />
        </instancedMesh>
    );
};
