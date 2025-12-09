/**
 * Landing Particles Component
 * 
 * Unified particle system for the landing page animation flow.
 * Handles the following phases:
 * - entrance: Particles fall from above to form text
 * - text: "Merry Christmas" + user name displayed as particles
 * - morphing: Text morphs into Christmas tree shape
 * 
 * Uses GPU-driven animation via vertex shader.
 */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, LandingPhase } from '../../store/useStore';
import { PARTICLE_CONFIG } from '../../config/particles';
import { LANDING_CONFIG } from '../../config/landing';
import {
    generateMultiLineTextParticles,
    padParticlePositions,
    createEntranceStartPositions,
} from '../../utils/textParticleGenerator';
import { getTreeRadius } from '../../utils/treeUtils';

import landingVertexShader from '../../shaders/landing.vert?raw';
import landingFragmentShader from '../../shaders/landing.frag?raw';

interface LandingParticlesProps {
    onEntranceComplete?: () => void;
    onMorphingComplete?: () => void;
}

/**
 * Generates tree particle positions matching TreeParticles.tsx algorithm
 */
function generateTreePositions(count: number): Float32Array {
    const positions = new Float32Array(count * 3);
    const treeHeight = PARTICLE_CONFIG.treeHeight;
    const treeBottomY = PARTICLE_CONFIG.treeBottomY;

    for (let i = 0; i < count; i++) {
        // Vertical distribution - bias towards bottom (matches TreeParticles)
        const t = Math.pow(Math.random(), 1.8);
        const y = treeBottomY + t * treeHeight;

        // Tree radius at this height
        const baseRadius = getTreeRadius(t);
        const layerNoise = Math.sin(y * 2.5) * 0.15;
        const coneR = baseRadius + layerNoise;

        // Branch angle
        const branchAngle = Math.random() * Math.PI * 2;

        // Silhouette distribution (75% surface, 25% interior)
        const isSurface = Math.random() > 0.25;
        let distFromTrunk = isSurface
            ? 0.95 + Math.random() * 0.05
            : Math.pow(Math.random(), 0.5);

        // Apply droop
        const droop = distFromTrunk * distFromTrunk * 1.0;

        const r = distFromTrunk * coneR;
        const flockNoise = (Math.random() - 0.5) * 0.1;

        positions[i * 3] = Math.cos(branchAngle) * r + flockNoise;
        positions[i * 3 + 1] = y - droop + (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 2] = Math.sin(branchAngle) * r + flockNoise;
    }

    return positions;
}

/**
 * Creates shader material for landing particles
 */
function createLandingShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: landingVertexShader,
        fragmentShader: landingFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uEntranceProgress: { value: 0.0 },
            uMorphProgress: { value: 0.0 },
            uPhase: { value: 0 }, // 0=entrance, 1=text, 2=morphing, 3=complete
            uBaseSize: { value: 0.5 },
            uColor: { value: new THREE.Color('#1a5f2a') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        vertexColors: true,
    });
}

