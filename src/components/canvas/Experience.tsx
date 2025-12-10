import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { OrbitControls as DreiOrbitControls, Stars, Environment } from '@react-three/drei';

import { useFrame, useThree } from '@react-three/fiber';
import { TreeParticles } from './TreeParticles.tsx';
import { MagicDust } from './MagicDust.tsx';
import { CameraController } from './CameraController.tsx';
import { useStore } from '../../store/useStore';

import { UIState } from '../../types.ts';
import { MEMORIES } from '../../config/assets.ts';
import { PARTICLE_CONFIG } from '../../config/particles';
import { PERFORMANCE_CONFIG, CAMERA_CONFIG, SCENE_CONFIG, getResponsiveValue } from '../../config';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Scratch vector for camera drift (avoids per-frame allocation)
const tempDriftVec = new THREE.Vector3();

interface ExperienceProps {
    uiState: UIState;
}







export const Experience: React.FC<ExperienceProps> = ({ uiState }) => {
    const { config, isExploded, toggleExplosion, photos } = uiState;
    const particleCount = useStore((state) => state.particleCount);
    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId); // Consume hover state
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

    // Reset idle tracking when hover preview ends to resume auto-rotation immediately
    useEffect(() => {
        if (hoveredPhotoInstanceId === null && isExploded && controlsRef.current) {
            // When hover ends, force OrbitControls to resume auto-rotation immediately
            // Reset interaction state to bypass idle threshold waiting
            idleRef.current.isInteracting = false;
            idleRef.current.lastInteractionTime = 0; // Set to 0 to immediately pass idle threshold
            idleRef.current.isIdle = true;

            // Force controls update to apply autoRotate immediately
            controlsRef.current.update();
        }
    }, [hoveredPhotoInstanceId, isExploded]);

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
            const initialPos = new THREE.Vector3(...getResponsiveValue(CAMERA_CONFIG.default.position));
            const initialLookAt = new THREE.Vector3(0, 0, 0);

            // Use manual lerp with requestAnimationFrame for smooth transition
            const startPos = camera.position.clone();
            const startTime = Date.now();
            const duration = CAMERA_CONFIG.transition.resetAnimationDuration; // 重置动画持续时间

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);

                camera.position.lerpVectors(startPos, initialPos, eased);
                // Limit camera z position to maximum value
                if (camera.position.z > CAMERA_CONFIG.limits.maxZPosition) {
                    camera.position.z = CAMERA_CONFIG.limits.maxZPosition;
                }
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

    // === PERFORMANCE: Dynamic post-processing toggle ===
    // Moved to CinematicEffects.tsx

    // === CONSOLIDATED useFrame: Camera Drift + Light Dimming + VolumetricRays + Post-Processing ===
    useFrame((state, delta) => {
        const idle = idleRef.current;
        const isHovered = hoveredPhotoInstanceId !== null;



        // === 1. IDLE CHECK & CAMERA DRIFT ===
        if (!isExploded) {
            idle.isIdle = false;
        } else {
            // Check if user became idle
            if (!idle.isInteracting) {
                const timeSinceInteraction = Date.now() - idle.lastInteractionTime;
                idle.isIdle = timeSinceInteraction > PERFORMANCE_CONFIG.camera.idleThreshold;
            }

            // Apply drift when idle (and NOT hovering)
            if (idle.isIdle && !isHovered) {
                const currentDistance = camera.position.length();

                // Only drift if not too close
                if (currentDistance > PERFORMANCE_CONFIG.camera.minDistance) {
                    // Reuse scratch vector to avoid GC
                    tempDriftVec.copy(camera.position).normalize().negate();
                    tempDriftVec.multiplyScalar(PERFORMANCE_CONFIG.camera.driftSpeed * delta);
                    camera.position.add(tempDriftVec);
                    // Limit camera z position to maximum value
                    if (camera.position.z > CAMERA_CONFIG.limits.maxZPosition) {
                        camera.position.z = CAMERA_CONFIG.limits.maxZPosition;
                    }

                    // Update OrbitControls to match new camera position
                    controlsRef.current?.update();
                }
            }
        }

        // === 2. LIGHT DIMMING ===
        const targetFactor = isHovered ? SCENE_CONFIG.lighting.dimming.targetFactorHovered : SCENE_CONFIG.lighting.dimming.targetFactorNormal;
        const lerpSpeed = SCENE_CONFIG.lighting.dimming.lerpSpeed * delta;

        if (ambientRef.current) {
            ambientRef.current.intensity = THREE.MathUtils.lerp(
                ambientRef.current.intensity, SCENE_CONFIG.lighting.ambient.intensity * targetFactor, lerpSpeed
            );
        }
        if (mainSpotRef.current) {
            mainSpotRef.current.intensity = THREE.MathUtils.lerp(
                mainSpotRef.current.intensity, SCENE_CONFIG.lighting.mainSpot.intensity * targetFactor, lerpSpeed
            );
        }
        if (fillSpotRef.current) {
            fillSpotRef.current.intensity = THREE.MathUtils.lerp(
                fillSpotRef.current.intensity, SCENE_CONFIG.lighting.fillSpot.intensity * targetFactor, lerpSpeed
            );
        }
    });

    return (
        <>
            <DreiOrbitControls
                ref={controlsRef}
                enabled={!activePhoto} // Disable controls when looking at a photo
                enablePan={SCENE_CONFIG.orbitControls.enablePan}
                minDistance={SCENE_CONFIG.orbitControls.minDistance}
                maxDistance={CAMERA_CONFIG.limits.maxDistance}
                autoRotate={isExploded && !hoveredPhotoInstanceId} // Stop rotation on hover
                autoRotateSpeed={SCENE_CONFIG.orbitControls.autoRotateSpeed}
                enableZoom={SCENE_CONFIG.orbitControls.enableZoom}
                maxPolarAngle={SCENE_CONFIG.orbitControls.maxPolarAngle}
                onStart={handleControlStart}
                onEnd={handleControlEnd}
            />

            {/* === CINEMATIC LIGHTING === */}
            <ambientLight ref={ambientRef} intensity={SCENE_CONFIG.lighting.ambient.intensity} color={SCENE_CONFIG.lighting.ambient.color} />

            {/* Main Key Light */}
            <spotLight
                ref={mainSpotRef}
                position={SCENE_CONFIG.lighting.mainSpot.position}
                intensity={SCENE_CONFIG.lighting.mainSpot.intensity}
                color={SCENE_CONFIG.lighting.mainSpot.color}
                angle={SCENE_CONFIG.lighting.mainSpot.angle}
                penumbra={SCENE_CONFIG.lighting.mainSpot.penumbra}
                decay={SCENE_CONFIG.lighting.mainSpot.decay}
                distance={SCENE_CONFIG.lighting.mainSpot.distance}
                castShadow={false}
            />

            {/* Fill Light */}
            <spotLight
                ref={fillSpotRef}
                position={SCENE_CONFIG.lighting.fillSpot.position}
                intensity={SCENE_CONFIG.lighting.fillSpot.intensity}
                color={SCENE_CONFIG.lighting.fillSpot.color}
                angle={SCENE_CONFIG.lighting.fillSpot.angle}
                penumbra={SCENE_CONFIG.lighting.fillSpot.penumbra}
                decay={SCENE_CONFIG.lighting.fillSpot.decay}
                distance={SCENE_CONFIG.lighting.fillSpot.distance}
            />

            {/* OPTIMIZATION: Configured for 3-point lighting only. 
                Removed extra PointLights and BackLight to save draw calls/fragment shader cost. 
            */}



            {/* === ENVIRONMENT === */}
            <Environment preset={SCENE_CONFIG.environment.preset} />
            <Stars radius={SCENE_CONFIG.environment.stars.radius} depth={SCENE_CONFIG.environment.stars.depth} count={SCENE_CONFIG.environment.stars.count} factor={SCENE_CONFIG.environment.stars.factor} saturation={SCENE_CONFIG.environment.stars.saturation} fade={SCENE_CONFIG.environment.stars.fade} speed={SCENE_CONFIG.environment.stars.speed} />

            <MagicDust count={magicDustCount} isExploded={isExploded} />

            {/* === THE TREE === */}
            <TreeParticles isExploded={isExploded} config={config} onParticlesClick={toggleExplosion} photos={photos} />

            {/* === LIGHTBOX OVERLAY === */}
            <CameraController />

            {/* === FLOOR === */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}
                position={SCENE_CONFIG.floor.position}
                receiveShadow
                onClick={(e) => {
                    e.stopPropagation();
                    // Close active photo if open
                    if (activePhoto) {
                        setActivePhoto(null);
                    }
                    // Clear hover preview (for mobile tap-to-preview)
                    const setHoveredPhoto = useStore.getState().setHoveredPhoto;
                    setHoveredPhoto(null);
                }}
            >
                <circleGeometry args={[SCENE_CONFIG.floor.radius, SCENE_CONFIG.floor.segments]} />
                <meshStandardMaterial color={SCENE_CONFIG.floor.material.color} metalness={SCENE_CONFIG.floor.material.metalness} roughness={SCENE_CONFIG.floor.material.roughness} envMapIntensity={SCENE_CONFIG.floor.material.envMapIntensity} />
            </mesh>


        </>
    );
};
