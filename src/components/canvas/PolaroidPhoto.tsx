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
import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib'; // Import utility
import { getVideoTexture } from '../../utils/videoSingleton'; // NEW: Singleton
import { PHOTO_WALL_CONFIG } from '../../config/photoConfig';
import { HOVER_CONFIG } from '../../config/interactions';
import { getCachedTexture } from '../../utils/texturePreloader';
import { useStore } from '../../store/useStore';
import { ASSET_CONFIG } from '../../config/assets';
import { getPhotoMaterialPool } from '../../utils/materialPool'; // NEW: Material pool for optimization
import { getFrameMaterialPool } from '../../utils/frameMaterialPool'; // NEW: Frame material pool
import { getGyroscopeTilt } from '../../hooks/useGyroscope'; // GYROSCOPE: Mobile tilt effect

// Scratch objects to avoid GC (for rotation math)
const dummyObj = new THREE.Object3D();
const qOrbit = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();

// NEW: Local side-effect component to swap material texture when active
const VideoTextureSwap = ({ material }: { material: THREE.ShaderMaterial }) => {
    useEffect(() => {
        const videoTex = getVideoTexture();
        if (videoTex) {
            const oldMap = material.uniforms.map.value;
            material.uniforms.map.value = videoTex;

            return () => {
                // Revert to original image texture on unmount/close
                material.uniforms.map.value = oldMap;
            };
        }
    }, [material]);
    return null;
};
const tempVec3 = new THREE.Vector3(); // Temp vector for pop offset calculations
const tempMouseVec = new THREE.Vector3(); // Temp vector for mouse interaction
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
    textureReady?: boolean; // New prop
    poolsReady?: boolean; // NEW: Pool readiness flag
    instanceId: number; // Unique instance ID for this particle

    // NEW: External animation support (optional)
    useExternalAnimation?: boolean; // If true, disable internal useFrame
    onRegisterAnimation?: (data: {
        groupRef: React.RefObject<THREE.Group>;
        frameMaterial: THREE.MeshStandardMaterial | null;
        photoMaterial: THREE.ShaderMaterial | null;
        animState: any;
        hoverState: any;
        id: string; // NEW: Pass ID
        position: [number, number, number];
        rotation: [number, number, number];
        scale: number;
        particleStartPosition: [number, number, number];
        morphIndex: number;
        totalPhotos: number;
        instanceId: number;
        isThisActive: boolean;
    }) => void;
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

        // Front: Shift foward - Increased gap from 0.001 to 0.005 to prevent Z-fighting at distance
        frontGeo.translate(0, FRAME.imageOffsetY, FRAME.depth / 2 + 0.005);

        // Back: Shift backward and rotate
        backGeo.rotateY(Math.PI);
        backGeo.translate(0, FRAME.imageOffsetY, -FRAME.depth / 2 - 0.005);

        // Merge
        const merged = mergeBufferGeometries([frontGeo, backGeo]);
        if (!merged) {
            console.error('Failed to merge photo geometries');
            // Fallback to front geometry only
            sharedPhotoGeometry = new THREE.PlaneGeometry(FRAME.imageSize, FRAME.imageSize);
            sharedPhotoGeometry.translate(0, FRAME.imageOffsetY, FRAME.depth / 2 + 0.001);
        } else {
            sharedPhotoGeometry = merged;
        }

        // Cleanup intermediates
        frontGeo.dispose();
        backGeo.dispose();
    } return { frameGeometry: sharedFrameGeometry, photoGeometry: sharedPhotoGeometry };
};

