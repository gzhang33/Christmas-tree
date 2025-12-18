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
import { HOVER_CONFIG } from '../../config/interactions';
import { useStore } from '../../store/useStore';
import { getGyroscopeTilt } from '../../hooks/useGyroscope';

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

        // NEW: Z-Axis Depth Effect
        currentZOffset: number;
        targetZOffset: number;
        isNeighbor: boolean;
    };

    // Photo properties
    id: string; // NEW: Unique Memory ID for global tracking
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

// NEW: Maximum photos that can become visible in a single frame
// This prevents GPU texture upload storms by rate-limiting visibility changes
const MAX_VISIBLE_PER_FRAME = 5;

export const PhotoManager: React.FC<PhotoManagerProps> = ({ photos, isExploded }) => {
    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId);

    // NEW: Track how many photos became visible this frame (reset each frame)
    const visibleThisFrameRef = useRef<number>(0);

    // NEW: Track explosion start time for coordinated staggering
    const explosionStartTimeRef = useRef<number | null>(null);

    // Single useFrame to manage ALL photo animations
    useFrame((state, delta) => {
        if (!isExploded) {
            // Reset tracking when not exploded
            explosionStartTimeRef.current = null;
            return;
        }

        // NEW: Initialize explosion start time on first exploded frame
        if (explosionStartTimeRef.current === null) {
            explosionStartTimeRef.current = state.clock.elapsedTime;
        }

        const time = state.clock.elapsedTime;
        const isAnyHovered = hoveredPhotoInstanceId !== null;

        // NEW: Reset per-frame counter
        visibleThisFrameRef.current = 0;

        // DYNAMIC: Read activePhoto and playingVideoInHover from store each frame
        const currentActivePhoto = useStore.getState().activePhoto;
        const currentPlayingVideo = useStore.getState().playingVideoInHover; // NEW

        // === NEW: NEIGHBOR DETECTION FOR DEPTH EFFECT ===
        // Find the hovered photo and calculate neighbors
        let hoveredPhoto: PhotoAnimationData | null = null;
        if (hoveredPhotoInstanceId !== null) {
            hoveredPhoto = photos.find(p => p.instanceId === hoveredPhotoInstanceId) || null;
        }

        // Reset neighbor flags and set Z-offsets
        for (const photo of photos) {
            const hover = photo.hoverState;

            // Check if this photo is playing video
            const isThisPlayingVideo = currentPlayingVideo?.instanceId === photo.instanceId;

            // Reset neighbor flag (unless playing video)
            if (!isThisPlayingVideo) {
                hover.isNeighbor = false;
            }

            // If this is the hovered photo, set forward offset
            if (hoveredPhoto && photo.instanceId === hoveredPhotoInstanceId) {
                hover.targetZOffset = HOVER_CONFIG.depthEffect.forwardDistance;
            }
            // If there's a hovered photo and this is not it, check if it's a neighbor
            else if (hoveredPhoto && photo.groupRef.current && hoveredPhoto.groupRef.current) {
                const photoPos = photo.groupRef.current.position;
                const hoveredPos = hoveredPhoto.groupRef.current.position;

                // Calculate 3D distance
                const distance = photoPos.distanceTo(hoveredPos);

                // If within neighbor radius, mark as neighbor and set backward offset
                if (distance < HOVER_CONFIG.depthEffect.neighborRadius) {
                    hover.isNeighbor = true;
                    hover.targetZOffset = -HOVER_CONFIG.depthEffect.backwardDistance;
                } else {
                    // Only reset if not playing video
                    if (!isThisPlayingVideo) {
                        hover.targetZOffset = 0;
                    }
                }
            }
            // No hovered photo - only reset offset if not playing video
            else {
                if (!isThisPlayingVideo) {
                    hover.targetZOffset = 0;
                }
            }
        }

        // Iterate through all photos and update their animations
        for (const photo of photos) {
            const group = photo.groupRef.current;
            const anim = photo.animState;
            const hover = photo.hoverState;

            if (!group || !anim.isVisible) continue;

            // DYNAMIC: Check if THIS photo is the active one
            const isThisActive = currentActivePhoto?.instanceId === photo.instanceId;

            // === GLOBAL HOVER SYNC ===
            // Ensure only the globally hovered photo instance is in hover state
            if (photo.instanceId === hoveredPhotoInstanceId) {
                // Activate hover if this is the hovered photo instance
                if (!hover.isHovered) {
                    hover.isHovered = true;
                    hover.targetScale = HOVER_CONFIG.scaleTarget;
                    hover.targetRotationMultiplier = HOVER_CONFIG.rotationDamping;

                    // NEW: Set max renderOrder for hovered photo
                    if (group) {
                        group.renderOrder = HOVER_CONFIG.depthEffect.maxRenderOrder;
                    }
                }
            } else if (hover.isHovered) {
                // Check if this photo is playing video - if so, DON'T deactivate hover
                const isThisPlayingVideo = currentPlayingVideo?.instanceId === photo.instanceId;

                if (!isThisPlayingVideo) {
                    // Deactivate hover for non-hovered, non-playing photos
                    hover.isHovered = false;
                    hover.targetScale = 1.0;
                    hover.targetRotationMultiplier = 1.0;
                    hover.targetTiltX = 0;
                    hover.targetTiltY = 0;

                    // NEW: Reset renderOrder
                    if (group) {
                        group.renderOrder = 0;
                    }
                }
            }

            // === HOVER INTERPOLATION ===
            const lerpFactor = 1 - Math.exp(-HOVER_CONFIG.transitionSpeed * delta);
            const tiltLerpFactor = 1 - Math.exp(-HOVER_CONFIG.tiltSmoothing * delta);

            // NEW: Depth effect lerp factor
            const depthLerpFactor = 1 - Math.exp(-HOVER_CONFIG.depthEffect.transitionSpeed * delta);

            hover.currentScale = THREE.MathUtils.lerp(hover.currentScale, hover.targetScale, lerpFactor);
            hover.rotationMultiplier = THREE.MathUtils.lerp(hover.rotationMultiplier, hover.targetRotationMultiplier, lerpFactor);

            // === GYROSCOPE TILT FOR HOVERED PHOTO (Mobile) ===
            // If this photo is hovered and gyroscope is active, apply device tilt
            const gyro = getGyroscopeTilt();
            if (hover.isHovered && gyro.isActive) {
                const gyroMultiplier = HOVER_CONFIG.gyroscope.tiltMultiplier;
                // Map gyroscope tilt to photo tilt (similar to mouse hover effect)
                hover.targetTiltY = -gyro.tiltX * HOVER_CONFIG.tiltMaxAngle * gyroMultiplier;
                hover.targetTiltX = gyro.tiltY * HOVER_CONFIG.tiltMaxAngle * gyroMultiplier;

                // Debug: Log once per second when gyro is actively applied
                if (Math.floor(time) !== Math.floor(time - delta)) {
                    console.log(`[Gyroscope] Applied to photo #${photo.instanceId}: tiltX=${hover.targetTiltX.toFixed(3)}, tiltY=${hover.targetTiltY.toFixed(3)}`);
                }
            }

            hover.tiltX = THREE.MathUtils.lerp(hover.tiltX, hover.targetTiltX, tiltLerpFactor);
            hover.tiltY = THREE.MathUtils.lerp(hover.tiltY, hover.targetTiltY, tiltLerpFactor);

            // NEW: Smooth Z-axis offset transition
            hover.currentZOffset = THREE.MathUtils.lerp(hover.currentZOffset, hover.targetZOffset, depthLerpFactor);

            if (anim.isAnimating) {
                // === MORPH ANIMATION ===
                if (anim.startTime < 0) {
                    anim.startTime = time;
                }

                const delay = photo.morphIndex * 0.05;
                const startTime = anim.startTime + delay;
                const elapsed = time - startTime;

                // Staggered visibility with per-frame rate limiting
                if (elapsed >= 0) {
                    if (!group.visible) {
                        // NEW: Rate limit visibility changes to prevent GPU texture upload storm
                        if (visibleThisFrameRef.current < MAX_VISIBLE_PER_FRAME) {
                            group.visible = true;
                            visibleThisFrameRef.current += 1;
                        } else {
                            // Defer this photo to next frame
                            continue;
                        }
                    }
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

                    // ACTIVE PHOTO: Freeze position and face camera
                    if (isThisActive) {
                        // Use fixed position (no orbit, no bobbing)
                        const initialX = photo.position[0];
                        const initialZ = photo.position[2];
                        const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);
                        const fixedX = Math.cos(anim.orbitAngle) * radius;
                        const fixedZ = Math.sin(anim.orbitAngle) * radius;
                        group.position.set(fixedX, photo.position[1], fixedZ);

                        // Face camera directly
                        group.rotation.set(0, 0, 0);
                        dummyObj.position.copy(group.position);
                        dummyObj.lookAt(state.camera.position);
                        group.quaternion.copy(dummyObj.quaternion);

                        // Scale to 2.5x
                        hover.targetScale = 2.5;
                        const finalScale = photo.scale * hover.currentScale;
                        group.scale.setScalar(finalScale);

                        // NEW: Ensure active photo has max renderOrder
                        group.renderOrder = HOVER_CONFIG.depthEffect.maxRenderOrder;

                        // No glow for active
                        if (photo.frameMaterial) photo.frameMaterial.emissiveIntensity = 0;
                    } else {
                        // NON-ACTIVE: Continue orbit and float

                        // Check if THIS photo is playing video
                        const isThisPlayingVideo = currentPlayingVideo?.instanceId === photo.instanceId;

                        // FREEZE simulated time when playing video
                        if (!isThisPlayingVideo) {
                            anim.simulatedTime += delta * hover.rotationMultiplier;
                        }
                        const hoverTime = anim.simulatedTime;
                        const idx = photo.morphIndex * 0.5;

                        // Orbit
                        const initialX = photo.position[0];
                        const initialZ = photo.position[2];
                        const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);

                        // FREEZE orbit when playing video
                        const effectiveSpeed = (isAnyHovered || isThisPlayingVideo) ? 0 : (0.05 + (1.0 / (radius + 0.1)) * 0.1);
                        anim.orbitAngle += effectiveSpeed * delta;

                        const baseX = Math.cos(anim.orbitAngle) * radius;
                        const baseZ = Math.sin(anim.orbitAngle) * radius;

                        // FREEZE bobbing when playing video
                        const yBob = isThisPlayingVideo ? 0 : Math.sin(hoverTime * 0.5 + idx) * 0.3;

                        // Z-Axis Depth Effect
                        const dirX = baseX / (radius || 1);
                        const dirZ = baseZ / (radius || 1);
                        const xWithOffset = baseX + (dirX * hover.currentZOffset);
                        const zWithOffset = baseZ + (dirZ * hover.currentZOffset);

                        // NEW: 丝滑过度因子 - 消除进入轨道时的瞬间震动
                        const orbitEntranceFactor = Math.min(hoverTime * 0.66, 1.0);

                        group.position.set(xWithOffset, photo.position[1] + (yBob * orbitEntranceFactor), zWithOffset);

                        // Rotation - freeze when playing video
                        const shouldFreezeRotation = isThisPlayingVideo;
                        const spinY = shouldFreezeRotation ? photo.rotation[1] : (photo.rotation[1] + hoverTime * 0.15 * orbitEntranceFactor);
                        const spinX = shouldFreezeRotation ? photo.rotation[0] : (photo.rotation[0] + Math.sin(hoverTime * 0.3 + idx) * 0.05 * orbitEntranceFactor);
                        const spinZ = shouldFreezeRotation ? photo.rotation[2] : (photo.rotation[2] + Math.cos(hoverTime * 0.25 + idx) * 0.05 * orbitEntranceFactor);

                        group.rotation.set(0, 0, 0);
                        reusableEuler.set(spinX, spinY, spinZ);
                        qOrbit.setFromEuler(reusableEuler);

                        // Face camera on hover (only for THIS hovered photo)
                        if (hover.isHovered && hover.currentScale > 1.01) {
                            const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                            dummyObj.position.copy(group.position);
                            dummyObj.lookAt(state.camera.position);
                            qTarget.copy(dummyObj.quaternion);

                            qOrbit.slerp(qTarget, popProgress);
                        }

                        group.quaternion.copy(qOrbit);

                        // 3D Tilt (only for hovered)
                        if (hover.isHovered && (Math.abs(hover.tiltX) > 0.001 || Math.abs(hover.tiltY) > 0.001)) {
                            group.rotateX(hover.tiltX);
                            group.rotateY(hover.tiltY);
                        }

                        // Scale
                        const finalScale = photo.scale * hover.currentScale;
                        group.scale.setScalar(finalScale);

                        // Set max renderOrder for photo playing video
                        if (isThisPlayingVideo) {
                            group.renderOrder = HOVER_CONFIG.depthEffect.maxRenderOrder;
                        }

                        // Adaptive pop & glow (ONLY for the hovered photo)
                        if (hover.isHovered && hover.currentScale > 1.01) {
                            const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                            const currentDist = group.position.distanceTo(state.camera.position);
                            const idealDist = HOVER_CONFIG.idealDistance;
                            const distToTravel = Math.max(HOVER_CONFIG.popDistance, currentDist - idealDist);

                            tempVec3.subVectors(state.camera.position, group.position).normalize();
                            tempVec3.multiplyScalar(distToTravel * popProgress);
                            group.position.add(tempVec3);

                            if (photo.frameMaterial) {
                                photo.frameMaterial.emissiveIntensity = popProgress * HOVER_CONFIG.emissiveIntensity;
                            }
                        } else {
                            if (photo.frameMaterial) photo.frameMaterial.emissiveIntensity = 0;
                        }
                    }
                }
            }
        }
    });

    return null; // This component doesn't render anything
};
