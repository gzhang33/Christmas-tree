/**
 * PhotoManager - Centralized Animation Manager for PolaroidPhoto instances
 * 
 * Performance Optimization:
 * - Single useFrame hook manages ALL photo animations (99 instances)
 * - Reduces frame callbacks from 99+ to 1
 * - Maintains refs to all photo groups for direct manipulation
 * - Handles morph, orbit, hover, and scale animations
 */

import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { MORPH_TIMING } from '../../config/photoConfig';
import { HOVER_CONFIG } from '../../config/interactions';
import { useStore } from '../../store/useStore';

// Scratch objects to avoid GC (reused across all photos)
const dummyObj = new THREE.Object3D();
const qOrbit = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();
const tempVec3 = new THREE.Vector3();
const reusableEuler = new THREE.Euler();

export interface PhotoAnimationData {
    // Group ref
    groupRef: React.RefObject<THREE.Group>;

    // Materials
    frameMaterial: THREE.MeshStandardMaterial | null;
    photoMaterial: THREE.ShaderMaterial | null;

    // Animation state
    animState: {
        startTime: number;
        isAnimating: boolean;
        isVisible: boolean;
        morphProgress: number;
        currentScale: number;
        currentPosition: THREE.Vector3;
        currentRotation: THREE.Euler;
        textureLoaded: boolean;
        orbitAngle: number | null;
        simulatedTime: number;
    };

    // Hover state
    hoverState: {
        isHovered: boolean;
        currentScale: number;
        targetScale: number;
        rotationMultiplier: number;
        targetRotationMultiplier: number;
        tiltX: number;
        tiltY: number;
        targetTiltX: number;
        targetTiltY: number;
    };

    // Photo properties
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    particleStartPosition: [number, number, number];
    morphIndex: number;
    totalPhotos: number;
    instanceId: number;
    isThisActive: boolean;
}

interface PhotoManagerProps {
    photos: PhotoAnimationData[];
    isExploded: boolean;
}

