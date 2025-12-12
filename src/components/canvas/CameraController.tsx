import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { CAMERA_CONFIG, getResponsiveValue } from '../../config';

// Scratch objects for spherical coordinate calculations
const tempVec3 = new THREE.Vector3();
const tempSpherical = new THREE.Spherical();
const targetSpherical = new THREE.Spherical();

/**
 * Normalize angle to [-PI, PI] range
 */
const normalizeAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
};

/**
 * Lerp angle with shortest path
 */
const lerpAngle = (current: number, target: number, t: number): number => {
    const diff = normalizeAngle(target - current);
    return current + diff * t;
};

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

    // Spherical coordinate animation state
    const sphericalAnimRef = useRef({
        isAnimating: false,       // whether spherical rotation animation is active
        currentTheta: 0,          // current azimuthal angle (around Y axis)
        currentPhi: 0,            // current polar angle (from Y axis)
        targetTheta: 0,           // target azimuthal angle
        targetPhi: 0,             // target polar angle
        radius: 0,                // camera distance from origin
        phase: 'rotating' as 'rotating' | 'zooming', // animation phase
    });

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

    // Track previous activePhoto to detect new selection
    const prevActivePhotoRef = useRef<typeof activePhoto>(null);

    useFrame((state, delta) => {
        const sphereAnim = sphericalAnimRef.current;

        if (!activePhoto) {
            // Reset spherical animation state
            sphereAnim.isAnimating = false;
            sphereAnim.phase = 'rotating';

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

            prevActivePhotoRef.current = null;
            return;
        }

        // Mark that we have an active photo and reset close time
        hadActivePhoto.current = true;
        photoClosedTime.current = null;

        // Detect new photo selection - initialize spherical animation
        const isNewSelection = prevActivePhotoRef.current?.instanceId !== activePhoto.instanceId;
        if (isNewSelection) {
            prevActivePhotoRef.current = activePhoto;

            // Calculate current camera spherical coordinates
            tempVec3.copy(state.camera.position);
            tempSpherical.setFromVector3(tempVec3);
            sphereAnim.currentTheta = tempSpherical.theta;
            sphereAnim.currentPhi = tempSpherical.phi;
            sphereAnim.radius = tempSpherical.radius;

            // Calculate target spherical coordinates based on photo position
            // The target theta/phi should place the camera so that the photo is centered
            const [px, py, pz] = activePhoto.position;
            tempVec3.set(px, py, pz);
            targetSpherical.setFromVector3(tempVec3);

            // Target: place camera in the same direction as the photo (from origin)
            sphereAnim.targetTheta = targetSpherical.theta;
            sphereAnim.targetPhi = targetSpherical.phi;

            sphereAnim.isAnimating = true;
            sphereAnim.phase = 'rotating';
        }

        // Photo position and orientation
        const [px, py, pz] = activePhoto.position;
        const [rx, ry, rz] = activePhoto.rotation;

        targetLook.current.set(px, py, pz);

        // Resolve Photo Orientation
        dummyE.current.set(rx, ry, rz);
        dummyQ.current.setFromEuler(dummyE.current);

        // Calculate target camera position (in front of photo)
        offset.current.set(0, 0, CAMERA_CONFIG.photoView.distance);
        offset.current.applyQuaternion(dummyQ.current);
        targetPos.current.copy(targetLook.current).add(offset.current);

        if (sphereAnim.isAnimating && sphereAnim.phase === 'rotating') {
            // Phase 1: Spherical rotation animation (mimicking OrbitControls drag)
            const rotationDamp = Math.min(3.0 * delta, 1.0); // Rotation speed

            // Lerp spherical angles (with angle wrapping)
            sphereAnim.currentTheta = lerpAngle(sphereAnim.currentTheta, sphereAnim.targetTheta, rotationDamp);
            sphereAnim.currentPhi = THREE.MathUtils.lerp(sphereAnim.currentPhi, sphereAnim.targetPhi, rotationDamp);

            // Clamp phi to avoid flipping
            sphereAnim.currentPhi = THREE.MathUtils.clamp(
                sphereAnim.currentPhi,
                0.1,
                Math.PI - 0.1
            );

            // Convert back to cartesian coordinates
            tempSpherical.set(sphereAnim.radius, sphereAnim.currentPhi, sphereAnim.currentTheta);
            tempVec3.setFromSpherical(tempSpherical);
            state.camera.position.copy(tempVec3);

            // Make camera look at origin during rotation
            state.camera.lookAt(0, 0, 0);

            // Check if rotation is complete (within threshold)
            const thetaDiff = Math.abs(normalizeAngle(sphereAnim.targetTheta - sphereAnim.currentTheta));
            const phiDiff = Math.abs(sphereAnim.targetPhi - sphereAnim.currentPhi);

            if (thetaDiff < 0.01 && phiDiff < 0.01) {
                sphereAnim.phase = 'zooming';
            }
        } else {
            // Phase 2: Zoom in to photo (original behavior)
            const damp = Math.min(CAMERA_CONFIG.photoView.dampingSpeed * delta, 1.0);
            state.camera.position.lerp(targetPos.current, damp);

            // Limit camera z position to maximum value
            if (state.camera.position.z > CAMERA_CONFIG.limits.maxZPosition) {
                state.camera.position.z = CAMERA_CONFIG.limits.maxZPosition;
            }

            // Smoothly Interpolate Camera Rotation (look at photo)
            currentQRef.current.copy(state.camera.quaternion);
            state.camera.lookAt(targetLook.current);
            targetQRef.current.copy(state.camera.quaternion);
            state.camera.quaternion.copy(currentQRef.current);
            state.camera.quaternion.slerp(targetQRef.current, damp);

            // Check if zoom is complete
            const distToTarget = state.camera.position.distanceTo(targetPos.current);
            if (distToTarget < 0.1) {
                sphereAnim.isAnimating = false;
            }
        }
    });

    return null;
};
