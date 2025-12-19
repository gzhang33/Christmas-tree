/**
 * UniversalParticleSystem Component
 * 
 * Unified particle renderer implementing the "Universal Renderer Architecture".
 * Orchestrates seamless transitions from text intro to magic dust spiral.
 * 
 * Features:
 * - Single WebGL Points instance for all particles
 * - Phase-based animation driven by Zustand store
 * - Smooth interpolation between text and dust states
 * - No particle destruction/recreation during transitions
 */

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { LANDING_CONFIG } from '../../config/landing';
import { PARTICLE_CONFIG, TREE_SHAPE_CONFIG } from '../../config/particles';
import { useUniversalParticleSystem } from '../../hooks/useUniversalParticleSystem';
import universalParticleVertexShader from '../../shaders/universalParticle.vert?raw';
import universalParticleFragmentShader from '../../shaders/universalParticle.frag?raw';
import { getResponsiveValue } from '../../utils/responsiveUtils';

interface UniversalParticleSystemProps {
    title?: string | readonly string[];
    username?: string;
}

// Phase number mapping (must match shader defines)
const PHASE_NUMBERS: Record<string, number> = {
    forming: 0,
    visible: 1,
    dispersing: 2,
    drifting: 3,
    reforming: 4,
    dust: 5,
    hidden: -1, // Special case: not rendered
};