export const PhotoManager: React.FC<PhotoManagerProps> = ({ photos, isExploded }) => {
    const hoveredPhotoId = useStore((state) => state.hoveredPhotoId);

    // Single useFrame to manage ALL photo animations
    useFrame((state, delta) => {
        if (!isExploded) return;

        const time = state.clock.elapsedTime;
        const isAnyHovered = hoveredPhotoId !== null;

        // Iterate through all photos and update their animations
        for (const photo of photos) {
            const group = photo.groupRef.current;
            const anim = photo.animState;
            const hover = photo.hoverState;

            if (!group || !anim.isVisible) continue;

            // === HOVER INTERPOLATION ===
            const lerpFactor = 1 - Math.exp(-HOVER_CONFIG.transitionSpeed * delta);
            const tiltLerpFactor = 1 - Math.exp(-HOVER_CONFIG.tiltSmoothing * delta);

            hover.currentScale = THREE.MathUtils.lerp(hover.currentScale, hover.targetScale, lerpFactor);
            hover.rotationMultiplier = THREE.MathUtils.lerp(hover.rotationMultiplier, hover.targetRotationMultiplier, lerpFactor);
            hover.tiltX = THREE.MathUtils.lerp(hover.tiltX, hover.targetTiltX, tiltLerpFactor);
            hover.tiltY = THREE.MathUtils.lerp(hover.tiltY, hover.targetTiltY, tiltLerpFactor);

            if (anim.isAnimating) {
                // === MORPH ANIMATION ===
                if (anim.startTime < 0) {
                    anim.startTime = time;
                }

                const delay = photo.morphIndex * 0.05;
                const startTime = anim.startTime + delay;
                const elapsed = time - startTime;

                // Staggered visibility
                if (elapsed >= 0) {
                    if (!group.visible) group.visible = true;
                } else {
                    if (group.visible) group.visible = false;
                    continue;
                }

                // Synchronized arrival logic
                const minTransitTime = 0.8;
                const ejectionDuration = 0.6;
                const lastPhotoDelay = (photo.totalPhotos - 1) * 0.05;
                const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;

                const myTotalDuration = globalArrivalTime - delay;
                const transitionDuration = myTotalDuration - ejectionDuration;

                let developProgress = 0.0;

                if (elapsed > 0) {
                    if (elapsed < ejectionDuration) {
                        // EJECTION PHASE
                        const t = elapsed / ejectionDuration;
                        const ejectHeight = 1.2;

                        anim.currentPosition.x = photo.particleStartPosition[0];
                        anim.currentPosition.y = photo.particleStartPosition[1] + (t * ejectHeight);
                        anim.currentPosition.z = photo.particleStartPosition[2];

                        group.scale.set(photo.scale, photo.scale * t, photo.scale);
                        developProgress = 0.0;
                    }
                    else if (elapsed < myTotalDuration) {
                        // TRANSITION PHASE
                        const t = (elapsed - ejectionDuration) / transitionDuration;
                        const s = 1.2;
                        const t2 = t - 1;
                        const animationProgress = t2 * t2 * ((s + 1) * t2 + s) + 1;
                        const developEase = 1 - Math.pow(1 - t, 3);

                        const startY = photo.particleStartPosition[1] + 1.2;

                        anim.currentPosition.x = THREE.MathUtils.lerp(photo.particleStartPosition[0], photo.position[0], animationProgress);
                        anim.currentPosition.y = THREE.MathUtils.lerp(startY, photo.position[1], animationProgress);
                        anim.currentPosition.z = THREE.MathUtils.lerp(photo.particleStartPosition[2], photo.position[2], animationProgress);

                        anim.currentRotation.x = photo.rotation[0] * animationProgress;
                        anim.currentRotation.y = photo.rotation[1] * animationProgress;
                        anim.currentRotation.z = photo.rotation[2] * animationProgress;

                        group.scale.setScalar(photo.scale);
                        developProgress = developEase;
                    }
                    else {
                        // Animation done
                        anim.isAnimating = false;
                        group.scale.setScalar(photo.scale);
                        developProgress = 1.0;
                    }

                    // Opacity
                    const opacityProgress = Math.min(elapsed / 0.5, 1);
                    if (photo.frameMaterial) photo.frameMaterial.opacity = opacityProgress;

                    if (photo.photoMaterial && anim.textureLoaded) {
                        photo.photoMaterial.uniforms.opacity.value = opacityProgress;
                        photo.photoMaterial.uniforms.uDevelop.value = developProgress;
                    }

                    group.position.copy(anim.currentPosition);

                    if (elapsed >= ejectionDuration) {
                        group.rotation.copy(anim.currentRotation);
                    } else {
                        group.rotation.set(0, 0, 0);
                    }
                }
            } else {
                // === ORBIT & FLOAT ===
                if (photo.photoMaterial) photo.photoMaterial.uniforms.uDevelop.value = 1.0;

                const minTransitTime = 0.8;
                const ejectionDuration = 0.6;
                const lastPhotoDelay = (photo.totalPhotos - 1) * 0.05;
                const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;
                const absoluteArrivalTime = anim.startTime + globalArrivalTime;

                if (time > absoluteArrivalTime) {
                    if (anim.orbitAngle === null) {
                        anim.orbitAngle = Math.atan2(photo.position[2], photo.position[0]);
                        anim.simulatedTime = 0;
                    }

                    anim.simulatedTime += delta * hover.rotationMultiplier;
                    const hoverTime = anim.simulatedTime;
                    const idx = photo.morphIndex * 0.5;

                    // Orbit
                    const initialX = photo.position[0];
                    const initialZ = photo.position[2];
                    const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);

                    const effectiveSpeed = isAnyHovered ? 0 : (0.05 + (1.0 / (radius + 0.1)) * 0.1);
                    anim.orbitAngle += effectiveSpeed * delta;

                    const baseX = Math.cos(anim.orbitAngle) * radius;
                    const baseZ = Math.sin(anim.orbitAngle) * radius;
                    const yBob = Math.sin(hoverTime * 0.5 + idx) * 0.3;

                    group.position.set(baseX, photo.position[1] + yBob, baseZ);

                    // Rotation
                    const spinY = photo.isThisActive ? photo.rotation[1] : (photo.rotation[1] + hoverTime * 0.15);
                    const spinX = photo.isThisActive ? photo.rotation[0] : (photo.rotation[0] + Math.sin(hoverTime * 0.3 + idx) * 0.05);
                    const spinZ = photo.isThisActive ? photo.rotation[2] : (photo.rotation[2] + Math.cos(hoverTime * 0.25 + idx) * 0.05);

                    group.rotation.set(0, 0, 0);
                    reusableEuler.set(spinX, spinY, spinZ);
                    qOrbit.setFromEuler(reusableEuler);

                    // Face camera on hover/active
                    if (hover.currentScale > 1.01 || photo.isThisActive) {
                        const popProgress = photo.isThisActive
                            ? 1.0
                            : (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                        dummyObj.position.copy(group.position);
                        dummyObj.lookAt(state.camera.position);
                        qTarget.copy(dummyObj.quaternion);

                        qOrbit.slerp(qTarget, popProgress);
                    }

                    group.quaternion.copy(qOrbit);

                    // 3D Tilt
                    if (Math.abs(hover.tiltX) > 0.001 || Math.abs(hover.tiltY) > 0.001) {
                        group.rotateX(hover.tiltX);
                        group.rotateY(hover.tiltY);
                    }

                    // Scale
                    if (photo.isThisActive) {
                        hover.targetScale = 2.5;
                    }

                    const finalScale = photo.scale * hover.currentScale;
                    group.scale.setScalar(finalScale);

                    // Adaptive pop & glow
                    if (hover.currentScale > 1.01) {
                        const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                        if (!photo.isThisActive) {
                            const currentDist = group.position.distanceTo(state.camera.position);
                            const idealDist = HOVER_CONFIG.idealDistance;
                            const distToTravel = Math.max(HOVER_CONFIG.popDistance, currentDist - idealDist);

                            tempVec3.subVectors(state.camera.position, group.position).normalize();
                            tempVec3.multiplyScalar(distToTravel * popProgress);
                            group.position.add(tempVec3);
                        }

                        if (photo.frameMaterial) {
                            photo.frameMaterial.emissiveIntensity = popProgress * HOVER_CONFIG.emissiveIntensity;
                        }
                    } else {
                        if (photo.frameMaterial) photo.frameMaterial.emissiveIntensity = 0;
                    }
                }
            }
        }
    });

    return null; // This component doesn't render anything
};
