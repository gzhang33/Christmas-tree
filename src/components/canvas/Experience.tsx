import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { OrbitControls as DreiOrbitControls, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Snow } from './Snow.tsx';
import { TreeParticles } from './TreeParticles.tsx';
import { MagicDust } from './MagicDust.tsx';
import { CameraController } from './CameraController.tsx';
import { useStore } from '../../store/useStore';

import { UIState } from '../../types.ts';
import { MEMORIES } from '../../config/assets.ts';
import { PARTICLE_CONFIG } from '../../config/particles';
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Scratch vector for camera drift (avoids per-frame allocation)
const tempDriftVec = new THREE.Vector3();

interface ExperienceProps {
    uiState: UIState;
}

// Camera drift configuration
const CAMERA_DRIFT = {
    speed: 0.15,           // units per second (subtle movement)
    idleThreshold: 2000,   // ms before drift starts
    minDistance: 12,       // don't get closer than this
};

// Volumetric light rays component
// OPTIMIZED: useFrame moved to Experience for better performance
const VolumetricRays: React.FC<{
    isExploded: boolean;
    raysRef: React.RefObject<THREE.Group>; // NEW: Accept ref from parent
}> = ({ isExploded, raysRef }) => {
    // REMOVED: Internal useFrame - now handled by Experience

    if (isExploded) return null;

    return (
        <group ref={raysRef} position={[0, 2, 0]}>
            {[0, 1, 2, 3].map((i) => {
                const angle = (i / 4) * Math.PI * 2;
                return (
                    <spotLight
                        key={i}
                        position={[Math.cos(angle) * 3, 12, Math.sin(angle) * 3]}
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
    const particleCount = useStore((state) => state.particleCount);
    const hoveredPhotoId = useStore((state) => state.hoveredPhotoId); // Consume hover state
    const activePhoto = useStore((state) => state.activePhoto);
    const setActivePhoto = useStore((state) => state.setActivePhoto);
    const { camera } = useThree();

    // OrbitControls ref for idle detection
    const controlsRef = useRef<OrbitControlsImpl>(null);

    // Idle tracking state (using refs to avoid re-renders)
    const idleRef = useRef({
        isInteracting: false,
        lastInteractionTime: Date.now(),
        isIdle: false,
    });

    // RAF animation ID for camera reset animation
    const animationIdRef = useRef<number | null>(null);

    // Light refs for dimming effect
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const mainSpotRef = useRef<THREE.SpotLight>(null);
    const fillSpotRef = useRef<THREE.SpotLight>(null);

    // NEW: Ref for VolumetricRays (moved from component)
    const raysRef = useRef<THREE.Group>(null);

    const magicDustCount = useMemo(() => {
        return Math.floor(
            Math.max(particleCount * PARTICLE_CONFIG.ratios.magicDust, PARTICLE_CONFIG.minCounts.magicDust)
        );
    }, [particleCount]);

    // Handle OrbitControls interaction events
    const handleControlStart = useCallback(() => {
        idleRef.current.isInteracting = true;
        idleRef.current.isIdle = false;
    }, []);

    const handleControlEnd = useCallback(() => {
        idleRef.current.isInteracting = false;
        idleRef.current.lastInteractionTime = Date.now();
    }, []);

    // Reset camera position when returning from exploded state to tree state
    const prevIsExplodedRef = useRef(isExploded);
    useEffect(() => {
        // Detect transition from exploded (true) to tree (false)
        if (prevIsExplodedRef.current && !isExploded) {
            // Cancel any existing animation to avoid overlap
            if (animationIdRef.current !== null) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }

            // Smoothly animate camera back to initial position
            const initialPos = new THREE.Vector3(0, 5, 28);
            const initialLookAt = new THREE.Vector3(0, 0, 0);

            // Use manual lerp with requestAnimationFrame for smooth transition
            const startPos = camera.position.clone();
            const startTime = Date.now();
            const duration = 1500; // 1.5 seconds

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);

                camera.position.lerpVectors(startPos, initialPos, eased);
                camera.lookAt(initialLookAt);

                if (progress < 1) {
                    animationIdRef.current = requestAnimationFrame(animate);
                } else {
                    animationIdRef.current = null;
                }
            };

            animationIdRef.current = requestAnimationFrame(animate);
        }

        prevIsExplodedRef.current = isExploded;

        // Cleanup: cancel animation on unmount or when isExploded changes
        return () => {
            if (animationIdRef.current !== null) {
                cancelAnimationFrame(animationIdRef.current);
                animationIdRef.current = null;
            }
        };
    }, [isExploded, camera]);

    // === POST PROCESSING REFS ===
    const dofRef = useRef<any>(null);
    const chromaticRef = useRef<any>(null);
    const bloomRef = useRef<any>(null);

    // === PERFORMANCE: Dynamic post-processing toggle ===
    const enableEffects = isExploded || !!hoveredPhotoId;

    // === CONSOLIDATED useFrame: Camera Drift + Light Dimming + VolumetricRays + Post-Processing ===
    useFrame((state, delta) => {
        const idle = idleRef.current;
        const isHovered = !!hoveredPhotoId;

        // === 0. VOLUMETRIC RAYS ROTATION (moved from VolumetricRays component) ===
        if (raysRef.current && !isExploded) {
            raysRef.current.rotation.y = state.clock.elapsedTime * 0.05;
        }

        // === 1. IDLE CHECK & CAMERA DRIFT ===
        if (!isExploded) {
            idle.isIdle = false;
        } else {
            // Check if user became idle
            if (!idle.isInteracting) {
                const timeSinceInteraction = Date.now() - idle.lastInteractionTime;
                idle.isIdle = timeSinceInteraction > CAMERA_DRIFT.idleThreshold;
            }

            // Apply drift when idle (and NOT hovering)
            if (idle.isIdle && !isHovered) {
                const currentDistance = camera.position.length();

                // Only drift if not too close
                if (currentDistance > CAMERA_DRIFT.minDistance) {
                    // Reuse scratch vector to avoid GC
                    tempDriftVec.copy(camera.position).normalize().negate();
                    tempDriftVec.multiplyScalar(CAMERA_DRIFT.speed * delta);
                    camera.position.add(tempDriftVec);

                    // Update OrbitControls to match new camera position
                    controlsRef.current?.update();
                }
            }
        }

        // === 2. LIGHT DIMMING ===
        const targetFactor = isHovered ? 0.3 : 1.0;
        const lerpSpeed = 3.0 * delta;

        if (ambientRef.current) {
            ambientRef.current.intensity = THREE.MathUtils.lerp(
                ambientRef.current.intensity, 0.15 * targetFactor, lerpSpeed
            );
        }
        if (mainSpotRef.current) {
            mainSpotRef.current.intensity = THREE.MathUtils.lerp(
                mainSpotRef.current.intensity, 1.2 * targetFactor, lerpSpeed
            );
        }
        if (fillSpotRef.current) {
            fillSpotRef.current.intensity = THREE.MathUtils.lerp(
                fillSpotRef.current.intensity, 0.8 * targetFactor, lerpSpeed
            );
        }

        // === 3. POST-PROCESSING UPDATES (only if effects are enabled) ===
        if (!enableEffects) return;

        // DOF Logic - FIXED: Disable DOF when hovering to keep focused photo sharp
        // DOF should only blur background when NOT hovering
        if (dofRef.current) {
            // When hovering, we want the hovered photo to be SHARP
            // So we disable DOF entirely (focalLength = 0 means no blur)
            let targetFocalLength = 0.0; // Default: no blur

            // Note: We've removed the hover blur logic
            // The hovered photo should always be sharp

            dofRef.current.focalLength = THREE.MathUtils.lerp(
                dofRef.current.focalLength, targetFocalLength, delta * 2
            );
        }

        // Chromatic Aberration
        if (chromaticRef.current) {
            const targetOffset = isExploded && !isHovered ? 0.002 : 0.0002;
            chromaticRef.current.offset.x = THREE.MathUtils.lerp(
                chromaticRef.current.offset.x, targetOffset, delta
            );
            chromaticRef.current.offset.y = THREE.MathUtils.lerp(
                chromaticRef.current.offset.y, targetOffset, delta
            );
        }
    });

    return (
        <>
            {/* PERFORMANCE: Only render effects when needed */}
            {enableEffects && (
                <EffectComposer enableNormalPass={false}>
                    {/* REMOVED: DepthOfField - causes blur on hover/active photos */}
                    {/* We want hovered and active photos to be SHARP, not blurred */}
                    <Bloom
                        ref={bloomRef}
                        luminanceThreshold={1.1}
                        levels={9}
                        intensity={1.0}
                        radius={0.8}
                    />
                    {isExploded && !hoveredPhotoId && (
                        <ChromaticAberration
                            ref={chromaticRef}
                            offset={new THREE.Vector2(0.0002, 0.0002)}
                            radialModulation={false}
                            modulationOffset={0}
                        />
                    )}
                </EffectComposer>
            )}

            <DreiOrbitControls
                ref={controlsRef}
                enabled={!activePhoto} // Disable controls when looking at a photo
                enablePan={false}
                minDistance={10}
                maxDistance={50}
                autoRotate={isExploded && !hoveredPhotoId} // Stop rotation on hover
                autoRotateSpeed={0.3}
                enableZoom={true}
                maxPolarAngle={Math.PI / 2 - 0.02}
                onStart={handleControlStart}
                onEnd={handleControlEnd}
            />

            {/* === CINEMATIC LIGHTING === */}
            <ambientLight ref={ambientRef} intensity={0.15} color="#FFFFFF" />

            <spotLight
                ref={mainSpotRef}
                position={[-5, 10, -5]}
                intensity={1.2}
                color="#FFB7C5"
                angle={0.7}
                penumbra={1}
                decay={1.5}
                distance={50}
                castShadow={false}
            />

            <spotLight
                ref={fillSpotRef}
                position={[5, 8, 5]}
                intensity={0.8}
                color="#E0F7FA"
                angle={0.6}
                penumbra={1}
                decay={1.5}
                distance={40}
            />

            <pointLight position={[-10, 5, 10]} intensity={1.2} color="#FFB6C1" distance={30} decay={2} />

            <pointLight position={[0, -4, 8]} intensity={1.8} color="#FFC0CB" distance={18} decay={2} />

            <spotLight
                position={[-12, 6, -12]}
                intensity={2.0}
                color="#E6E6FA"
                angle={0.5}
                penumbra={1}
                decay={1.5}
                distance={35}
            />

            <VolumetricRays isExploded={isExploded} raysRef={raysRef} />

            {/* === ENVIRONMENT === */}
            <Stars radius={150} depth={60} count={6000} factor={4} saturation={0.1} fade speed={0.3} />

            <Snow count={Math.floor(config.snowDensity)} />

            <MagicDust count={magicDustCount} isExploded={isExploded} />

            {/* === THE TREE === */}
            <TreeParticles isExploded={isExploded} config={config} onParticlesClick={toggleExplosion} photos={photos} />

            {/* === LIGHTBOX OVERLAY === */}
            <CameraController />


            {/* === FLOOR === */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -6.6, 0]}
                receiveShadow
                onClick={(e) => {
                    e.stopPropagation();
                    if (activePhoto) {
                        setActivePhoto(null);
                    }
                }}
            >
                <circleGeometry args={[25, 64]} />
                <meshStandardMaterial color="#050001" metalness={0.7} roughness={0.3} envMapIntensity={0.5} />
            </mesh>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.55, 0]}>
                <circleGeometry args={[8, 32]} />
                <meshBasicMaterial color="#3D1A2A" transparent opacity={0.3} />
            </mesh>
        </>
    );
};
