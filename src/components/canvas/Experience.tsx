import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
// Force HMR refresh for ReferenceError fix

import { useFrame, useThree } from '@react-three/fiber';
import { TreeParticles } from './TreeParticles.tsx';

import { CameraController } from './CameraController.tsx';
import { useStore } from '../../store/useStore';

import { UIState } from '../../types.ts';
import { ASSET_CONFIG } from '../../config/assets.ts';
import { PARTICLE_CONFIG } from '../../config/particles';
import { GlobalVideoController } from './GlobalVideoController'; // NEW
import { PERFORMANCE_CONFIG, CAMERA_CONFIG, SCENE_CONFIG } from '../../config';
import { getResponsiveValue } from '../../utils/responsiveUtils';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// Scratch vector for camera drift (avoids per-frame allocation)
const tempDriftVec = new THREE.Vector3();

interface ExperienceProps {
    uiState: UIState;
    visible?: boolean;
}







export const Experience: React.FC<ExperienceProps> = ({ uiState, visible = true }) => {
    const { config, isExploded, toggleExplosion, photos } = uiState;
    const particleCount = useStore((state) => state.particleCount);
    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId); // Consume hover state
    const activePhoto = useStore((state) => state.activePhoto);
    const setActivePhoto = useStore((state) => state.setActivePhoto);
    const playingVideoInHover = useStore((state) => state.playingVideoInHover); // NEW: Hover video state
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

    // NEW: Ref for VolumetricRays (moved from component)
    const raysRef = useRef<THREE.Group>(null);

    // MagicDust moved to SceneContainer

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
        // Skip if a photo is active (CameraController is controlling the camera)
        if (activePhoto) return;

        if (hoveredPhotoInstanceId === null && isExploded && controlsRef.current) {
            // When hover ends, force OrbitControls to resume auto-rotation immediately
            // Reset interaction state to bypass idle threshold waiting
            idleRef.current.isInteracting = false;
            idleRef.current.lastInteractionTime = 0; // Set to 0 to immediately pass idle threshold
            idleRef.current.isIdle = true;

            // Force controls update to apply autoRotate immediately
            controlsRef.current.update();
        }
    }, [hoveredPhotoInstanceId, isExploded, activePhoto]);

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

    // === CONSOLIDATED useFrame: Camera Drift Only (Lighting moved to SceneContainer) ===
    useFrame((state, delta) => {
        // Skip all camera manipulation when a photo is active (during rotating/zooming animation)
        // CameraController has exclusive control during this time
        if (activePhoto) return;

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
                // Ensure controls update to process auto-rotation and damping
                controlsRef.current?.update();
            }
        }
    });

    return (
        <>
            <DreiOrbitControls
                ref={controlsRef}
                enabled={visible && !activePhoto && !playingVideoInHover} // Disable controls when hidden, looking at photo, or playing hover video
                enablePan={SCENE_CONFIG.orbitControls.enablePan}
                minDistance={SCENE_CONFIG.orbitControls.minDistance}
                maxDistance={CAMERA_CONFIG.limits.maxDistance}
                autoRotate={isExploded && !hoveredPhotoInstanceId && !activePhoto && !playingVideoInHover} // Stop rotation on hover, active, or hover video
                autoRotateSpeed={SCENE_CONFIG.orbitControls.autoRotateSpeed}
                enableZoom={SCENE_CONFIG.orbitControls.enableZoom}
                maxPolarAngle={SCENE_CONFIG.orbitControls.maxPolarAngle}
                onStart={handleControlStart}
                onEnd={handleControlEnd}
            />



            {/* <MagicDust /> moved to SceneContainer for persistence */}

            {/* === THE TREE === */}
            <TreeParticles isExploded={isExploded} config={config} onParticlesClick={toggleExplosion} photos={photos} />

            {/* === LIGHTBOX OVERLAY === */}
            <CameraController />

            {/* === GLOBAL VIDEO CONTROLLER === */}
            <GlobalVideoController />

            {/* === FLOOR === */}



        </>
    );
};
