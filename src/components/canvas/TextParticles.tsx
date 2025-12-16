/**
 * TextParticles Component
 * 
 * 3D WebGL particle system for rendering Title and Username text.
 * Implements multi-phase animation: forming → visible → dispersing → reforming → dust.
 * 
 * Uses OffscreenCanvas to sample text pixels and generate particle positions.
 * Shares shader patterns with MagicDust for visual consistency.
 */

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { LANDING_CONFIG } from '../../config/landing';
import { PARTICLE_CONFIG, TREE_SHAPE_CONFIG } from '../../config/particles';
import textParticleVertexShader from '../../shaders/textParticle.vert?raw';
import textParticleFragmentShader from '../../shaders/textParticle.frag?raw';

interface TextParticlesProps {
    title?: string;
    username?: string;
}

interface TextParticleData {
    positions: Float32Array;
    spiralT: Float32Array;
    randoms: Float32Array;
    count: number;
}

/**
 * Sample text pixels using OffscreenCanvas and generate particle positions
 */
function generateTextParticles(
    text: string,
    fontSize: number,
    fontFamily: string,
    density: number,
    worldWidth: number,
    yOffset: number
): TextParticleData {
    // Create offscreen canvas for text sampling
    const canvas = new OffscreenCanvas(1024, 256);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.warn('[TextParticles] Failed to get 2D context');
        return { positions: new Float32Array(0), spiralT: new Float32Array(0), randoms: new Float32Array(0), count: 0 };
    }

    // Setup text rendering
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    // Resize canvas to fit text
    canvas.width = Math.ceil(textWidth + 20);
    canvas.height = Math.ceil(textHeight + 20);

    // Re-setup after resize
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const particlePositions: number[] = [];
    const particleSpiralT: number[] = [];
    const particleRandoms: number[] = [];

    // Sample at density intervals
    for (let y = 0; y < canvas.height; y += density) {
        for (let x = 0; x < canvas.width; x += density) {
            const i = (y * canvas.width + x) * 4;
            const alpha = pixels[i + 3];

            if (alpha > 128) {
                // Convert canvas coords to world coords
                const worldX = ((x / canvas.width) - 0.5) * worldWidth;
                const worldY = ((0.5 - y / canvas.height) * (worldWidth * canvas.height / canvas.width)) + yOffset;
                const worldZ = 0;

                particlePositions.push(worldX, worldY, worldZ);

                // Assign random spiral T for reform phase
                particleSpiralT.push(Math.random());
                particleRandoms.push(Math.random());
            }
        }
    }

    return {
        positions: new Float32Array(particlePositions),
        spiralT: new Float32Array(particleSpiralT),
        randoms: new Float32Array(particleRandoms),
        count: particlePositions.length / 3,
    };
}