export const LandingParticles: React.FC<LandingParticlesProps> = ({
    onEntranceComplete,
    onMorphingComplete,
}) => {
    const { viewport } = useThree();
    const userNameRaw = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);
    const treeColor = useStore((state) => state.treeColor);

    // Capitalize first letter of username
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : userNameRaw;

    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Animation progress refs
    const entranceProgressRef = useRef(0);
    const morphProgressRef = useRef(0);
    const phaseStartTimeRef = useRef(0);

    // Callback guards - 确保回调只触发一次
    const entranceCompleteRef = useRef(false);
    const morphingCompleteRef = useRef(false);

    // Generate particle data
    const particleData = useMemo(() => {
        // Generate text particles for "Merry Christmas" + user name
        const lines = ['Merry', 'Christmas'];
        if (userName) {
            lines.push(userName);
        }

        // 响应式参数选择：根据视口宽度
        const isCompact = viewport.width < 768;
        const particleConfig = LANDING_CONFIG.title.particleGeneration;

        const fontSize = isCompact
            ? particleConfig.fontSize.compact
            : particleConfig.fontSize.normal;

        const worldWidth = isCompact
            ? particleConfig.worldWidth.compact
            : particleConfig.worldWidth.normal;

        const textResult = generateMultiLineTextParticles(lines, {
            fontSize,
            density: particleConfig.density,
            worldWidth,
            zOffset: particleConfig.zOffset,
            yOffset: particleConfig.yOffset,
        });

        // Determine particle count (max of text and tree needs)
        const treeParticleCount = PARTICLE_CONFIG.minCounts.tree;
        const maxCount = Math.max(textResult.count, treeParticleCount);

        // Pad text positions to match max count
        const textPositions = padParticlePositions(textResult, maxCount);

        // Generate tree positions
        const treePositions = generateTreePositions(maxCount);

        // Generate entrance start positions (above screen)
        const entrancePositions = createEntranceStartPositions(textPositions, 40);

        // Generate colors (gradient from gold to green)
        const colors = new Float32Array(maxCount * 3);
        const goldColor = new THREE.Color('#FFD700');
        const greenColor = new THREE.Color('#1a5f2a');

        for (let i = 0; i < maxCount; i++) {
            const t = i / maxCount;
            const color = goldColor.clone().lerp(greenColor, t * 0.7);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        // Generate random seeds
        const randoms = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            randoms[i] = Math.random();
        }

        // Generate sizes
        const sizes = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            sizes[i] = 0.4 + Math.random() * 0.5;
        }

        // Visibility mask (1.0 for text particles, 0.0 for padding)
        const visibility = new Float32Array(maxCount);
        for (let i = 0; i < textResult.count; i++) {
            visibility[i] = 1.0;
        }
        // Padding particles fade in during morphing
        for (let i = textResult.count; i < maxCount; i++) {
            visibility[i] = 0.0;
        }

        return {
            entrancePositions,
            textPositions,
            treePositions,
            colors,
            randoms,
            sizes,
            visibility,
            count: maxCount,
            textCount: textResult.count,
        };
    }, [userName, viewport.width]);

    // Create geometry
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        geo.setAttribute('position', new THREE.BufferAttribute(particleData.textPositions, 3));
        geo.setAttribute('positionEntrance', new THREE.BufferAttribute(particleData.entrancePositions, 3));
        geo.setAttribute('positionText', new THREE.BufferAttribute(particleData.textPositions, 3));
        geo.setAttribute('positionTree', new THREE.BufferAttribute(particleData.treePositions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3));
        geo.setAttribute('aRandom', new THREE.BufferAttribute(particleData.randoms, 1));
        geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
        geo.setAttribute('aVisibility', new THREE.BufferAttribute(particleData.visibility, 1));

        return geo;
    }, [particleData]);

    // 清理几何体
    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    // Create material synchronously to avoid null on first render
    const material = useMemo(() => createLandingShaderMaterial(), []);
    materialRef.current = material;

    // Update color when treeColor changes
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uColor.value = new THREE.Color(treeColor);
        }
    }, [treeColor]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            materialRef.current?.dispose();
        };
    }, []);

    // Track phase changes
    useEffect(() => {
        phaseStartTimeRef.current = performance.now() / 1000;

        // Reset progress when entering new phase
        if (landingPhase === 'entrance') {
            entranceProgressRef.current = 0;
            entranceCompleteRef.current = false; // 重置回调守卫
        } else if (landingPhase === 'morphing') {
            morphProgressRef.current = 0;
            morphingCompleteRef.current = false; // 重置回调守卫
        } else if (landingPhase === 'tree') {
            // 设置最终状态的 uniforms（在组件返回 null 之前）
            if (materialRef.current) {
                materialRef.current.uniforms.uPhase.value = 3;
                materialRef.current.uniforms.uMorphProgress.value = 1.0;
            }
        }
    }, [landingPhase]);

    // Animation loop
    useFrame((state) => {
        if (!materialRef.current) return;

        const time = state.clock.elapsedTime;
        const elapsed = time - phaseStartTimeRef.current;

        const entranceCompletedRef = useRef(false);

        // 在 useEffect 中重置标记
        useEffect(() => {
            phaseStartTimeRef.current = performance.now() / 1000;
            if (landingPhase === 'entrance') {
                entranceProgressRef.current = 0;
                entranceCompletedRef.current = false;
            } else if (landingPhase === 'morphing') {
                morphProgressRef.current = 0;
            }
        }, [landingPhase]);

        // 在 useFrame 中检查标记
        useFrame((state) => {
            // ...
            if (landingPhase === 'entrance') {
                // ...
                if (progress >= 1.0 && onEntranceComplete && !entranceCompletedRef.current) {
                    entranceCompletedRef.current = true;
                    onEntranceComplete();
                }
            }
        });
        // Phase-specific logic
        if (landingPhase === 'entrance') {
            materialRef.current.uniforms.uPhase.value = 0;

            // Entrance animation progress
            const progress = Math.min(elapsed / LANDING_CONFIG.entrance.duration, 1.0);
            entranceProgressRef.current = easeOutCubic(progress);
            materialRef.current.uniforms.uEntranceProgress.value = entranceProgressRef.current;

            // Trigger callback when complete (一次性守卫)
            if (progress >= 1.0 && onEntranceComplete && !entranceCompleteRef.current) {
                entranceCompleteRef.current = true;
                onEntranceComplete();
            }
        } else if (landingPhase === 'text') {
            materialRef.current.uniforms.uPhase.value = 1;
            materialRef.current.uniforms.uEntranceProgress.value = 1.0;
        } else if (landingPhase === 'morphing') {
            materialRef.current.uniforms.uPhase.value = 2;

            // Morphing animation progress
            const progress = Math.min(elapsed / LANDING_CONFIG.morphing.duration, 1.0);
            morphProgressRef.current = easeInOutCubic(progress);
            materialRef.current.uniforms.uMorphProgress.value = morphProgressRef.current;

            // Trigger callback when complete (一次性守卫)
            if (progress >= 1.0 && onMorphingComplete && !morphingCompleteRef.current) {
                morphingCompleteRef.current = true;
                onMorphingComplete();
            }
        }
    });

    // Don't render during input phase or after tree phase (TreeParticles takes over)
    if (landingPhase === 'input' || landingPhase === 'tree') {
        return null;
    }

    return (
        <points ref={pointsRef} geometry={geometry} material={materialRef.current}>
            {/* Points rendered via geometry + material */}
        </points>
    );
};

// Easing functions
function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export default LandingParticles;