// Shared Material (Created once to reuse WebGLProgram)
// EXPORTED: Used by material pool for initialization
export const masterPhotoMaterial = new THREE.ShaderMaterial({
    uniforms: {
        map: { value: null },
        uDevelop: { value: 0.0 }, // 0.0 = Energy, 1.0 = Photo
        opacity: { value: 0.0 },
        uTime: { value: 0.0 },
        uBend: { value: 0.0 }, // Bending effect
        uAlphaTest: { value: 0.01 } // Handle alpha discard
    },
    vertexShader: `
        varying vec2 vUv;
        uniform float uBend;
        void main() {
            vUv = uv;
            vec3 pos = position;
            // Bend effect: Curve based on X distance from center
            // Simulates card flexibility during motion
            // Curve = pow(dist, 2) * bendFactor
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
            
            // NEW: Alpha discard to stabilize depth sorting and prevent shimmery edges in the distance
            if (opacity < 0.01) discard;
        }
    `,
    transparent: true,
    side: THREE.FrontSide, // NEW: FrontSide only as we have dual-plane geometry (saves 50% frag budget & avoids Z-fighting)
    depthWrite: true,      // NEW: Explicitly enable to allow proper occlusion between cards
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
    textureReady = false, // Default to false
    poolsReady = false, // NEW: Default to false
    instanceId,
    useExternalAnimation = false, // NEW: Default to false (backward compatible)
    onRegisterAnimation, // NEW: Optional callback
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const frameMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
    const photoMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Actions - use selector to avoid re-renders (this is stable)
    const setHoveredPhoto = useStore(state => state.setHoveredPhoto);
    const setActivePhoto = useStore(state => state.setActivePhoto);
    const setPlayingVideoInHover = useStore(state => state.setPlayingVideoInHover); // NEW
    const activePhoto = useStore(state => state.activePhoto);
    const hoveredPhotoInstanceId = useStore(state => state.hoveredPhotoInstanceId); // Need current hover state for click logic
    const playingVideoInHover = useStore(state => state.playingVideoInHover); // NEW

    // Identify memory ID from URL
    const memoryId = useMemo(() => {
        return ASSET_CONFIG.memories.find(m => m.image === url)?.id || url;
    }, [url]);

    // Check exact instance ID for uniqueness
    const isThisActive = activePhoto?.instanceId === instanceId;

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
        simulatedTime: 0, // Track time adjusted for slowdown
        controlPoint: new THREE.Vector3(), // Control point for Fountain Bezier
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

        // NEW: Z-Axis Depth Effect
        currentZOffset: 0,           // Current Z-axis offset
        targetZOffset: 0,            // Target Z-axis offset (forward/backward)
        isNeighbor: false,           // Whether this photo is a neighbor of hovered photo
    });

    // Get shared geometries
    const { frameGeometry, photoGeometry } = useMemo(() => getSharedGeometries(), []);

    // Create materials once (using texture from cache)
    // OPTIMIZED: Use material pool to reduce creation overhead

    // OPTIMIZED: Acquire frame material from pool instead of creating new
    // Moved to useEffect to avoid rendering before pool is initialized
    const [frameMat, setFrameMat] = useState<THREE.MeshStandardMaterial | null>(null);

    useEffect(() => {
        if (poolsReady && !frameMat) {
            try {
                setFrameMat(getFrameMaterialPool().acquire());
            } catch (e) {
                // Fallback: Create directly if pool not ready (should not happen with poolsReady gate)
                console.warn('[PolaroidPhoto] Frame pool fallback');
                setFrameMat(new THREE.MeshStandardMaterial({
                    color: '#ffffff',
                    roughness: 0.4,
                    metalness: 0.1,
                    emissive: new THREE.Color(0xfffee0),
                    emissiveIntensity: 0,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0,
                }));
            }
        }
    }, [poolsReady, frameMat]);

    // Photo material - deferred acquisition from pool
    // Only acquire when texture is confirmed cached to avoid fallback clone
    const [photoMat, setPhotoMat] = useState<THREE.ShaderMaterial | null>(null);

    useEffect(() => {
        // Only acquire material when texture is ready (cached)
        if (!textureReady) return;

        const cachedTexture = getCachedTexture(url);
        if (cachedTexture && !photoMat) {
            try {
                const mat = getPhotoMaterialPool().acquire(cachedTexture);
                setPhotoMat(mat);
            } catch (e) {
                // Pool not initialized, fallback to clone (should rarely happen)
                console.warn('[PolaroidPhoto] Pool fallback for', url);
                setPhotoMat(masterPhotoMaterial.clone());
            }
        }
    }, [textureReady, url, photoMat]);

    // Combine for backward compatibility
    const materials = useMemo(() => ({
        frameMat,
        photoMat,
    }), [frameMat, photoMat]);

    // Sync refs for useFrame and Cleanup
    // OPTIMIZED: Release materials back to pools on unmount
    useEffect(() => {
        frameMaterialRef.current = materials.frameMat;
        photoMaterialRef.current = materials.photoMat;

        return () => {
            // OPTIMIZED: Release frame material back to pool
            if (materials.frameMat) {
                try {
                    getFrameMaterialPool().release(materials.frameMat);
                } catch (e) {
                    // Fallback: dispose if pool not available
                    materials.frameMat.dispose();
                }
            }

            // OPTIMIZED: Release photo material back to pool instead of disposing
            if (materials.photoMat) {
                try {
                    getPhotoMaterialPool().release(materials.photoMat);
                } catch (e) {
                    // Fallback: dispose if pool not available
                    materials.photoMat.dispose();
                }
            }
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

            // Calculate Fountain Control Point (Bezier P1)
            const p0 = new THREE.Vector3(...particleStartPosition);
            const p2 = new THREE.Vector3(...position);
            const mid = new THREE.Vector3().addVectors(p0, p2).multiplyScalar(0.5);
            // Fountain height boost (randomized 8-12 units for dramatic effect)
            mid.y = Math.max(p0.y, p2.y) + 8.0 + Math.random() * 4.0;
            anim.controlPoint.copy(mid);

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
    }, [isExploded, url, particleStartPosition, materials, textureReady]);

    // === NEW: Register animation data with PhotoManager (if using external animation) ===
    useEffect(() => {
        if (useExternalAnimation && onRegisterAnimation) {
            onRegisterAnimation({
                groupRef,
                frameMaterial: frameMaterialRef.current,
                photoMaterial: photoMaterialRef.current,
                animState: animRef.current,
                hoverState: hoverRef.current,
                id: memoryId, // NEW: Pass global tracking ID
                position,
                rotation,
                scale,
                particleStartPosition,
                morphIndex,
                totalPhotos,
                instanceId,
                isThisActive,
            });
        }
    }, [useExternalAnimation, onRegisterAnimation, memoryId, position, rotation, scale, particleStartPosition, morphIndex, totalPhotos, instanceId, isThisActive]);

    // === HOVER EVENT HANDLERS (AC: 1, 3) ===

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();

        // Disable hover during photo centering animation
        if (activePhoto) return;

        setHoveredPhoto(instanceId); // Notify global store with instanceId

        const hover = hoverRef.current;
        hover.isHovered = true;
        hover.targetScale = HOVER_CONFIG.scaleTarget;
        hover.targetRotationMultiplier = HOVER_CONFIG.rotationDamping;

        // NEW: Set forward Z-offset for depth effect
        hover.targetZOffset = HOVER_CONFIG.depthEffect.forwardDistance;

        // NEW: Set max renderOrder to prevent occlusion by snow/particles
        if (groupRef.current) {
            groupRef.current.renderOrder = HOVER_CONFIG.depthEffect.maxRenderOrder;
        }

        // Standard pointer cursor (no custom icon per AC:3)
        document.body.style.cursor = 'pointer';
    }, [instanceId, memoryId, setHoveredPhoto, activePhoto]);

    const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();

        // Disable hover during photo centering animation
        if (activePhoto) return;

        // NEW: Don't clear hover if this photo is playing video
        // Keep the hover effects while video is playing
        const isThisPlayingVideo = playingVideoInHover?.instanceId === instanceId;
        if (isThisPlayingVideo) {
            // Keep hover state active, just update cursor
            document.body.style.cursor = 'auto';
            return;
        }

        setHoveredPhoto(null); // Notify global store

        const hover = hoverRef.current;
        hover.isHovered = false;
        hover.targetScale = 1.0;
        hover.targetRotationMultiplier = 1.0;
        hover.targetTiltX = 0;
        hover.targetTiltY = 0;

        // NEW: Reset Z-offset
        hover.targetZOffset = 0;

        // NEW: Reset renderOrder
        if (groupRef.current) {
            groupRef.current.renderOrder = 0;
        }

        document.body.style.cursor = 'auto';
    }, [memoryId, setHoveredPhoto, activePhoto, playingVideoInHover, instanceId]);

    // === 3D TILT INTERACTION (AC: 2) ===

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();

        // Disable tilt during photo centering animation
        if (activePhoto) return;

        const hover = hoverRef.current;

        if (!hover.isHovered || !groupRef.current) return;

        // Safe fallback if e.uv is undefined
        // Use e.point for 3D position-based tilt calculation
        if (e.uv) {
            // UV-based tilt (if available)
            const normalizedX = (e.uv.x - 0.5) * 2; // Convert 0-1 to -1 to 1
            const normalizedY = (e.uv.y - 0.5) * 2;

            const clampedX = THREE.MathUtils.clamp(normalizedX, -1, 1);
            const clampedY = THREE.MathUtils.clamp(normalizedY, -1, 1);

            hover.targetTiltY = -clampedX * HOVER_CONFIG.tiltMaxAngle;
            hover.targetTiltX = clampedY * HOVER_CONFIG.tiltMaxAngle;
        } else {
            // Fallback: Get intersection point in local coordinates using scratch vector
            tempMouseVec.copy(e.point);
            groupRef.current.worldToLocal(tempMouseVec);

            // Calculate normalized offset from center (-1 to 1)
            // Frame dimensions: width=1.0, height=1.2
            const normalizedX = (tempMouseVec.x / (FRAME.width / 2));
            const normalizedY = (tempMouseVec.y / (FRAME.height / 2));

            // Clamp values to avoid extreme tilts
            const clampedX = THREE.MathUtils.clamp(normalizedX, -1, 1);
            const clampedY = THREE.MathUtils.clamp(normalizedY, -1, 1);

            // Apply tilt: mouse on right tilts card left (negative Y rotation)
            // Mouse on top tilts card back (positive X rotation)
            hover.targetTiltY = -clampedX * HOVER_CONFIG.tiltMaxAngle;
            hover.targetTiltX = clampedY * HOVER_CONFIG.tiltMaxAngle;
        }
    }, [memoryId, setHoveredPhoto, activePhoto]);

    // Animation frame - optimized to minimize allocations
    // NEW: Skip if using external animation (PhotoManager handles it)
    useFrame((state, delta) => {
        // Early exit if using external animation
        if (useExternalAnimation) return;

        const group = groupRef.current;
        const anim = animRef.current;
        const hover = hoverRef.current;

        if (!group || !anim.isVisible) return;

        const time = state.clock.elapsedTime;

        // === HOVER INTERPOLATION (smooth transitions) ===
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
        }

        hover.tiltX = THREE.MathUtils.lerp(hover.tiltX, hover.targetTiltX, tiltLerpFactor);
        hover.tiltY = THREE.MathUtils.lerp(hover.tiltY, hover.targetTiltY, tiltLerpFactor);

        // NEW: Smooth Z-axis offset transition
        hover.currentZOffset = THREE.MathUtils.lerp(hover.currentZOffset, hover.targetZOffset, depthLerpFactor);

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
                // FOUNTAIN ARC ANIMATION (Quadratic Bezier)
                const flightDuration = 1.8; // Time to fly
                const tRaw = elapsed / flightDuration;
                const t = Math.min(Math.max(tRaw, 0), 1);
                const easeT = 1 - Math.pow(1 - t, 3); // Cubic ease out for position? No, linear t for Bezier is better physics.
                // Actually simple T is fine for arc.

                const tInv = 1 - t;
                const tInv2 = tInv * tInv;
                const t2 = t * t;
                const twoTInvT = 2 * tInv * t;

                // P0 (Start)
                const x0 = particleStartPosition[0];
                const y0 = particleStartPosition[1];
                const z0 = particleStartPosition[2];

                // P1 (Control High Point)
                const x1 = anim.controlPoint.x;
                const y1 = anim.controlPoint.y;
                const z1 = anim.controlPoint.z;

                // P2 (Target)
                const x2 = position[0];
                const y2 = position[1];
                const z2 = position[2];

                // Bezier Interpolation
                anim.currentPosition.x = tInv2 * x0 + twoTInvT * x1 + t2 * x2;
                anim.currentPosition.y = tInv2 * y0 + twoTInvT * y1 + t2 * y2;
                anim.currentPosition.z = tInv2 * z0 + twoTInvT * z1 + t2 * z2;

                // Rotation: Spin wildly during flight, settle at end
                const spinDecay = 1 - easeT;
                anim.currentRotation.x = rotation[0] + (Math.sin(time * 10) * spinDecay * 2);
                anim.currentRotation.y = rotation[1] + (time * 8 * spinDecay);
                anim.currentRotation.z = rotation[2] + (Math.cos(time * 8) * spinDecay * 2);

                // Scale: rapid elastic pop
                const scaleProgress = Math.min(elapsed / 0.4, 1);
                const elastic = scaleProgress === 1 ? 1 : 1 - Math.pow(2, -10 * scaleProgress);
                group.scale.setScalar(scale * elastic);

                // Develop photo as it flies
                developProgress = t * t; // Reveal mostly near end

                if (t >= 1) {
                    anim.isAnimating = false;
                    group.scale.setScalar(scale);
                    anim.currentPosition.set(x2, y2, z2);
                    anim.currentRotation.set(rotation[0], rotation[1], rotation[2]);
                    developProgress = 1.0;
                }
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
            group.rotation.copy(anim.currentRotation);
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
                    anim.simulatedTime = 0; // Start simulated time
                }

                // Check if THIS photo is playing video
                const isThisPlayingVideo = playingVideoInHover?.instanceId === instanceId;

                // Advance simulated time based on rotation multiplier (handling slowdown)
                // FREEZE when playing video
                if (!isThisPlayingVideo) {
                    anim.simulatedTime += delta * hover.rotationMultiplier;
                }
                const hoverTime = anim.simulatedTime;

                const idx = morphIndex * 0.5;

                // Orbit
                const initialX = position[0];
                const initialZ = position[2];
                const radius = Math.sqrt(initialX * initialX + initialZ * initialZ);

                // Global Hover Check
                const isAnyHovered = useStore.getState().hoveredPhotoInstanceId !== null;

                // FREEZE orbit when playing video
                const effectiveSpeed = (isAnyHovered || isThisPlayingVideo) ? 0 : (0.05 + (1.0 / (radius + 0.1)) * 0.1);

                // Accumulate angle
                anim.orbitAngle += effectiveSpeed * delta;

                // 1. Calculate Base Position (Orbit + Bobbing)
                const baseX = Math.cos(anim.orbitAngle) * radius;
                const baseZ = Math.sin(anim.orbitAngle) * radius;

                // NEW: 丝滑过度因子 - 消除进入轨道时的瞬间震动
                const orbitEntranceFactor = Math.min(hoverTime * 0.66, 1.0);

                // FREEZE bobbing when playing video
                const yBob = isThisPlayingVideo ? 0 : Math.sin(hoverTime * 0.5 + idx) * 0.3;

                // NEW: Apply Z-axis depth offset for hover effect
                // Calculate direction from center to photo for consistent Z-offset direction
                const directionZ = baseZ / (radius || 1); // Normalized Z direction
                const zWithOffset = baseZ + (directionZ * hover.currentZOffset);

                group.position.set(baseX, position[1] + (yBob * orbitEntranceFactor), zWithOffset);

                // 2. Calculate Base Rotation (Spinning) & Convert to Quaternion
                // Stop spinning if Active or Playing Video
                const shouldFreezeRotation = isThisActive || isThisPlayingVideo;
                const spinY = shouldFreezeRotation ? rotation[1] : (rotation[1] + hoverTime * 0.15 * orbitEntranceFactor);
                const spinX = shouldFreezeRotation ? rotation[0] : (rotation[0] + Math.sin(hoverTime * 0.3 + idx) * 0.05 * orbitEntranceFactor);
                const spinZ = shouldFreezeRotation ? rotation[2] : (rotation[2] + Math.cos(hoverTime * 0.25 + idx) * 0.05 * orbitEntranceFactor);

                // Reset rotation to ensure FromEuler works cleanly on base state
                group.rotation.set(0, 0, 0);
                reusableEuler.set(spinX, spinY, spinZ);
                qOrbit.setFromEuler(reusableEuler);

                // 3. Auto-Face Calibration (Slerp to Camera Check)
                // FORCE face camera if Active
                if (hover.currentScale > 1.01 || isThisActive) {
                    const popProgress = isThisActive
                        ? 1.0
                        : (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

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
                // If Active, override scale to 2.5x (ZOOM_SCALE)
                if (isThisActive) {
                    hover.targetScale = 2.5;

                    // NEW: Ensure active photo has max renderOrder
                    if (groupRef.current) {
                        groupRef.current.renderOrder = HOVER_CONFIG.depthEffect.maxRenderOrder;
                    }
                }

                const finalScale = scale * hover.currentScale;
                group.scale.setScalar(finalScale);

                // 6. Adaptive Pop & Emissive Glow
                if (hover.currentScale > 1.01) {
                    const popProgress = (hover.currentScale - 1.0) / (HOVER_CONFIG.scaleTarget - 1.0);

                    // Adaptive Pop: Move to Ideal Distance
                    // ONLY if NOT active (because CameraController handles position when Active)
                    if (!isThisActive) {
                        // Goal: Bring photo to HOVER_CONFIG.idealDistance from camera
                        const currentDist = group.position.distanceTo(state.camera.position);
                        const idealDist = HOVER_CONFIG.idealDistance;
                        const distToTravel = Math.max(HOVER_CONFIG.popDistance, currentDist - idealDist);

                        // Reuse tempVec3 to avoid per-frame allocations
                        tempVec3.subVectors(state.camera.position, group.position).normalize();
                        tempVec3.multiplyScalar(distToTravel * popProgress);

                        group.position.add(tempVec3);
                    }

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

    // Check for video
    const videoUrl = useMemo(() => {
        const memory = ASSET_CONFIG.memories.find(m => m.image === url);
        return memory?.video || null;
    }, [url]);

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
            onClick={(e) => {
                e.stopPropagation();
                if (!isExploded || !groupRef.current) return;

                const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

                // === CHECK CURRENT PLAYING STATE ===
                const isThisPlayingVideo = playingVideoInHover?.instanceId === instanceId;

                // === EXIT LOGIC: Click same photo again → Exit video/hover mode ===
                if (isThisPlayingVideo) {
                    setPlayingVideoInHover(null);
                    setHoveredPhoto(null);
                    return;
                }

                // === MOBILE INTERACTION: 3-step process ===
                // Tap 1 → Preview (Hover)
                // Tap 2 → Play Video (if has video) or stay in hover
                // Tap 3 → Exit
                if (isTouch && hoveredPhotoInstanceId !== instanceId) {
                    // First tap: Set hover preview
                    setHoveredPhoto(instanceId);
                    return;
                }

                // === SWITCH LOGIC: Click other photo while one is playing ===
                if (playingVideoInHover && playingVideoInHover.instanceId !== instanceId) {
                    // Switch to this photo (if has video)
                    if (videoUrl) {
                        setPlayingVideoInHover({
                            instanceId,
                            videoUrl,
                            photoPosition: position
                        });
                    } else {
                        // No video, just switch hover
                        setPlayingVideoInHover(null);
                        setHoveredPhoto(instanceId);
                    }
                    return;
                }

                // === PLAY VIDEO: Click hovered photo with video ===
                if (videoUrl && hoveredPhotoInstanceId === instanceId) {
                    setPlayingVideoInHover({
                        instanceId,
                        videoUrl,
                        photoPosition: position
                    });
                    return;
                }

                // === LEGACY: No video, keep old active behavior (optional) ===
                // If you want to remove the centering behavior entirely, comment this out
                // For now, photos without video can still be "activated" for viewing
                // But this is optional - per requirements, we can skip this
            }}
        >
            {/* Singleton Video Logic Side Effect - Now triggered by playingVideoInHover */}
            {playingVideoInHover?.instanceId === instanceId && videoUrl && materials.photoMat && (
                <VideoTextureSwap material={materials.photoMat} />
            )}

            {/* Legacy: Active photo video (kept for compatibility, but new mode uses playingVideoInHover) */}
            {isThisActive && !playingVideoInHover && videoUrl && materials.photoMat && (
                <VideoTextureSwap material={materials.photoMat} />
            )}

            {/* Close Button UI - REMOVED per user requirements */}
            {/* The exit mechanism is now: click same photo again, click other photo, or click background */}

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
