/**
 * Polaroid Photo Component - Performance Optimized
 *
 * Optimizations:
 * 1. Use texture preloader with caching (no per-component loading)
 * 2. Use refs instead of state for animation (no re-renders)
 * 3. Reuse materials instead of creating new ones each frame
 * 4. Simpler geometry and fewer draw calls
 */
import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MORPH_TIMING } from '../../config/photoConfig';
import { getCachedTexture } from '../../utils/texturePreloader';

interface PolaroidPhotoProps {
    url: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    isExploded: boolean;
    particleStartPosition: [number, number, number];
    morphIndex: number;
}

// Polaroid frame dimensions
const FRAME = {
    width: 1.0,
    height: 1.2,
    depth: 0.02,
    imageOffsetY: 0.1,
    imageSize: 0.85,
};

// Shared geometries (created once, reused by all instances)
let sharedFrameGeometry: THREE.BoxGeometry | null = null;
let sharedPhotoGeometry: THREE.PlaneGeometry | null = null;

const getSharedGeometries = () => {
    if (!sharedFrameGeometry) {
        sharedFrameGeometry = new THREE.BoxGeometry(FRAME.width, FRAME.height, FRAME.depth);
    }
    if (!sharedPhotoGeometry) {
        sharedPhotoGeometry = new THREE.PlaneGeometry(FRAME.imageSize, FRAME.imageSize);
    }
    return { frameGeometry: sharedFrameGeometry, photoGeometry: sharedPhotoGeometry };
};

