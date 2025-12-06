/**
 * Polaroid Photo Component - Performance Optimized
 *
 * Optimizations:
 * 1. Use texture preloader with caching (no per-component loading)
 * 2. Use refs instead of state for animation (no re-renders)
 * 3. Reuse materials instead of creating new ones each frame
 * 4. Simpler geometry and fewer draw calls
 * 
 * Epic 3 Features:
 * - Magnetic Hover: Scale 1.5x, slow rotation on hover
 * - 3D Tilt: Dynamic tilt based on mouse position
 */
import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib'; // Import utility
import { MORPH_TIMING } from '../../config/photoConfig';
import { HOVER_CONFIG } from '../../config/interactions';
import { getCachedTexture } from '../../utils/texturePreloader';
import { useStore } from '../../store/useStore';

// Scratch objects to avoid GC (for rotation math)
const dummyObj = new THREE.Object3D();
const qOrbit = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();
const tempVec3 = new THREE.Vector3(); // Temp vector for pop offset calculations
const reusableEuler = new THREE.Euler(); // Reusable Euler for rotation calculations

interface PolaroidPhotoProps {
    url: string;
    position: [number, number, number]; // Final target position
    rotation: [number, number, number];
    scale: number;
    isExploded: boolean;
    particleStartPosition: [number, number, number]; // Origin particle position (Gift Center)
    morphIndex: number;
    totalPhotos: number;
}

// Polaroid frame dimensions
const FRAME = {
    width: 1.0,
    height: 1.2,
    depth: 0.02,
    imageOffsetY: 0.1,
    imageSize: 0.85,
};

// Shared geometries (created once, reused by all instances)
let sharedFrameGeometry: THREE.BoxGeometry | null = null;
let sharedPhotoGeometry: THREE.BufferGeometry | null = null; // Changed to BufferGeometry for merged mesh

const getSharedGeometries = () => {
    if (!sharedFrameGeometry) {
        sharedFrameGeometry = new THREE.BoxGeometry(FRAME.width, FRAME.height, FRAME.depth);
    }
    if (!sharedPhotoGeometry) {
        // Merge Front and Back planes into one geometry to save draw calls
        const frontGeo = new THREE.PlaneGeometry(FRAME.imageSize, FRAME.imageSize);
        const backGeo = new THREE.PlaneGeometry(FRAME.imageSize, FRAME.imageSize);

        // Front: Shift foward
        frontGeo.translate(0, FRAME.imageOffsetY, FRAME.depth / 2 + 0.001);

        // Back: Shift backward and rotate
        backGeo.rotateY(Math.PI);
        backGeo.translate(0, FRAME.imageOffsetY, -FRAME.depth / 2 - 0.001);

        // Merge
        sharedPhotoGeometry = mergeBufferGeometries([frontGeo, backGeo]);

        // Cleanup intermediates
        frontGeo.dispose();
        backGeo.dispose();
    }
    return { frameGeometry: sharedFrameGeometry, photoGeometry: sharedPhotoGeometry };
};

// Shared Material (Created once to reuse WebGLProgram)
const masterPhotoMaterial = new THREE.ShaderMaterial({
    uniforms: {
        map: { value: null },
        uDevelop: { value: 0.0 }, // 0.0 = Energy, 1.0 = Photo
        opacity: { value: 0.0 },
        uTime: { value: 0.0 },
        uBend: { value: 0.0 } // Bending effect
    },
    vertexShader: `
        varying vec2 vUv;
        uniform float uBend;
        void main() {
            vUv = uv;
            vec3 pos = position;
            // Bend effect: Curve based on X distance from center
            // Simulates card flexibility during motion
            float curve = pow(abs(uv.x - 0.5), 2.0) * uBend;
            pos.z += curve;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D map;
        uniform float uDevelop;
        uniform float opacity;
        varying vec2 vUv;
        
        void main() {
            vec4 tex = texture2D(map, vUv);
            
            // Energy Card State: Warm White Glow
            vec3 energyColor = vec3(1.0, 0.98, 0.9);
            
            // Develop: Mix energy color with texture color
            vec3 finalColor = mix(energyColor, tex.rgb, uDevelop);
            
            // Add extra glow when in Energy state
            if (uDevelop < 0.99) {
                float glow = (1.0 - uDevelop) * 0.2;
                finalColor += vec3(glow);
            }
            
            gl_FragColor = vec4(finalColor, opacity);
        }
    `,
    transparent: true,
    side: THREE.DoubleSide,
});