export const TextParticles: React.FC<TextParticlesProps> = ({
    title = 'Merry Christmas',
    username = 'Friend',
}) => {
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const sparkleTexture = useTexture('/textures/sparkle.png');

    const { viewport } = useThree();

    // Store state
    const landingPhase = useStore((state) => state.landingPhase);
    const textParticlePhase = useStore((state) => state.textParticlePhase);
    const setTextParticlePhase = useStore((state) => state.setTextParticlePhase);
    const textParticleProgress = useStore((state) => state.textParticleProgress);
    const setTextParticleProgress = useStore((state) => state.setTextParticleProgress);
    const treeMorphState = useStore((state) => state.treeMorphState);

    // Animation refs
    const phaseStartTimeRef = useRef(0);
    const currentPhaseRef = useRef<number>(0);

    // Responsive config
    const isMobile = viewport.width < 10;
    const config = LANDING_CONFIG.textParticle;
    const density = isMobile ? config.density.compact : config.density.normal;
    const baseSize = isMobile ? config.baseSize.compact : config.baseSize.normal;
    const worldWidth = isMobile ? config.layout.worldWidth.compact : config.layout.worldWidth.normal;

    // Generate particle data
    const particleData = useMemo(() => {
        const fontFamily = "'Merry Christmas Star', 'Mountains of Christmas', cursive";
        const fontSize = 80;

        // Generate title particles
        const titleData = generateTextParticles(
            title,
            fontSize,
            fontFamily,
            density,
            worldWidth,
            config.layout.titleY
        );

        // Generate username particles
        const usernameData = generateTextParticles(
            username,
            fontSize * 0.4,
            "'Courier New', monospace",
            density,
            worldWidth * 0.6,
            config.layout.usernameY
        );

        // Combine both
        const totalCount = titleData.count + usernameData.count;
        const allPositions = new Float32Array(totalCount * 3);
        const allSpiralT = new Float32Array(totalCount);
        const allRandoms = new Float32Array(totalCount);

        // Copy title particles
        allPositions.set(titleData.positions, 0);
        allSpiralT.set(titleData.spiralT, 0);
        allRandoms.set(titleData.randoms, 0);

        // Copy username particles
        allPositions.set(usernameData.positions, titleData.count * 3);
        allSpiralT.set(usernameData.spiralT, titleData.count);
        allRandoms.set(usernameData.randoms, titleData.count);

        console.log(`[TextParticles] Generated ${totalCount} particles (title: ${titleData.count}, username: ${usernameData.count})`);

        return {
            positions: allPositions,
            spiralT: allSpiralT,
            randoms: allRandoms,
            count: totalCount,
        };
    }, [title, username, density, worldWidth, config.layout.titleY, config.layout.usernameY]);

    // Shader uniforms
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uPhase: { value: 0 },
        uProgress: { value: 0 },
        uBaseSize: { value: baseSize },
        uColor: { value: new THREE.Color(config.colors.title.r / 255, config.colors.title.g / 255, config.colors.title.b / 255) },
        uMap: { value: sparkleTexture },
        // MagicDust spiral params
        uTreeHeight: { value: PARTICLE_CONFIG.treeHeight },
        uTreeBottomY: { value: PARTICLE_CONFIG.treeBottomY },
        uSpiralTurns: { value: PARTICLE_CONFIG.magicDust.spiralTurns },
        uRadiusOffset: { value: PARTICLE_CONFIG.magicDust.radiusOffset },
        uMaxRadius: { value: TREE_SHAPE_CONFIG.maxRadius },
        uRadiusScale: { value: TREE_SHAPE_CONFIG.radiusScale },
        uMinRadius: { value: TREE_SHAPE_CONFIG.minRadius },
        // Disperse params
        uDisperseUpForce: { value: config.disperse.upwardForce },
        uDisperseDriftAmp: { value: config.disperse.driftAmplitude },
        uDisperseNoiseScale: { value: config.disperse.noiseScale },
        uDisperseFadeStart: { value: config.disperse.fadeStart },
        uDisperseFadeEnd: { value: config.disperse.fadeEnd },
    }), [sparkleTexture, baseSize, config]);

    // Phase transition handler
    const transitionToPhase = useCallback((newPhase: number, time: number) => {
        currentPhaseRef.current = newPhase;
        phaseStartTimeRef.current = time;

        const phaseNames: Record<number, typeof textParticlePhase> = {
            0: 'forming',
            1: 'visible',
            2: 'dispersing',
            3: 'drifting',  // NEW: wait for tree
            4: 'reforming',
        };

        if (phaseNames[newPhase]) {
            setTextParticlePhase(phaseNames[newPhase]);
        }
    }, [setTextParticlePhase]);

    // Sync with landing phase
    useEffect(() => {
        if (landingPhase === 'entrance') {
            transitionToPhase(0, performance.now() / 1000);
        } else if (landingPhase === 'text') {
            // If already in visible phase, stay there
            if (currentPhaseRef.current < 1) {
                transitionToPhase(1, performance.now() / 1000);
            }
        } else if (landingPhase === 'morphing') {
            // Start dispersing
            transitionToPhase(2, performance.now() / 1000);
        }
    }, [landingPhase, transitionToPhase]);

    // Animation loop
    useFrame((state) => {
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
                duration = anim.formDuration;
                progress = Math.min(elapsed / duration, 1.0);
                if (progress >= 1.0 && landingPhase !== 'morphing') {
                    transitionToPhase(1, time);
                }
                break;
            case 1: // visible
                progress = 1.0;
                // Auto-transition after displayDuration
                if (elapsed >= anim.displayDuration && landingPhase === 'text') {
                    // Stay in visible, transition triggered by landingPhase change
                }
                break;
            case 2: // dispersing
                duration = anim.disperseDuration;
                progress = Math.min(elapsed / duration, 1.0);
                if (progress >= 1.0) {
                    // Enter drifting phase instead of reforming directly
                    transitionToPhase(3, time);
                }
                break;
            case 3: // drifting - wait for tree to complete morphing
                progress = 1.0; // Hold at dispersed state
                // Only transition to reforming when tree morphing is complete
                if (treeMorphState === 'idle' && landingPhase === 'tree') {
                    transitionToPhase(4, time);
                }
                break;
            case 4: // reforming
                duration = anim.reformDuration;
                progress = Math.min(elapsed / duration, 1.0);
                if (progress >= 1.0) {
                    setTextParticlePhase('dust');
                }
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

    // Don't render if phase is hidden
    // Note: Keep rendering in 'dust' phase to ensure smooth handoff to MagicDust
    if (textParticlePhase === 'hidden') {
        return null;
    }

    return (
        <points>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleData.count}
                    array={particleData.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aPositionText"
                    count={particleData.count}
                    array={particleData.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aPositionSpiral"
                    count={particleData.count}
                    array={particleData.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aSpiralT"
                    count={particleData.count}
                    array={particleData.spiralT}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aRandom"
                    count={particleData.count}
                    array={particleData.randoms}
                    itemSize={1}
                />
            </bufferGeometry>
            <shaderMaterial
                ref={materialRef}
                vertexShader={textParticleVertexShader}
                fragmentShader={textParticleFragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default TextParticles;