export const PolaroidPhoto: React.FC<PolaroidPhotoProps> = ({
    url,
    position,
    rotation,
    scale,
    isExploded,
    particleStartPosition,
    morphIndex,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const frameMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const photoMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
    const backPhotoMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);

    // Animation state (using refs to avoid re-renders)
    const animRef = useRef({
        startTime: -1,
        isAnimating: false,
        isVisible: false,
        morphProgress: 0,
        currentScale: 0,
        currentPosition: new THREE.Vector3(...particleStartPosition),
        currentRotation: new THREE.Euler(0, 0, 0),
        textureLoaded: false,
    });

    // Get shared geometries
    const { frameGeometry, photoGeometry } = useMemo(() => getSharedGeometries(), []);

    // Create materials once (using texture from cache)
    useEffect(() => {
        // Frame material
        frameMaterialRef.current = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });

        // Photo materials (front and back)
        photoMaterialRef.current = new THREE.MeshBasicMaterial({
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0,
        });

        backPhotoMaterialRef.current = new THREE.MeshBasicMaterial({
            side: THREE.FrontSide,
            transparent: true,
            opacity: 0,
        });

        return () => {
            frameMaterialRef.current?.dispose();
            photoMaterialRef.current?.dispose();
            backPhotoMaterialRef.current?.dispose();
        };
    }, []);

    // Handle explosion state change
    useEffect(() => {
        const anim = animRef.current;

        if (isExploded) {
            // Try to get cached texture
            const cachedTexture = getCachedTexture(url);
            if (cachedTexture) {
                if (photoMaterialRef.current) {
                    photoMaterialRef.current.map = cachedTexture;
                    photoMaterialRef.current.needsUpdate = true;
                }
                if (backPhotoMaterialRef.current) {
                    backPhotoMaterialRef.current.map = cachedTexture;
                    backPhotoMaterialRef.current.needsUpdate = true;
                }
                anim.textureLoaded = true;
            }

            anim.isVisible = true;
            anim.isAnimating = true;
            anim.startTime = -1;
            anim.currentPosition.set(...particleStartPosition);
        } else {
            anim.isVisible = false;
            anim.isAnimating = false;
            anim.morphProgress = 0;
            anim.currentScale = 0;

            // Reset material opacity
            if (frameMaterialRef.current) frameMaterialRef.current.opacity = 0;
            if (photoMaterialRef.current) photoMaterialRef.current.opacity = 0;
            if (backPhotoMaterialRef.current) backPhotoMaterialRef.current.opacity = 0;
        }
    }, [isExploded, url, particleStartPosition]);

    // Animation frame - optimized to minimize allocations
    useFrame((state) => {
        const group = groupRef.current;
        const anim = animRef.current;

        if (!group || !anim.isVisible) return;

        const time = state.clock.elapsedTime;

        if (anim.isAnimating) {
            // Initialize start time on first frame
            if (anim.startTime < 0) {
                anim.startTime = time;
            }

            // Calculate morph progress with stagger
            const staggeredStart = MORPH_TIMING.startDelay + morphIndex * MORPH_TIMING.staggerDelay;
            const elapsed = time - anim.startTime - staggeredStart;

            if (elapsed > 0) {
                const rawProgress = Math.min(elapsed / MORPH_TIMING.morphDuration, 1);
                // Ease-out cubic
                const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
                anim.morphProgress = easedProgress;

                // Update material opacity directly (no state change)
                if (frameMaterialRef.current) {
                    frameMaterialRef.current.opacity = easedProgress;
                }
                if (photoMaterialRef.current && anim.textureLoaded) {
                    photoMaterialRef.current.opacity = easedProgress;
                }
                if (backPhotoMaterialRef.current && anim.textureLoaded) {
                    backPhotoMaterialRef.current.opacity = easedProgress;
                }

                // Interpolate position (avoiding new Vector3 allocation)
                const lerpFactor = easedProgress * 0.15; // Smooth lerp
                anim.currentPosition.x += (position[0] - anim.currentPosition.x) * lerpFactor;
                anim.currentPosition.y += (position[1] - anim.currentPosition.y) * lerpFactor;
                anim.currentPosition.z += (position[2] - anim.currentPosition.z) * lerpFactor;

                // Scale interpolation
                if (easedProgress < 0.3) {
                    anim.currentScale = (easedProgress / 0.3) * scale * 0.5;
                } else {
                    anim.currentScale = (0.5 + ((easedProgress - 0.3) / 0.7) * 0.5) * scale;
                }

                // Rotation interpolation
                anim.currentRotation.x = rotation[0] * easedProgress;
                anim.currentRotation.y = rotation[1] * easedProgress;
                anim.currentRotation.z = rotation[2] * easedProgress;

                // Apply transforms
                group.position.copy(anim.currentPosition);
                group.rotation.copy(anim.currentRotation);
                group.scale.setScalar(anim.currentScale);

                // Check if animation complete
                if (rawProgress >= 1) {
                    anim.isAnimating = false;
                }
            }
        } else if (isExploded) {
            // Post-morph floating animation (simplified)
            const floatTime = time * 0.5;
            const idx = morphIndex * 0.5;

            group.position.x = position[0] + Math.sin(floatTime + idx) * 0.1;
            group.position.y = position[1] + Math.cos(floatTime * 0.7 + idx * 0.6) * 0.08;
            group.position.z = position[2] + Math.sin(floatTime * 0.6 + idx * 1.4) * 0.05;

            group.rotation.y = rotation[1] + Math.sin(floatTime * 0.3) * 0.1;
            group.rotation.z = rotation[2] + Math.cos(floatTime * 0.4) * 0.05;

            group.scale.setScalar(scale);
        }
    });

    // Don't render when not visible
    if (!isExploded && !animRef.current.isVisible) return null;

    return (
        <group ref={groupRef} position={particleStartPosition} scale={0}>
            {/* Polaroid Frame */}
            <mesh geometry={frameGeometry}>
                {frameMaterialRef.current && (
                    <primitive object={frameMaterialRef.current} attach="material" />
                )}
            </mesh>

            {/* Photo Image - Front */}
            <mesh position={[0, FRAME.imageOffsetY, FRAME.depth / 2 + 0.001]} geometry={photoGeometry}>
                {photoMaterialRef.current && (
                    <primitive object={photoMaterialRef.current} attach="material" />
                )}
            </mesh>

            {/* Photo Image - Back (same content) */}
            <mesh
                position={[0, FRAME.imageOffsetY, -FRAME.depth / 2 - 0.001]}
                rotation={[0, Math.PI, 0]}
                geometry={photoGeometry}
            >
                {backPhotoMaterialRef.current && (
                    <primitive object={backPhotoMaterialRef.current} attach="material" />
                )}
            </mesh>
        </group>
    );
};
