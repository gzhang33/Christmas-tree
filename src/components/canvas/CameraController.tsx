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

    useFrame((state, delta) => {
        if (!activePhoto) return;

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
        // Distance = 4.16 / (2 * tan(25deg)) ~= 4.5 units (assuming 50mm lens eqv / 50fov)

        offset.current.set(0, 0, 5.5); // Fixed distance for consistent framing
        offset.current.applyQuaternion(dummyQ.current);

        // Target Camera Position
        targetPos.current.copy(targetLook.current).add(offset.current);

        // Smoothly Interpolate Camera Position
        const damp = 4 * delta;
        state.camera.position.lerp(targetPos.current, damp);

        // Smoothly Interpolate Camera Rotation (Orbit around target)
        const currentQ = state.camera.quaternion.clone();
        state.camera.lookAt(targetLook.current);
        const targetQ = state.camera.quaternion.clone();
        state.camera.quaternion.copy(currentQ); // Revert to start slerp
        state.camera.quaternion.slerp(targetQ, damp);
    });

    return null;
};
