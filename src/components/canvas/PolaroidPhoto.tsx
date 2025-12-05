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
    position: [number, number, number]; // Final target position
    rotation: [number, number, number];
    scale: number;
    isExploded: boolean;
    particleStartPosition: [number, number, number]; // Origin particle position (Gift Center)
    morphIndex: number;
    totalPhotos: number;
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
    totalPhotos,
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
            const delay = morphIndex * 0.05;
            const startTime = anim.startTime + delay;
            const elapsed = time - startTime;

            // === SYNCHRONIZED ARRIVAL LOGIC ===
            const minTransitTime = 0.8;
            const ejectionDuration = 0.6;
            const lastPhotoDelay = (totalPhotos - 1) * 0.05;
            const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;

            const myTotalDuration = globalArrivalTime - delay;
            const transitionDuration = myTotalDuration - ejectionDuration;

            if (elapsed > 0) {
                // PHASE 1: EJECTION (Printing from Slot)
                if (elapsed < ejectionDuration) {
                    // === EJECTION PHASE ===
                    const t = elapsed / ejectionDuration;

                    // Position: Rise UP from spawn point
                    const ejectHeight = 1.2;
                    anim.currentPosition.x = particleStartPosition[0];
                    anim.currentPosition.y = particleStartPosition[1] + (t * ejectHeight);
                    anim.currentPosition.z = particleStartPosition[2];

                    // Scale Y: 0->1
                    group.scale.set(scale, scale * t, scale);
                }
                else if (elapsed < myTotalDuration) {
                    // === TRANSITION PHASE ===
                    // Dynamic speed based on available time
                    const t = (elapsed - ejectionDuration) / transitionDuration;
                    const easeOutCubic = 1 - Math.pow(1 - t, 3);

                    // Start: BoxTop (Spawn + EjectHeight)
                    const startY = particleStartPosition[1] + 1.2;

                    // Lerp
                    anim.currentPosition.x = THREE.MathUtils.lerp(particleStartPosition[0], position[0], easeOutCubic);
                    anim.currentPosition.y = THREE.MathUtils.lerp(startY, position[1], easeOutCubic);
                    anim.currentPosition.z = THREE.MathUtils.lerp(particleStartPosition[2], position[2], easeOutCubic);

                    // Rotation
                    anim.currentRotation.x = rotation[0] * easeOutCubic;
                    anim.currentRotation.y = rotation[1] * easeOutCubic;
                    anim.currentRotation.z = rotation[2] * easeOutCubic;

                    group.scale.setScalar(scale);
                }
                else {
                    // Animation Done - Hand over to Orbit Loop
                    anim.isAnimating = false;
                    group.scale.setScalar(scale);
                }

                // Opacity runs over total duration (Fade in during Ejection mainly)
                const opacityProgress = Math.min(elapsed / 0.5, 1);

                if (frameMaterialRef.current) frameMaterialRef.current.opacity = opacityProgress;
                if (photoMaterialRef.current && anim.textureLoaded) photoMaterialRef.current.opacity = opacityProgress;
                if (backPhotoMaterialRef.current && anim.textureLoaded) backPhotoMaterialRef.current.opacity = opacityProgress;

                // Apply updates
                group.position.copy(anim.currentPosition);
                // In Phase 1 we keep rotation 0 (flat/aligned)
                if (elapsed >= ejectionDuration) {
                    group.rotation.copy(anim.currentRotation);
                } else {
                    group.rotation.set(0, 0, 0);
                }
            }
        } else if (isExploded) {
            // === PHASE 2: ORBIT & FLOAT ===
            const minTransitTime = 0.8;
            const ejectionDuration = 0.6;
            const lastPhotoDelay = (totalPhotos - 1) * 0.05;
            const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;

            // Wait until the "Arrival" moment to start orbiting properly?
            const arrivalTimeAbs = (anim.startTime || time) + globalArrivalTime - (morphIndex * 0.05); // Approximate
            // Actually, anim.startTime is absolute. 
            // GlobalArrivalTime is relative to sequence START (anim.startTime).
            // But 'delay' was added above. 
            // Let's rely on standard time.
            const absoluteArrivalTime = anim.startTime + globalArrivalTime;

            if (time > absoluteArrivalTime) {
                const hoverTime = time - absoluteArrivalTime;
                const idx = morphIndex * 0.5;

                // Orbit
                const initialX = position[0];
                const initialZ = position[2];
                const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);
                const initialAngle = Math.atan2(initialZ, initialX);

                // Orbit speed
                const orbitSpeed = 0.05 + (1.0 / (radius + 0.1)) * 0.1;
                const currentAngle = initialAngle + hoverTime * orbitSpeed;

                group.position.x = Math.cos(currentAngle) * radius;
                group.position.z = Math.sin(currentAngle) * radius;

                // Bobbing
                const yBob = Math.sin(hoverTime * 0.5 + idx) * 0.3;
                group.position.y = position[1] + yBob;

                // Rotation
                group.rotation.y = rotation[1] + hoverTime * 0.15;
                group.rotation.x = rotation[0] + Math.sin(hoverTime * 0.3 + idx) * 0.05;
                group.rotation.z = rotation[2] + Math.cos(hoverTime * 0.25 + idx) * 0.05;

                group.scale.setScalar(scale);
            }
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
