/**
 * ScatterText3D Component
 *
 * 3D mesh-based text scattered in the scene after tree explosion.
 * Replaces the 2D DOM-based MerryChristmasScatter component.
 *
 * Features:
 * - Uses @react-three/drei Text component for solid 3D mesh rendering
 * - True 3D positioning with perspective depth
 * - Animated entrance with spring physics
 * - Fades out when tree restores
 * - NO particle systems - pure geometry
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

// Configuration for 3D scatter effect
const SCATTER_3D_CONFIG = {
    instanceCount: 6,
    // 3D position range (world units)
    positionRange: {
        xMin: -25,
        xMax: 25,
        yMin: 2,
        yMax: 18,
        zMin: -15,
        zMax: 15,
    },
    // Animation timing (seconds)
    animation: {
        staggerDelay: 0.12,
        fadeInDuration: 0.8,
        driftSpeed: 0.3,
    },
    // Font settings
    font: {
        size: 1.2,
        sizeVariance: 0.4,
        // Uses default troika font (no custom woff required)
    },
    // Colors (hex for Three.js)
    colors: [
        '#FFD700', // Gold
        '#FFDF80', // Light gold
        '#FFC864', // Warm gold
        '#FFF5C8', // Cream gold
    ],
} as const;

interface ScatterTextInstance3D {
    id: number;
    position: [number, number, number];
    targetPosition: [number, number, number];
    rotation: [number, number, number];
    fontSize: number;
    color: string;
    delay: number;
}

/**
 * Generate random 3D scatter positions with good distribution
 */
function generateScatterInstances3D(count: number): ScatterTextInstance3D[] {
    const instances: ScatterTextInstance3D[] = [];
    const { positionRange, font, colors, animation } = SCATTER_3D_CONFIG;

    for (let i = 0; i < count; i++) {
        // Distribute in a 3x3 grid pattern with randomness
        const gridX = (i % 3) / 3;
        const gridY = Math.floor(i / 3) / 3;

        // Random offset from grid
        const randomOffsetX = (Math.random() - 0.5) * 0.3;
        const randomOffsetY = (Math.random() - 0.5) * 0.3;
        const randomOffsetZ = (Math.random() - 0.5);

        // Calculate world position
        const x = positionRange.xMin + (gridX + randomOffsetX + 0.15) * (positionRange.xMax - positionRange.xMin);
        const y = positionRange.yMin + (gridY + randomOffsetY + 0.15) * (positionRange.yMax - positionRange.yMin);
        const z = positionRange.zMin + randomOffsetZ * (positionRange.zMax - positionRange.zMin);

        // Start position (slightly inward for animation)
        const startX = x * 0.3;
        const startY = y * 0.8;
        const startZ = z * 0.3;

        // Random font size
        const fontSize = font.size + (Math.random() - 0.5) * font.sizeVariance;

        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random rotation (facing camera with slight tilt)
        const rotationY = (Math.random() - 0.5) * 0.3;
        const rotationZ = (Math.random() - 0.5) * 0.2;

        instances.push({
            id: i,
            position: [startX, startY, startZ],
            targetPosition: [x, y, z],
            rotation: [0, rotationY, rotationZ],
            fontSize,
            color,
            delay: i * animation.staggerDelay,
        });
    }

    return instances;
}

interface TextInstance3DProps {
    instance: ScatterTextInstance3D;
    text: string;
    isVisible: boolean;
    startTime: number;
}

/**
 * Individual 3D text instance with animation
 */
