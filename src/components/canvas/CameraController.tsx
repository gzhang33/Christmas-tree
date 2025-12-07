import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const CameraController: React.FC = () => {
    const activePhoto = useStore(state => state.activePhoto);
    const { camera } = useThree();

    // Scratch objects
    const targetPos = useRef(new THREE.Vector3());
    const targetLook = useRef(new THREE.Vector3());
    const dummyQ = useRef(new THREE.Quaternion());
    const dummyE = useRef(new THREE.Euler());
    const offset = useRef(new THREE.Vector3());
    const lastTargetPos = useRef(new THREE.Vector3(0, 5, 28)); // Remember last target for smooth return
    const hadActivePhoto = useRef(false); // Track if we ever had an active photo

    useFrame((state, delta) => {
        if (!activePhoto) {
            // Only smooth return if we previously had an active photo
            // This prevents camera movement on initial load
            if (hadActivePhoto.current) {
                // Smooth return to default pose when activePhoto becomes null
                const defaultPos = new THREE.Vector3(0, 5, 28);
                const defaultLookAt = new THREE.Vector3(0, 0, 0);

                // Compute damp factor from delta
                const damp = Math.min(2 * delta, 1.0);

                // Lerp camera position toward default
                state.camera.position.lerp(defaultPos, damp);

                // Smoothly lerp camera rotation toward default lookAt
                const currentQ = state.camera.quaternion.clone();
                state.camera.lookAt(defaultLookAt);
                const targetQ = state.camera.quaternion.clone();
                state.camera.quaternion.copy(currentQ);
                state.camera.quaternion.slerp(targetQ, damp);

                // Update lastTargetPos to current position for next transition
                lastTargetPos.current.copy(state.camera.position);
            }

            return;
        }

        // Mark that we have an active photo
        hadActivePhoto.current = true;

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
        // Distance = 4.16 / (2 * tan(25deg)) ~= 4.5 units (using 5.5 for better framing)

        offset.current.set(0, 0, 5.5); // Fixed distance for consistent framing
        offset.current.applyQuaternion(dummyQ.current);

        // Target Camera Position
        targetPos.current.copy(targetLook.current).add(offset.current);

        // Smoothly Interpolate Camera Position
        const damp = Math.min(4 * delta, 1.0);
        state.camera.position.lerp(targetPos.current, damp);

        // Smoothly Interpolate Camera Rotation (Orbit around target)
        const currentQ = state.camera.quaternion.clone();
        state.camera.lookAt(targetLook.current);
        const targetQ = state.camera.quaternion.clone();
        state.camera.quaternion.copy(currentQ); // Revert to start slerp
        state.camera.quaternion.slerp(targetQ, damp);

        // Remember this target position for smooth return
        lastTargetPos.current.copy(targetPos.current);
    });

    return null;
};
