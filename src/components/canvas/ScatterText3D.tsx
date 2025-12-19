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
import { PARTICLE_CONFIG } from '../../config/particles';
import { SCATTER_CONFIG } from '../../config';

// Configuration for 3D scatter effect
const CONFIG = SCATTER_CONFIG.threeDimensional;

interface ScatterTextInstance3D {
    id: number;
    text: string;
    position: [number, number, number];
    targetPosition: [number, number, number];
    fontSize: number;
    color: string;
    delay: number;
}

/**
 * Blessing messages for variety
 */
const getBlessing = (userName: string, index: number) => {
    // 如果用户名为空，使用默认名称
    const safeName = userName.trim() || 'Friend';
    const capitalizedName = safeName.charAt(0).toUpperCase() + safeName.slice(1);
    const blessings = [
        `Merry Christmas, ${capitalizedName}!`,
        `圣诞快乐❄, ${capitalizedName}!`,
        "Wishes Come True",
        `心愿成真`,
        `Always with you, ${capitalizedName}`,
        `一直有你, ${capitalizedName}`,
    ];
    return blessings[index % blessings.length];
};
/**
 * Generate random 3D scatter positions with radial distribution
 */
function generateScatterInstances3D(count: number, userName: string): ScatterTextInstance3D[] {
    const instances: ScatterTextInstance3D[] = [];
    const { positionRange, font, colors, animation } = CONFIG;

    for (let i = 0; i < count; i++) {
        // Use radial distribution so text is visible from any camera angle
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const radius = 18 + Math.random() * 12; // Radius between 18 and 30

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = positionRange.yMin + Math.random() * (positionRange.yMax - positionRange.yMin);

        // Start position (exploding from center)
        const startX = x * 0.1;
        const startY = y * 0.5;
        const startZ = z * 0.1;

        // Random font size
        const fontSize = font.size + (Math.random() - 0.5) * font.sizeVariance;

        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];

        instances.push({
            id: i,
            text: getBlessing(userName, i),
            position: [startX, startY, startZ],
            targetPosition: [x, y, z],
            fontSize,
            color,
            delay: i * animation.staggerDelay,
        });
    }

    return instances;
}

interface TextInstance3DProps {
    instance: ScatterTextInstance3D;
    isVisible: boolean;
    startTime: number;
}

/**
 * Individual 3D text instance with animation and billboarding
 */
const TextInstance3D: React.FC<TextInstance3DProps> = ({
    instance,
    isVisible,
    startTime,
}) => {
    const meshRef = useRef<THREE.Group>(null);
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

        // Face camera (Billboarding)
        meshRef.current.quaternion.copy(state.camera.quaternion);

        // Wait for stagger delay
        if (elapsed < instance.delay) {
            materialRef.current.opacity = 0;
            return;
        }

        const localElapsed = elapsed - instance.delay;
        animState.hasStarted = true;

        if (isVisible) {
            // Fade in animation
            const fadeProgress = Math.min(localElapsed / CONFIG.animation.fadeInDuration, 1);
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
                const floatTime = localElapsed - CONFIG.animation.fadeInDuration;
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
        <group ref={meshRef}>
            <Text
                font={CONFIG.font.url}
                fontSize={instance.fontSize}
                color={instance.color}
                anchorX="center"
                anchorY="middle"
            >
                {instance.text}
                <meshBasicMaterial
                    ref={materialRef}
                    transparent
                    opacity={0}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </Text>
        </group>
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

        // NEW: 提早触发动画 - 当爆炸开始 (morphing-out) 时立即启动入场
        // 之前是等待爆炸完成 (morphing-out -> idle) 后才显示
        if (
            treeMorphState === 'morphing-out' &&
            isExploded &&
            landingPhase === 'tree' &&
            !hasShownRef.current // Prevent duplicate triggers
        ) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[ScatterText3D] Explosion started, showing 3D scatter text earlier');
            setIsVisible(true);
            setStartTime(performance.now() / 1000);
            hasShownRef.current = true;
        }

        // Hide when tree is reset
        if (!isExploded && isVisible) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[ScatterText3D] Tree reset, hiding 3D scatter text');
            setIsVisible(false);
            hasShownRef.current = false; // Reset for next explosion
        }

        prevMorphStateRef.current = treeMorphState;
    }, [treeMorphState, isExploded, landingPhase, isVisible]);

    // Generate scatter instances
    const instances = useMemo(() => {
        if (!isVisible || !userName) return [];
        return generateScatterInstances3D(CONFIG.instanceCount, userName);
    }, [isVisible, userName]);


    if (instances.length === 0 || !userName) return null;

    return (
        <group>
            {instances.map((instance) => (
                <TextInstance3D
                    key={instance.id}
                    instance={instance}
                    isVisible={isVisible}
                    startTime={startTime}
                />
            ))}
        </group>
    );
};

export default ScatterText3D;