const TextInstance3D: React.FC<TextInstance3DProps> = ({
    instance,
    text,
    isVisible,
    startTime,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    // Animation state
    const animStateRef = useRef({
        currentPos: [...instance.position] as [number, number, number],
        currentOpacity: 0,
        hasStarted: false,
    });

    useFrame((state) => {
        if (!meshRef.current || !materialRef.current) return;

        const elapsed = state.clock.elapsedTime - startTime;
        const animState = animStateRef.current;

        // Wait for stagger delay
        if (elapsed < instance.delay) {
            materialRef.current.opacity = 0;
            return;
        }

        const localElapsed = elapsed - instance.delay;
        animState.hasStarted = true;

        if (isVisible) {
            // Fade in animation
            const fadeProgress = Math.min(localElapsed / SCATTER_3D_CONFIG.animation.fadeInDuration, 1);
            const eased = 1 - Math.pow(1 - fadeProgress, 3); // Ease out cubic

            // Lerp to target position
            animState.currentPos[0] = THREE.MathUtils.lerp(
                instance.position[0],
                instance.targetPosition[0],
                eased
            );
            animState.currentPos[1] = THREE.MathUtils.lerp(
                instance.position[1],
                instance.targetPosition[1],
                eased
            );
            animState.currentPos[2] = THREE.MathUtils.lerp(
                instance.position[2],
                instance.targetPosition[2],
                eased
            );

            // Fade in opacity
            animState.currentOpacity = eased;

            // Gentle floating motion after settling
            if (fadeProgress >= 1) {
                const floatTime = localElapsed - SCATTER_3D_CONFIG.animation.fadeInDuration;
                const floatOffset = Math.sin(floatTime * 0.5 + instance.id) * 0.2;
                animState.currentPos[1] = instance.targetPosition[1] + floatOffset;
            }
        } else {
            // Fade out animation
            animState.currentOpacity = Math.max(0, animState.currentOpacity - 0.05);
        }

        // Apply to mesh
        meshRef.current.position.set(...animState.currentPos);
        materialRef.current.opacity = animState.currentOpacity;
    });

    return (
        <Text
            ref={meshRef}
            fontSize={instance.fontSize}
            color={instance.color}
            anchorX="center"
            anchorY="middle"
            rotation={instance.rotation}
        >
            {text}
            <meshBasicMaterial
                ref={materialRef}
                transparent
                opacity={0}
                side={THREE.DoubleSide}
                depthWrite={false}
            />
        </Text>
    );
};

/**
 * Main ScatterText3D component
 */
export const ScatterText3D: React.FC = () => {
    const userName = useStore((state) => state.userName);
    const treeMorphState = useStore((state) => state.treeMorphState);
    const isExploded = useStore((state) => state.isExploded);
    const landingPhase = useStore((state) => state.landingPhase);

    const [isVisible, setIsVisible] = useState(false);
    const [startTime, setStartTime] = useState(0);
    const prevMorphStateRef = useRef(treeMorphState);
    const hasShownRef = useRef(false); // Track if already shown to prevent duplicate triggers

    // Detect when explosion animation completes
    useEffect(() => {
        const prevMorphState = prevMorphStateRef.current;

        // ONLY trigger when morphing-out completes (explosion finishes)
        // This prevents showing during the explosion start
        if (
            prevMorphState === 'morphing-out' &&
            treeMorphState === 'idle' &&
            isExploded &&
            landingPhase === 'tree' &&
            !hasShownRef.current // Prevent duplicate triggers
        ) {
            console.log('[ScatterText3D] Explosion complete, showing 3D scatter text');
            setIsVisible(true);
            setStartTime(performance.now() / 1000);
            hasShownRef.current = true;
        }

        // Hide when tree is reset
        if (!isExploded && isVisible) {
            console.log('[ScatterText3D] Tree reset, hiding 3D scatter text');
            setIsVisible(false);
            hasShownRef.current = false; // Reset for next explosion
        }

        prevMorphStateRef.current = treeMorphState;
    }, [treeMorphState, isExploded, landingPhase, isVisible]);

    // Generate scatter instances
    const instances = useMemo(() => {
        if (!isVisible) return [];
        return generateScatterInstances3D(SCATTER_3D_CONFIG.instanceCount);
    }, [isVisible]);

    // Build greeting text
    const greetingText = useMemo(() => {
        if (!userName) return 'Merry Christmas!';
        const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
        return `Merry Christmas, ${capitalizedName}!`;
    }, [userName]);

    if (instances.length === 0 || !userName) return null;

    return (
        <group>
            {instances.map((instance) => (
                <TextInstance3D
                    key={instance.id}
                    instance={instance}
                    text={greetingText}
                    isVisible={isVisible}
                    startTime={startTime}
                />
            ))}
        </group>
    );
};

export default ScatterText3D;
