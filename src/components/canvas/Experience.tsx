import React, { useRef, useEffect, useCallback } from 'react';
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







// PERFORMANCE: Wrap component in React.memo
export const Experience = React.memo(({ uiState, visible = true }: ExperienceProps) => {
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

    // Track reset animation state
    const resetAnimRef = useRef<{
        startTime: number;
        startPos: THREE.Vector3;
        initialPos: THREE.Vector3;
        initialLookAt: THREE.Vector3;
        isAnimating: boolean;
    } | null>(null);

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
            resetAnimRef.current = {
                startTime: Date.now(),
                startPos: camera.position.clone(),
                initialPos: new THREE.Vector3(...getResponsiveValue(CAMERA_CONFIG.default.position)),
                initialLookAt: new THREE.Vector3(0, 0, 0),
                isAnimating: true,
            };
        }

        prevIsExplodedRef.current = isExploded;
    }, [isExploded, camera]);

    // === PERFORMANCE: Dynamic post-processing toggle ===
    // Moved to CinematicEffects.tsx

    // === CONSOLIDATED useFrame ===
    useFrame((state, delta) => {
        // Handle Camera Reset Animation (Priority)
        if (resetAnimRef.current?.isAnimating) {
            const anim = resetAnimRef.current;
            const elapsed = Date.now() - anim.startTime;
            const duration = CAMERA_CONFIG.transition.resetAnimationDuration;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            camera.position.lerpVectors(anim.startPos, anim.initialPos, eased);
            // Limit camera z position to maximum value
            if (camera.position.z > CAMERA_CONFIG.limits.maxZPosition) {
                camera.position.z = CAMERA_CONFIG.limits.maxZPosition;
            }
            camera.lookAt(anim.initialLookAt);

            if (progress >= 1) {
                anim.isAnimating = false;
                resetAnimRef.current = null;
                // Release reset lock after animation completes
                useStore.getState().setResetLock(false);
            }
            return; // Exclusive control during reset
        }

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
    const isResetLocked = useStore((state) => state.isResetLocked);

    return (
        <>
            {/* === CAMERA & CONTROLS === */}
            <DreiOrbitControls
                ref={controlsRef}
                makeDefault
                enabled={visible && !activePhoto && !playingVideoInHover && !isResetLocked} // Locked during reset
                enableRotate={true}
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
            <TreeParticles
                isExploded={isExploded}
                config={config}
                onParticlesClick={toggleExplosion}
                photos={photos}
                visible={visible} // Pass visibility down
            />

            {/* === LIGHTBOX OVERLAY === */}
            <CameraController />

            {/* === GLOBAL VIDEO CONTROLLER === */}
            <GlobalVideoController />

            {/* === FLOOR === */}



        </>
    );
});
