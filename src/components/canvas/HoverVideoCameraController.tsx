import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { CAMERA_CONFIG } from '../../config/performance';

/**
 * HoverVideoCameraController
 * 
 * Controls camera movement when playing video in hover mode.
 * Camera positions itself in front of the photo (outside the orbit circle)
 * so the user can watch the video clearly.
 */

// Scratch objects to avoid GC
const targetPos = new THREE.Vector3();
const cameraTargetPos = new THREE.Vector3();
const directionFromCenter = new THREE.Vector3();

export const HoverVideoCameraController = () => {
    const playingVideoInHover = useStore((state) => state.playingVideoInHover);

    useFrame((state, delta) => {
        if (!playingVideoInHover) return;

        const camera = state.camera;

        // Get photo position from state
        targetPos.set(
            playingVideoInHover.photoPosition[0],
            playingVideoInHover.photoPosition[1],
            playingVideoInHover.photoPosition[2]
        );

        // Calculate photo's radius from center (for orbit)
        const photoRadius = Math.sqrt(
            targetPos.x * targetPos.x + targetPos.z * targetPos.z
        );

        // Calculate direction from center to photo (normalized)
        if (photoRadius > 0.01) {
            directionFromCenter.set(targetPos.x / photoRadius, 0, targetPos.z / photoRadius);
        } else {
            directionFromCenter.set(0, 0, 1); // Fallback
        }

        // Camera should be positioned OUTSIDE the orbit, looking at the photo
        // Position = photo position + direction * cameraDistance
        const cameraDistance = CAMERA_CONFIG.hoverVideo.cameraDistance;

        cameraTargetPos.set(
            targetPos.x + directionFromCenter.x * cameraDistance,
            targetPos.y + CAMERA_CONFIG.hoverVideo.cameraHeightOffset,
            targetPos.z + directionFromCenter.z * cameraDistance
        );

        // Smooth camera movement using exponential decay
        const lerpFactor = 1 - Math.exp(-CAMERA_CONFIG.hoverVideo.transitionSpeed * delta);

        camera.position.lerp(cameraTargetPos, lerpFactor);

        // Look at the photo center
        camera.lookAt(targetPos);
    });

    return null;
};