export const PolaroidPhoto: React.FC<PolaroidPhotoProps> = React.memo(({
    url,
    position,
    rotation,
    scale,
    isExploded,
    particleStartPosition,
    morphIndex,
    totalPhotos,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const frameMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const photoMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Actions - use selector to avoid re-renders (this is stable)
    const setHoveredPhoto = useStore(state => state.setHoveredPhoto);

    // Animation state (using refs to avoid re-renders)
    const animRef = useRef({
        startTime: -1,
        isAnimating: false,
        isVisible: false,
        morphProgress: 0,
        currentScale: 0,
        currentPosition: new THREE.Vector3(...particleStartPosition),
        currentRotation: new THREE.Euler(0, 0, 0),
        textureLoaded: false,
        orbitAngle: null as number | null, // Track accumulated orbit angle
    });

    // Hover state (using refs to avoid re-renders - critical for 60fps)
    const hoverRef = useRef({
        isHovered: false,
        currentScale: 1.0,           // Current interpolated scale multiplier
        targetScale: 1.0,            // Target scale (1.0 normal, 1.5 hovered)
        rotationMultiplier: 1.0,     // Current rotation speed multiplier
        targetRotationMultiplier: 1.0, // Target rotation multiplier
        tiltX: 0,                    // Current X tilt angle
        tiltY: 0,                    // Current Y tilt angle
        targetTiltX: 0,              // Target X tilt (from mouse)
        targetTiltY: 0,              // Target Y tilt (from mouse)
    });

    // Get shared geometries
    const { frameGeometry, photoGeometry } = useMemo(() => getSharedGeometries(), []);

    // Create materials once (using texture from cache)
    // Use useMemo ensures they are ready for the first render
    const materials = useMemo(() => {
        // Frame material - Standard material for light interaction
        const frameMat = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.4,
            metalness: 0.1,
            emissive: new THREE.Color(0xfffee0), // Warm glow color
            emissiveIntensity: 0,                // Start with no glow
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });

        // Clone shared material to reuse program but have unique uniforms (map)
        const photoMat = masterPhotoMaterial.clone();

        return { frameMat, photoMat };
    }, []);

    // Sync refs for useFrame and Cleanup
    useEffect(() => {
        frameMaterialRef.current = materials.frameMat;
        photoMaterialRef.current = materials.photoMat;

        return () => {
            materials.frameMat.dispose();
            materials.photoMat.dispose();
        };
    }, [materials]);

    // Handle explosion state change
    useEffect(() => {
        const anim = animRef.current;

        if (isExploded) {
            // Try to get cached texture
            const cachedTexture = getCachedTexture(url);
            if (cachedTexture) {
                // For ShaderMaterial, we update uniforms.map
                if (materials.photoMat) {
                    materials.photoMat.uniforms.map.value = cachedTexture;
                }
                anim.textureLoaded = true;
            }

            anim.isVisible = true;
            anim.isAnimating = true;
            anim.startTime = -1;
            anim.currentPosition.set(...particleStartPosition);
            anim.orbitAngle = null; // Reset orbit

            // CRITICAL OPTIMIZATION:
            // Start invisible to prevent 100 textures uploading in the same frame.
            // Visibility will be toggled true in useFrame when delay is reached.
            if (groupRef.current) groupRef.current.visible = false;

        } else {
            anim.isVisible = false;
            anim.isAnimating = false;
            anim.morphProgress = 0;
            anim.currentScale = 0;
            anim.orbitAngle = null;

            // Reset hover state when collapsing
            const hover = hoverRef.current;
            hover.isHovered = false;
            hover.currentScale = 1.0;
            hover.targetScale = 1.0;
            hover.tiltX = 0;
            hover.tiltY = 0;

            // Reset material opacity
            if (materials.frameMat) materials.frameMat.opacity = 0;
            if (materials.photoMat) materials.photoMat.uniforms.opacity.value = 0;

            // Hide immediately on collapse
            if (groupRef.current) groupRef.current.visible = false;
        }
    }, [isExploded, url, particleStartPosition, materials]);

    // === HOVER EVENT HANDLERS (AC: 1, 3) ===

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredPhoto(url); // Notify global store

        const hover = hoverRef.current;
        hover.isHovered = true;
        hover.targetScale = HOVER_CONFIG.scaleTarget;
        hover.targetRotationMultiplier = HOVER_CONFIG.rotationDamping;
        // Standard pointer cursor (no custom icon per AC:3)
        document.body.style.cursor = 'pointer';
    }, [url, setHoveredPhoto]);

    const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredPhoto(null); // Notify global store

        const hover = hoverRef.current;
        hover.isHovered = false;
        hover.targetScale = 1.0;
        hover.targetRotationMultiplier = 1.0;
        hover.targetTiltX = 0;
        hover.targetTiltY = 0;
        document.body.style.cursor = 'auto';
    }, [setHoveredPhoto]);

    // === 3D TILT INTERACTION (AC: 2) ===

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const hover = hoverRef.current;

        if (!hover.isHovered || !groupRef.current) return;

        // Get intersection point in local coordinates
        const point = e.point.clone();
        groupRef.current.worldToLocal(point);

        // Calculate normalized offset from center (-1 to 1)
        // Frame dimensions: width=1.0, height=1.2
        const normalizedX = (point.x / (FRAME.width / 2));
        const normalizedY = (point.y / (FRAME.height / 2));

        // Clamp values to avoid extreme tilts
        const clampedX = THREE.MathUtils.clamp(normalizedX, -1, 1);
        const clampedY = THREE.MathUtils.clamp(normalizedY, -1, 1);

        // Apply tilt: mouse on right tilts card left (negative Y rotation)
        // Mouse on top tilts card back (positive X rotation)
        hover.targetTiltY = -clampedX * HOVER_CONFIG.tiltMaxAngle;
        hover.targetTiltX = clampedY * HOVER_CONFIG.tiltMaxAngle;
    }, []);

    // Animation frame - optimized to minimize allocations
    useFrame((state, delta) => {
        const group = groupRef.current;
        const anim = animRef.current;
        const hover = hoverRef.current;

        if (!group || !anim.isVisible) return;

        const time = state.clock.elapsedTime;

        // === HOVER INTERPOLATION (smooth transitions) ===
        const lerpFactor = 1 - Math.exp(-HOVER_CONFIG.transitionSpeed * delta);
        const tiltLerpFactor = 1 - Math.exp(-HOVER_CONFIG.tiltSmoothing * delta);

        hover.currentScale = THREE.MathUtils.lerp(hover.currentScale, hover.targetScale, lerpFactor);
        hover.rotationMultiplier = THREE.MathUtils.lerp(hover.rotationMultiplier, hover.targetRotationMultiplier, lerpFactor);
        hover.tiltX = THREE.MathUtils.lerp(hover.tiltX, hover.targetTiltX, tiltLerpFactor);
        hover.tiltY = THREE.MathUtils.lerp(hover.tiltY, hover.targetTiltY, tiltLerpFactor);

        if (anim.isAnimating) {
            // Initialize start time on first frame
            if (anim.startTime < 0) {
                anim.startTime = time;
            }
            // Calculate morph progress with stagger
            // Stagger logic: each photo waits delay = morphIndex * 0.05
            const delay = morphIndex * 0.05;
            const startTime = anim.startTime + delay;
            const elapsed = time - startTime;

            // === STAGGERED VISIBILITY ===
            // Only make visible when its turn comes + small buffer
            // This spreads texture uploads over 5 seconds instead of 1 frame
            if (elapsed >= 0) {
                if (!group.visible) group.visible = true;
            } else {
                // Keep invisible if waiting
                if (group.visible) group.visible = false;
                return; // Skip calculation
            }

            // === SYNCHRONIZED ARRIVAL LOGIC ===
            const minTransitTime = 0.8;
            const ejectionDuration = 0.6;
            const lastPhotoDelay = (totalPhotos - 1) * 0.05;
            const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;

            const myTotalDuration = globalArrivalTime - delay;
            const transitionDuration = myTotalDuration - ejectionDuration;

            // Reset Develop Uniform for animation start
            let developProgress = 0.0;

            if (elapsed > 0) {
                // PHASE 1: EJECTION (Printing from Slot)
                if (elapsed < ejectionDuration) {
                    // === EJECTION PHASE ===
                    const t = elapsed / ejectionDuration;

                    // Position: Rise UP from spawn point
                    const ejectHeight = 1.2;
                    anim.currentPosition.x = particleStartPosition[0];
                    anim.currentPosition.y = particleStartPosition[1] + (t * ejectHeight);
                    anim.currentPosition.z = particleStartPosition[2];

                    // Scale Y: 0->1
                    group.scale.set(scale, scale * t, scale);

                    // Ejection Phase: Pure Energy (develop = 0)
                    developProgress = 0.0;
                }
                else if (elapsed < myTotalDuration) {
                    // === TRANSITION PHASE ===
                    // Dynamic speed based on available time
                    const t = (elapsed - ejectionDuration) / transitionDuration;

                    // Snappy Ejection: BackOut easing
                    // s = 1.2 for slight overshoot
                    const s = 1.2;
                    const t2 = t - 1;
                    const animationProgress = t2 * t2 * ((s + 1) * t2 + s) + 1;
                    const developEase = 1 - Math.pow(1 - t, 3);

                    // Start: BoxTop (Spawn + EjectHeight)
                    const startY = particleStartPosition[1] + 1.2;

                    // Lerp
                    // Lerp
                    anim.currentPosition.x = THREE.MathUtils.lerp(particleStartPosition[0], position[0], animationProgress);
                    anim.currentPosition.y = THREE.MathUtils.lerp(startY, position[1], animationProgress);
                    anim.currentPosition.z = THREE.MathUtils.lerp(particleStartPosition[2], position[2], animationProgress);

                    // Rotation
                    anim.currentRotation.x = rotation[0] * animationProgress;
                    anim.currentRotation.y = rotation[1] * animationProgress;
                    anim.currentRotation.z = rotation[2] * animationProgress;

                    group.scale.setScalar(scale);

                    // Transition Phase: Develop 0 -> 1 using easeOut
                    developProgress = developEase;
                }
                else {
                    // Animation Done - Hand over to Orbit Loop
                    anim.isAnimating = false;
                    group.scale.setScalar(scale);
                    developProgress = 1.0;
                }

                // Opacity runs over total duration (Fade in during Ejection mainly)
                const opacityProgress = Math.min(elapsed / 0.5, 1);
                if (materials.frameMat) materials.frameMat.opacity = opacityProgress;

                // Update Shader Uniforms
                if (materials.photoMat && anim.textureLoaded) {
                    materials.photoMat.uniforms.opacity.value = opacityProgress;
                    materials.photoMat.uniforms.uDevelop.value = developProgress;
                }

                // Apply updates
                group.position.copy(anim.currentPosition);

                // In Phase 1 we keep rotation 0 (flat/aligned)
                if (elapsed >= ejectionDuration) {
                    group.rotation.copy(anim.currentRotation);
                } else {
                    group.rotation.set(0, 0, 0);
                }
            }
        } else if (isExploded) {
            // === PHASE 2: ORBIT & FLOAT ===
            // Ensure fully developed
            if (materials.photoMat) materials.photoMat.uniforms.uDevelop.value = 1.0;

            const minTransitTime = 0.8;
            const ejectionDuration = 0.6;
            const lastPhotoDelay = (totalPhotos - 1) * 0.05;
            const globalArrivalTime = lastPhotoDelay + ejectionDuration + minTransitTime;

            const absoluteArrivalTime = anim.startTime + globalArrivalTime;

            if (time > absoluteArrivalTime) {
                // Initialize accumulated angle if needed
                if (anim.orbitAngle === null) {
                    anim.orbitAngle = Math.atan2(position[2], position[0]);
                }

                const hoverTime = time - absoluteArrivalTime;
                const idx = morphIndex * 0.5;

                // Orbit
                const initialX = position[0];
                const initialZ = position[2];
                const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);

                // Global Hover Check
                const isAnyHovered = useStore.getState().hoveredPhotoId !== null;
                const effectiveSpeed = isAnyHovered ? 0 : (0.05 + (1.0 / (radius + 0.1)) * 0.1);

                // Accumulate angle
                anim.orbitAngle += effectiveSpeed * delta;

                // 1. Calculate Base Position (Orbit + Bobbing)
                const baseX = Math.cos(anim.orbitAngle) * radius;
                const baseZ = Math.sin(anim.orbitAngle) * radius;
                const yBob = Math.sin(hoverTime * 0.5 + idx) * 0.3;

                group.position.set(baseX, position[1] + yBob, baseZ);

                // 2. Calculate Base Rotation (Spinning) & Convert to Quaternion
                const spinY = rotation[1] + hoverTime * 0.15;
                const spinX = rotation[0] + Math.sin(hoverTime * 0.3 + idx) * 0.05;
                const spinZ = rotation[2] + Math.cos(hoverTime * 0.25 + idx) * 0.05;

                // Reset rotation to ensure FromEuler works cleanly on base state
                group.rotation.set(0, 0, 0);
                reusableEuler.set(spinX, spinY, spinZ);
                qOrbit.setFromEuler(reusableEuler);

                // 3. Auto-Face Calibration (Slerp to Camera Check)
                if (hover.currentScale > 1.01) {
                    const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                    // Compute Face Camera Quaternion
                    // Move dummy to current position so lookAt works correctly
                    dummyObj.position.copy(group.position);
                    dummyObj.lookAt(state.camera.position);
                    qTarget.copy(dummyObj.quaternion);

                    // Slerp from Orbit Rotation -> Face Camera Rotation
                    qOrbit.slerp(qTarget, popProgress);
                }

                // Apply the calculated quaternion
                group.quaternion.copy(qOrbit);

                // 4. Apply 3D Tilt (Local Rotation on top of Quaternion)
                if (Math.abs(hover.tiltX) > 0.001 || Math.abs(hover.tiltY) > 0.001) {
                    group.rotateX(hover.tiltX);
                    group.rotateY(hover.tiltY);
                }

                // 5. Apply Scale
                const finalScale = scale * hover.currentScale;
                group.scale.setScalar(finalScale);

                // 6. Adaptive Pop & Emissive Glow
                if (hover.currentScale > 1.01) {
                    const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                    // Adaptive Pop: Move to Ideal Distance
                    // Goal: Bring photo to HOVER_CONFIG.idealDistance from camera
                    const currentDist = group.position.distanceTo(state.camera.position);
                    const idealDist = HOVER_CONFIG.idealDistance;

                    // The distance we NEED to move to reach ideal
                    // We want to move towards camera.
                    // If currentDist (30) > ideal (8), we move 22.
                    const distToTravel = Math.max(HOVER_CONFIG.popDistance, currentDist - idealDist);

                    // Reuse tempVec3 to avoid per-frame allocations
                    tempVec3.subVectors(state.camera.position, group.position).normalize();
                    tempVec3.multiplyScalar(distToTravel * popProgress);

                    group.position.add(tempVec3);

                    // Glow
                    if (materials.frameMat) {
                        materials.frameMat.emissiveIntensity = popProgress * HOVER_CONFIG.emissiveIntensity;
                    }
                } else {
                    if (materials.frameMat) materials.frameMat.emissiveIntensity = 0;
                }
            }
        }
    });

    // Don't render when not visible
    // Note: We keep this component mounted to track time, but geometry visibility is toggled
    if (!isExploded && !animRef.current.isVisible) return null;

    return (
        <group
            ref={groupRef}
            visible={false}
            position={particleStartPosition}
            scale={0}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onPointerMove={handlePointerMove}
        >
            {/* Polaroid Frame */}
            <mesh geometry={frameGeometry}>
                <primitive object={materials.frameMat} attach="material" />
            </mesh>

            {/* Photo Image - Merged Front & Back */}
            <mesh position={[0, 0, 0]} geometry={photoGeometry}>
                <primitive object={materials.photoMat} attach="material" />
            </mesh>
        </group>
    );
}); // Close React.memo
