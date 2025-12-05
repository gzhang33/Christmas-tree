/**
 * Polaroid Photo Component
 *
 * Enhanced photo card with:
 * 1. Particle-to-photo morphing animation
 * 2. Consistent front/back content (same image on both sides)
 * 3. Gentle floating animation post-morph
 */
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MORPH_TIMING } from '../../config/photoConfig';

interface PolaroidPhotoProps {
    url: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
    isExploded: boolean;
    // Particle source position for morphing
    particleStartPosition: [number, number, number];
    // Index for staggered animation
    morphIndex: number;
}

// Polaroid frame dimensions (in local units)
const FRAME = {
    width: 1.0,
    height: 1.2,
    depth: 0.02,
    imageOffsetY: 0.1,
    imageSize: 0.85,
    // Bottom margin for Polaroid caption area
    bottomMargin: 0.15,
};

// Create reusable frame material
const createFrameMaterial = () =>
    new THREE.MeshStandardMaterial({
        color: '#ffffff',
        roughness: 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide,
    });

export const PolaroidPhoto: React.FC<PolaroidPhotoProps> = ({
    url,
    position,
    rotation,
    scale,
    isExploded,
    particleStartPosition,
    morphIndex,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [morphProgress, setMorphProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    // Animation state
    const animationRef = useRef({
        startTime: 0,
        isAnimating: false,
        currentScale: 0,
        currentPosition: new THREE.Vector3(...particleStartPosition),
        currentRotation: new THREE.Euler(0, 0, 0),
    });

    // Load texture when exploded
    useEffect(() => {
        if (!isExploded) {
            setVisible(false);
            setMorphProgress(0);
            animationRef.current.isAnimating = false;
            animationRef.current.currentScale = 0;
            return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(
            url,
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                setTexture(tex);
                setVisible(true);
                // Initialize animation
                animationRef.current.startTime = -1; // Will be set on first frame
                animationRef.current.isAnimating = true;
                animationRef.current.currentPosition.set(...particleStartPosition);
            },
            undefined,
            (error) => {
                console.warn('Failed to load photo texture:', url, error);
            }
        );
    }, [url, isExploded, particleStartPosition]);

    // Animation frame
    useFrame((state) => {
        if (!groupRef.current || !visible) return;

        const anim = animationRef.current;
        const time = state.clock.elapsedTime;

        if (anim.isAnimating) {
            // Initialize start time on first frame
            if (anim.startTime < 0) {
                anim.startTime = time;
            }

            // Calculate morph progress with stagger
            const staggeredStart = MORPH_TIMING.startDelay + morphIndex * MORPH_TIMING.staggerDelay;
            const elapsed = time - anim.startTime - staggeredStart;

            if (elapsed > 0) {
                const rawProgress = Math.min(elapsed / MORPH_TIMING.morphDuration, 1);
                // Ease-out cubic for smooth deceleration
                const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
                setMorphProgress(easedProgress);

                // Interpolate position from particle start to final position
                anim.currentPosition.lerp(new THREE.Vector3(...position), easedProgress);

                // Interpolate scale: start small (particle), grow to full
                // During early morph (0-0.3), scale grows quickly
                // During mid morph (0.3-0.7), rotation happens
                // During late morph (0.7-1.0), settle into place
                if (easedProgress < 0.3) {
                    anim.currentScale = easedProgress / 0.3 * scale * 0.5;
                } else {
                    anim.currentScale = (0.5 + (easedProgress - 0.3) / 0.7 * 0.5) * scale;
                }

                // Rotation interpolation
                const targetRotation = new THREE.Euler(...rotation);
                anim.currentRotation.x = THREE.MathUtils.lerp(0, targetRotation.x, easedProgress);
                anim.currentRotation.y = THREE.MathUtils.lerp(0, targetRotation.y, easedProgress);
                anim.currentRotation.z = THREE.MathUtils.lerp(0, targetRotation.z, easedProgress);

                // Check if animation is complete
                if (rawProgress >= 1) {
                    anim.isAnimating = false;
                }
            }
        } else if (isExploded) {
            // Post-morph floating animation
            const floatTime = time * 0.5;
            const floatOffset = new THREE.Vector3(
                Math.sin(floatTime + morphIndex * 0.5) * 0.1,
                Math.cos(floatTime * 0.7 + morphIndex * 0.3) * 0.08,
                Math.sin(floatTime * 0.6 + morphIndex * 0.7) * 0.05
            );

            groupRef.current.position.set(
                position[0] + floatOffset.x,
                position[1] + floatOffset.y,
                position[2] + floatOffset.z
            );

            // Gentle rotation
            groupRef.current.rotation.y = rotation[1] + Math.sin(floatTime * 0.3) * 0.1;
            groupRef.current.rotation.z = rotation[2] + Math.cos(floatTime * 0.4) * 0.05;

            anim.currentScale = scale;
        }

        // Apply current animation state
        if (anim.isAnimating) {
            groupRef.current.position.copy(anim.currentPosition);
            groupRef.current.rotation.copy(anim.currentRotation);
        }

        groupRef.current.scale.setScalar(anim.currentScale);
    });

    // Create materials for photo (same texture on both sides)
    // Must be before early return to satisfy React hooks rules
    const photoMaterial = useMemo(() => {
        if (!texture) return null;
        return new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: morphProgress,
        });
    }, [texture, morphProgress]);

    // Don't render when not exploded and not visible
    if (!isExploded && !visible) return null;

    return (
        <group ref={groupRef} position={particleStartPosition} scale={0}>
            {/* Polaroid Frame - White box */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[FRAME.width, FRAME.height, FRAME.depth]} />
                <meshStandardMaterial
                    color="#ffffff"
                    roughness={0.4}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                    transparent
                    opacity={morphProgress}
                />
            </mesh>

            {/* Photo Image - Front Side */}
            {photoMaterial && (
                <mesh position={[0, FRAME.imageOffsetY, FRAME.depth / 2 + 0.001]}>
                    <planeGeometry args={[FRAME.imageSize, FRAME.imageSize]} />
                    <primitive object={photoMaterial} attach="material" />
                </mesh>
            )}

            {/* Photo Image - Back Side (same content for consistency) */}
            {photoMaterial && (
                <mesh
                    position={[0, FRAME.imageOffsetY, -FRAME.depth / 2 - 0.001]}
                    rotation={[0, Math.PI, 0]}
                >
                    <planeGeometry args={[FRAME.imageSize, FRAME.imageSize]} />
                    <primitive object={photoMaterial.clone()} attach="material" />
                </mesh>
            )}

            {/* Bottom caption area decoration */}
            <mesh position={[0, -FRAME.height / 2 + FRAME.bottomMargin / 2 + 0.05, FRAME.depth / 2 + 0.002]}>
                <planeGeometry args={[FRAME.width * 0.8, 0.02]} />
                <meshBasicMaterial color="#e0e0e0" transparent opacity={morphProgress * 0.5} />
            </mesh>
        </group>
    );
};