export const UniversalParticleSystemComponent: React.FC<UniversalParticleSystemProps> = ({
    title = 'Merry Christmas',
    username = 'Friend',
}) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const sparkleTexture = useTexture('/textures/star_07.png');

    const { viewport, clock } = useThree();

    // Store state
    const landingPhase = useStore((state) => state.landingPhase);
    const textParticlePhase = useStore((state) => state.textParticlePhase);
    const setTextParticlePhase = useStore((state) => state.setTextParticlePhase);
    const setTextParticleProgress = useStore((state) => state.setTextParticleProgress);
    const treeMorphState = useStore((state) => state.treeMorphState);
    const magicDustColor = useStore((state) => state.magicDustColor);

    // Animation refs
    const phaseStartTimeRef = useRef(0);
    const morphStartTimeRef = useRef(0);
    const currentPhaseRef = useRef<number>(0);

    // Responsive config using standardized detection
    const config = LANDING_CONFIG.textParticle;
    const baseSize = getResponsiveValue(config.baseSize);

    // Generate unified particle attributes
    const attributes = useUniversalParticleSystem({
        title,
        username,
        dustColors: PARTICLE_CONFIG.magicDust.colors,
    });

    // Shader uniforms - unified for all phases
    // Note: magicDustColor is NOT in dependencies to prevent uniforms recreation on color change
    // Color updates are handled via useEffect for smooth transitions
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uPhase: { value: 0 },
        uProgress: { value: 0 },
        uBaseSize: { value: baseSize },
        uMap: { value: sparkleTexture },

        // Text color (gold)
        uTextColor: {
            value: new THREE.Color(
                config.colors.title.r / 255,
                config.colors.title.g / 255,
                config.colors.title.b / 255
            )
        },

        // Dust color (initial value, updated dynamically via useEffect)
        uDustColor: { value: new THREE.Color(PARTICLE_CONFIG.magicDust.colors[1] || '#b150e4') },

        // Tree/Spiral parameters
        uTreeHeight: { value: PARTICLE_CONFIG.treeHeight },
        uTreeBottomY: { value: PARTICLE_CONFIG.treeBottomY },
        uSpiralTurns: { value: PARTICLE_CONFIG.magicDust.spiralTurns },
        uRadiusOffset: { value: PARTICLE_CONFIG.magicDust.radiusOffset },
        uMaxRadius: { value: TREE_SHAPE_CONFIG.maxRadius },
        uRadiusScale: { value: TREE_SHAPE_CONFIG.radiusScale },
        uMinRadius: { value: TREE_SHAPE_CONFIG.minRadius },

        // Disperse animation parameters
        uDisperseUpForce: { value: config.disperse.upwardForce },
        uDisperseDriftAmp: { value: config.disperse.driftAmplitude },
        uDisperseNoiseScale: { value: config.disperse.noiseScale },
        uDisperseFadeStart: { value: config.disperse.fadeStart },
        uDisperseFadeEnd: { value: config.disperse.fadeEnd },

        // Dust loop parameters
        uAscentSpeed: { value: PARTICLE_CONFIG.magicDust.ascentSpeed },
        uDustFlickerFreq: { value: PARTICLE_CONFIG.magicDust.flickerFreq },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [sparkleTexture, baseSize, config]);

    // Update particle colors when magicDustColor changes
    // This updates both the uniform and the buffer attribute for immediate visual feedback
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uDustColor.value = new THREE.Color(magicDustColor);
        }

        // Also update the aColor buffer attribute for particles
        if (geometryRef.current) {
            const colorAttribute = geometryRef.current.getAttribute('aColor') as THREE.BufferAttribute;

            if (colorAttribute) {
                const colorsArray = colorAttribute.array as Float32Array;

                // Regenerate color variations from new color
                const baseColor = new THREE.Color(magicDustColor);
                const hsl = { h: 0, s: 0, l: 0 };
                baseColor.getHSL(hsl);

                const newColors = [
                    new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.8, 1), Math.min(hsl.l + 0.2, 0.95)),
                    baseColor.clone(),
                    new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 1.2, 1), Math.max(hsl.l - 0.1, 0.2)),
                ];

                // Update each particle's color with weighted distribution
                const particleCount = colorsArray.length / 3;
                for (let i = 0; i < particleCount; i++) {
                    const colorChoice = Math.random();
                    let c: THREE.Color;
                    if (colorChoice < 0.3) c = newColors[0];
                    else if (colorChoice < 0.7) c = newColors[1];
                    else c = newColors[2];

                    colorsArray[i * 3] = c.r;
                    colorsArray[i * 3 + 1] = c.g;
                    colorsArray[i * 3 + 2] = c.b;
                }

                // Mark buffer for GPU update
                colorAttribute.needsUpdate = true;
            }
        }
    }, [magicDustColor]);

    // Phase transition handler
    const transitionToPhase = useCallback((newPhase: number, time: number) => {
        currentPhaseRef.current = newPhase;
        phaseStartTimeRef.current = time;

        const phaseNames: Record<number, typeof textParticlePhase> = {
            0: 'forming',
            1: 'visible',
            2: 'dispersing',
            3: 'drifting',
            4: 'reforming',
            5: 'dust',
        };

        if (phaseNames[newPhase]) {
            setTextParticlePhase(phaseNames[newPhase]);
        }
    }, [setTextParticlePhase]);

    // Sync with landing phase changes
    useEffect(() => {
        const now = clock.elapsedTime;

        if (landingPhase === 'entrance') {
            transitionToPhase(0, now);
        } else if (landingPhase === 'text') {
            // Transition to visible if not already past it
            if (currentPhaseRef.current < 1) {
                transitionToPhase(1, now);
            }
        } else if (landingPhase === 'morphing') {
            // Capture the start time of the tree morphing phase
            morphStartTimeRef.current = now;
        }
    }, [landingPhase, transitionToPhase, clock]);

    // Animation loop
    useFrame((state) => {
        // Sync background check: Stop all calculations if hidden
        // This is critical for iOS where process might be throttled or suspended.
        if (typeof window !== 'undefined' && window.__IS_BACKGROUND__) {
            return;
        }

        const time = state.clock.elapsedTime;
        const currentPhase = currentPhaseRef.current;
        const phaseStartTime = phaseStartTimeRef.current;
        const elapsed = time - phaseStartTime;

        // Calculate progress based on phase durations
        const anim = config.animation;
        let duration = 0;
        let progress = 0;

        switch (currentPhase) {
            case 0: // forming
                duration = getResponsiveValue(anim.formDuration);
                progress = Math.min(elapsed / duration, 1.0);
                if (progress >= 1.0 && landingPhase !== 'morphing') {
                    transitionToPhase(1, time);
                }
                break;

            case 1: // visible
                progress = 1.0;
                // Wait for tree start (morphing) + delay
                if (landingPhase === 'morphing' || landingPhase === 'tree') {
                    const delay = PARTICLE_CONFIG.magicDust.reformDelay || 0;
                    if (time >= morphStartTimeRef.current + delay) {
                        transitionToPhase(4, time);
                    }
                }
                break;

            // case 2 (dispersing) and case 3 (drifting) are skipped

            case 4: // reforming
                duration = anim.reformDuration;
                progress = Math.min(elapsed / duration, 1.0);
                if (progress >= 1.0) {
                    transitionToPhase(5, time);
                }
                break;

            case 5: // dust loop - continuous animation
                progress = 1.0; // Not used in dust phase
                break;
        }

        // Update uniforms
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = time;
            materialRef.current.uniforms.uPhase.value = currentPhase;
            materialRef.current.uniforms.uProgress.value = progress;
        }

        setTextParticleProgress(progress);
    });

    // Don't render if phase is hidden or still in input phase (preloading only)
    if (textParticlePhase === 'hidden' || landingPhase === 'input') {
        return null;
    }

    return (
        <points key={attributes.count} raycast={() => null}>
            <bufferGeometry ref={geometryRef}>
                {/* Position (dummy for Three.js, actual position calculated in shader) */}
                <bufferAttribute
                    attach="attributes-position"
                    count={attributes.count}
                    array={attributes.positions}
                    itemSize={3}
                />
                {/* Text form position (used as base in shader) */}
                <bufferAttribute
                    attach="attributes-aPositionText"
                    count={attributes.count}
                    array={attributes.positions}
                    itemSize={3}
                />
                {/* Spiral T parameter */}
                <bufferAttribute
                    attach="attributes-aSpiralT"
                    count={attributes.count}
                    array={attributes.spiralT}
                    itemSize={1}
                />
                {/* Random seed per particle */}
                <bufferAttribute
                    attach="attributes-aRandom"
                    count={attributes.count}
                    array={attributes.randoms}
                    itemSize={1}
                />
                {/* Per-particle color (for dust phase) */}
                <bufferAttribute
                    attach="attributes-aColor"
                    count={attributes.count}
                    array={attributes.colors}
                    itemSize={3}
                />
                {/* Per-particle size (for dust phase) */}
                <bufferAttribute
                    attach="attributes-aSize"
                    count={attributes.count}
                    array={attributes.sizes}
                    itemSize={1}
                />
                {/* Flicker phase offset */}
                <bufferAttribute
                    attach="attributes-aFlickerPhase"
                    count={attributes.count}
                    array={attributes.flickerPhases}
                    itemSize={1}
                />
                {/* Particle type (1.0 = text, 0.0 = dust only) */}
                <bufferAttribute
                    attach="attributes-aIsText"
                    count={attributes.count}
                    array={attributes.types}
                    itemSize={1}
                />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                vertexShader={universalParticleVertexShader}
                fragmentShader={universalParticleFragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default UniversalParticleSystemComponent;
