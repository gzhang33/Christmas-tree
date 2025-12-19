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
 *
 * Mobile Optimization (v2):
 * - Pre-mount text during tree phase with opacity:0 for font glyph warmup
 * - Staggered entrance delay to avoid GPU peak collision during explosion
 * - Prevents black screen flicker on mobile devices
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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
    isAnimating: boolean;  // Renamed: controls animation playback
    isPrewarm: boolean;    // NEW: True when pre-mounting for font warmup (opacity:0)
    startTime: number;
}

/**
 * Individual 3D text instance with animation and billboarding
 * Supports prewarm mode for font glyph caching
 */
const TextInstance3D: React.FC<TextInstance3DProps> = ({
    instance,
    isAnimating,
    isPrewarm,
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

        // Prewarm mode: keep invisible but rendered for font texture upload
        if (isPrewarm) {
            materialRef.current.opacity = 0;
            // Position offscreen to avoid any visual artifacts
            meshRef.current.position.set(0, -1000, 0);
            return;
        }

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

        if (isAnimating) {
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
 * Main ScatterText3D component with mobile optimization
 *
 * Lifecycle:
 * 1. [tree phase, !isExploded] Pre-mount instances with opacity:0 for font warmup
 * 2. [explosion trigger] Wait entranceDelay (mobile only) to avoid GPU peak
 * 3. [isAnimating=true] Animate entrance and floating
 * 4. [!isExploded] Fade out and reset
 */
export const ScatterText3D: React.FC = () => {
    const userName = useStore((state) => state.userName);
    const treeMorphState = useStore((state) => state.treeMorphState);
    const isExploded = useStore((state) => state.isExploded);
    const landingPhase = useStore((state) => state.landingPhase);
    const { viewport } = useThree();

    // State management for phased rendering
    const [isPrewarmActive, setIsPrewarmActive] = useState(false);  // Font warmup phase
    const [isAnimating, setIsAnimating] = useState(false);          // Animation phase
    const [startTime, setStartTime] = useState(0);

    const prevMorphStateRef = useRef(treeMorphState);
    const hasTriggeredRef = useRef(false);
    const entranceTimerRef = useRef<number | null>(null);
    const isMobile = useMemo(() => viewport.width < 10, [viewport.width]);

    // Mobile config with fallback
    const mobileConfig = (CONFIG as any).mobile || { entranceDelay: 150, enableFontPrewarm: true };

    // PHASE 1: Pre-warm font during tree phase (before explosion)
    // Mount text instances with opacity:0 to force font glyph texture upload
    useEffect(() => {
        if (
            landingPhase === 'tree' &&
            !isExploded &&
            userName &&
            mobileConfig.enableFontPrewarm &&
            !isPrewarmActive
        ) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log('[ScatterText3D] Starting font prewarm phase');
            }
            setIsPrewarmActive(true);
        }
    }, [landingPhase, isExploded, userName, isPrewarmActive, mobileConfig.enableFontPrewarm]);

    // PHASE 2: Trigger animation on explosion with optional delay
    useEffect(() => {
        // Detect explosion start
        if (
            treeMorphState === 'morphing-out' &&
            isExploded &&
            landingPhase === 'tree' &&
            !hasTriggeredRef.current
        ) {
            hasTriggeredRef.current = true;

            // Mobile: delay entrance to avoid GPU peak collision
            const delay = isMobile ? mobileConfig.entranceDelay : 0;

            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log(`[ScatterText3D] Explosion detected, starting animation in ${delay}ms`);
            }

            entranceTimerRef.current = window.setTimeout(() => {
                setIsAnimating(true);
                setStartTime(performance.now() / 1000);
                setIsPrewarmActive(false); // Exit prewarm mode
            }, delay);
        }

        // Hide when tree is reset
        if (!isExploded && (isAnimating || isPrewarmActive)) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log('[ScatterText3D] Tree reset, hiding text');
            }
            setIsAnimating(false);
            setIsPrewarmActive(false);
            hasTriggeredRef.current = false;

            // Clear any pending entrance timer
            if (entranceTimerRef.current) {
                clearTimeout(entranceTimerRef.current);
                entranceTimerRef.current = null;
            }
        }

        prevMorphStateRef.current = treeMorphState;
    }, [treeMorphState, isExploded, landingPhase, isAnimating, isPrewarmActive, isMobile, mobileConfig.entranceDelay]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (entranceTimerRef.current) {
                clearTimeout(entranceTimerRef.current);
            }
        };
    }, []);

    // Generate scatter instances - memoized to avoid regeneration
    // Create during prewarm OR animation phase
    const instances = useMemo(() => {
        if ((!isPrewarmActive && !isAnimating) || !userName) return [];
        return generateScatterInstances3D(CONFIG.instanceCount, userName);
    }, [isPrewarmActive, isAnimating, userName]);

    // Early exit if no username or no instances needed
    if (!userName || instances.length === 0) return null;

    return (
        <group raycast={() => null}>
            {instances.map((instance) => (
                <TextInstance3D
                    key={instance.id}
                    instance={instance}
                    isAnimating={isAnimating}
                    isPrewarm={isPrewarmActive && !isAnimating}
                    startTime={startTime}
                />
            ))}
        </group>
    );
};

export default ScatterText3D;
