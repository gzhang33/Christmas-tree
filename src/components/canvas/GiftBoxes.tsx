/**
 * GiftBoxes Component
 * 
 * Independent gift box rendering component that loads and displays
 * 3D gift box GLB models. Separated from TreeParticles for:
 * - Earlier rendering (text phase instead of morphing phase)
 * - Synchronized appearance with Floor component
 * - Independent opacity animation control
 * 
 * Features:
 * - Loads GLB models via useGLTF (cached by drei)
 * - Renders in entrance/text/morphing/tree phases
 * - Full opacity in text phase for proper display
 */

import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { SkeletonUtils } from 'three-stdlib';
import { useStore } from '../../store/useStore';
import { GIFT_MODELS, GIFT_BOX_CONFIGS, calculateGiftPosition } from '../../config/giftBoxes';
import { PARTICLE_CONFIG } from '../../config/particles';

/**
 * Individual gift mesh with auto-scaling to fit target dimensions
 * Handles its own opacity animation based on landing phase
 */
const GiftMesh = React.memo(({
    scene,
    width,
    height,
    position,
    rotation,
}: {
    scene: THREE.Group;
    width: number;
    height: number;
    position: [number, number, number];
    rotation: number;
}) => {
    const materialsRef = useRef<THREE.Material[]>([]);
    const currentOpacityRef = useRef(1);

    const clonedScene = useMemo(() => {
        // Clone the scene to allow independent transforms
        const clone = SkeletonUtils.clone(scene);

        // Compute bounding box to auto-scale
        const box = new THREE.Box3().setFromObject(clone);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Calculate scale to fit target dimensions
        const sx = size.x > 0 ? width / size.x : 1;
        const sy = size.y > 0 ? height / size.y : 1;
        const sz = size.z > 0 ? width / size.z : 1;

        // Apply scale to root
        clone.scale.set(sx, sy, sz);

        return clone;
    }, [scene, width, height]);

    // Collect materials on mount and set transparent
    useEffect(() => {
        const mats: THREE.Material[] = [];
        clonedScene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                materials.forEach(mat => {
                    if (mat) {
                        // FIX: Forces opaque rendering to resolve Z-fighting with transparent tree particles.
                        // Opaque objects are drawn first and write depth, ensuring correct occlusion.
                        mat.transparent = false;
                        mat.opacity = 1;
                        // mat.depthWrite = true; // Default is true for opaque objects
                        mats.push(mat);
                    }
                });
            }
        });
        materialsRef.current = mats;
    }, [clonedScene]);

    // Update material opacity every frame based on landing phase
    useFrame((_, delta) => {
        // Gift boxes are always fully visible (100% opacity) in all phases
        // Opacity animation disabled to support opaque rendering (fix for occlusion bugs)
        /*
        const targetOpacity = 1;

        // Smooth lerp to target
        currentOpacityRef.current = THREE.MathUtils.lerp(
            currentOpacityRef.current,
            targetOpacity,
            delta * 4 // Fast transition
        );

        // Apply to all materials
        materialsRef.current.forEach(mat => {
            mat.opacity = currentOpacityRef.current;
        });
        */
    });

    // Cleanup cloned scene resources on unmount
    useEffect(() => {
        return () => {
            clonedScene.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry?.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(m => m.dispose());
                    } else {
                        mesh.material?.dispose();
                    }
                }
            });
        };
    }, [clonedScene]);

    return (
        <primitive
            object={clonedScene}
            position={position}
            rotation={[0, rotation, 0]}
        />
    );
});

GiftMesh.displayName = 'GiftMesh';

/**
 * Main GiftBoxes component
 * Renders all gift boxes - opacity handled by each GiftMesh individually
 */
export const GiftBoxes: React.FC = () => {
    const landingPhase = useStore((state) => state.landingPhase);

    // Load all GLB models (cached by drei)
    const giftGltfs = useGLTF(GIFT_MODELS);

    // Log when models are loaded
    useEffect(() => {
        const gltfArray = Array.isArray(giftGltfs) ? giftGltfs : [giftGltfs];
        if (gltfArray.length > 0 && PARTICLE_CONFIG.performance.enableDebugLogs) {
            console.log(`[GiftBoxes] ${GIFT_MODELS.length} GLB models loaded in phase: ${landingPhase}`);
        }
    }, [giftGltfs, landingPhase]);

    // Calculate positions for all gift boxes
    const giftPositions = useMemo(() => {
        return GIFT_BOX_CONFIGS.map(config => ({
            config,
            position: calculateGiftPosition(config, PARTICLE_CONFIG.treeBase.centerY),
        }));
    }, []);

    // Normalize giftGltfs to array
    const gltfArray = useMemo(() => {
        return Array.isArray(giftGltfs) ? giftGltfs : [giftGltfs];
    }, [giftGltfs]);

    // Don't render if models aren't loaded yet
    if (!gltfArray || gltfArray.length === 0) {
        return null;
    }

    return (
        <group raycast={() => null}>
            {giftPositions.map((gift, i) => {
                // Deterministically pick a model based on index
                const modelIndex = i % gltfArray.length;
                const gltf = gltfArray[modelIndex];

                return (
                    <GiftMesh
                        key={i}
                        scene={gltf.scene}
                        width={gift.config.w}
                        height={gift.config.h}
                        position={gift.position}
                        rotation={gift.config.ang}
                    />
                );
            })}
        </group>
    );
};

export default GiftBoxes;
