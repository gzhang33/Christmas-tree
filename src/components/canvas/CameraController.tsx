import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { CAMERA_CONFIG, getResponsiveValue } from '../../config';

export const CameraController: React.FC = () => {
    const activePhoto = useStore(state => state.activePhoto);
    const { camera } = useThree();

    // Scratch objects
    const targetPos = useRef(new THREE.Vector3());
    const targetLook = useRef(new THREE.Vector3());
    const dummyQ = useRef(new THREE.Quaternion());
    const dummyE = useRef(new THREE.Euler());
    const offset = useRef(new THREE.Vector3());
    const hadActivePhoto = useRef(false); // Track if we ever had an active photo
    // Reusable quaternions for camera rotation interpolation
    const currentQRef = useRef(new THREE.Quaternion());
    const targetQRef = useRef(new THREE.Quaternion());
    // Default camera pose (reusable to avoid per-frame allocation)
    const defaultPosRef = useRef(new THREE.Vector3(...getResponsiveValue(CAMERA_CONFIG.default.position)));
    const defaultLookAtRef = useRef(new THREE.Vector3(...CAMERA_CONFIG.default.lookAt));

    // Update default position on window resize to support responsive layout changes
    React.useEffect(() => {
        const handleResize = () => {
            const newPos = getResponsiveValue(CAMERA_CONFIG.default.position);
            defaultPosRef.current.set(newPos[0], newPos[1], newPos[2]);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Track when photo was closed to allow brief return animation
    const photoClosedTime = useRef<number | null>(null);

    useFrame((state, delta) => {
        if (!activePhoto) {
            // Only smooth return if we previously had an active photo
            // This prevents camera movement on initial load
            if (hadActivePhoto.current) {
                // Initialize close time if not set
                if (photoClosedTime.current === null) {
                    photoClosedTime.current = state.clock.getElapsedTime();
                }

                // Calculate elapsed time since photo was closed
                const elapsedSinceClose = state.clock.getElapsedTime() - photoClosedTime.current;

                // Only animate return for a brief period after closing photo
                if (elapsedSinceClose < CAMERA_CONFIG.transition.returnAnimationDuration) {
                    // Smooth return to default pose when activePhoto becomes null
                    // Compute damp factor from delta
                    const damp = Math.min(CAMERA_CONFIG.transition.returnDampingSpeed * delta, 1.0);

                    // Lerp camera position toward default
                    state.camera.position.lerp(defaultPosRef.current, damp);

                    // Smoothly lerp camera rotation toward default lookAt
                    currentQRef.current.copy(state.camera.quaternion);
                    state.camera.lookAt(defaultLookAtRef.current);
                    targetQRef.current.copy(state.camera.quaternion);
                    state.camera.quaternion.copy(currentQRef.current);
                    state.camera.quaternion.slerp(targetQRef.current, damp);
                } else {
                    // After animation completes, reset flag to allow user control
                    hadActivePhoto.current = false;
                    photoClosedTime.current = null;
                }
            }

            return;
        }

        // Mark that we have an active photo and reset close time
        hadActivePhoto.current = true;
        photoClosedTime.current = null;

        // Calculate target based on Active Photo snapshot
        // We position the camera "In Front" of the photo
        const [px, py, pz] = activePhoto.position;
        const [rx, ry, rz] = activePhoto.rotation;

        targetLook.current.set(px, py, pz);

        // Resolve Photo Orientation
        dummyE.current.set(rx, ry, rz);
        dummyQ.current.setFromEuler(dummyE.current);

        // Calculate Offset: Use fixed logic for "Immersive Zoom"
        // We want the photo (scale 2.5) to occupy a consistent visual height.
        // Screen Height = 2 * Distance * tan(FOV/2).
        // For a ~60% screen coverage height at scale 2.5:
        // 2.5 (Height) / 0.6 = 4.16 (Visible Height)
        // Distance = 4.16 / (2 * tan(25deg)) ~= 5.5 units (using 5.5 for better framing)

        offset.current.set(0, 0, CAMERA_CONFIG.photoView.distance); // Fixed distance for consistent framing
        offset.current.applyQuaternion(dummyQ.current);

        // Target Camera Position
        targetPos.current.copy(targetLook.current).add(offset.current);

        // Smoothly Interpolate Camera Position
        const damp = Math.min(CAMERA_CONFIG.photoView.dampingSpeed * delta, 1.0);
        state.camera.position.lerp(targetPos.current, damp);

        // Limit camera z position to maximum value
        if (state.camera.position.z > CAMERA_CONFIG.limits.maxZPosition) {
            state.camera.position.z = CAMERA_CONFIG.limits.maxZPosition;
        }

        // Smoothly Interpolate Camera Rotation (Orbit around target)
        currentQRef.current.copy(state.camera.quaternion);
        state.camera.lookAt(targetLook.current);
        targetQRef.current.copy(state.camera.quaternion);
        state.camera.quaternion.copy(currentQRef.current); // Revert to start slerp
        state.camera.quaternion.slerp(targetQRef.current, damp);
    });

    return null;
};
