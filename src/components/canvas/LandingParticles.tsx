/**
 * Landing Particles Component
 * 
 * GPU-driven 2-stage morphing particle system for landing page.
 * 
 * Animation Flow:
 * 1. Entrance: Particles fall from above to form text
 * 2. Text Display: Static text with subtle breathing
 * 3. Morphing (2-stage):
 *    - Stage 1: Disperse - Title/Username particles scatter like sand blown by wind
 *    - Stage 2: Converge - ALL particles flow toward pre-marked tree positions
 * 
 * Key: Tree shape is NOT pre-rendered; it emerges from particle convergence.
 */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useLandingFlow } from '../../contexts/LandingFlowContext';
import { PARTICLE_CONFIG } from '../../config/particles';
import { LANDING_CONFIG } from '../../config/landing';
import {
    generateMultiLineTextParticles,
    padParticlePositions,
} from '../../utils/textParticleGenerator';
import { getTreeRadius } from '../../utils/treeUtils';

import landingVertexShader from '../../shaders/landing.vert?raw';
import landingFragmentShader from '../../shaders/landing.frag?raw';

interface LandingParticlesProps { }

/**
 * Generates tree particle positions (pre-marked target positions)
 * These are used as convergence targets, NOT for initial display
 */
function generateTreePositions(count: number): Float32Array {
    const positions = new Float32Array(count * 3);
    const treeHeight = PARTICLE_CONFIG.treeHeight;
    const treeBottomY = PARTICLE_CONFIG.treeBottomY;

    for (let i = 0; i < count; i++) {
        // Vertical distribution - bias towards bottom
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
        const distFromTrunk = isSurface
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
 * Animation timeline configuration
 * Strict 2-stage: Disperse -> Converge
 */
const ANIMATION_CONFIG = {
    // Entrance animation
    entranceDuration: 1.5,

    // Morphing: 2-stage (Disperse + Converge)
    morphDuration: 4.0,        // Total duration
    dispersePhase: 0.4,        // 0-40%: Disperse (particles scatter)
    convergePhase: 0.6,        // 40-100%: Converge (particles form tree)

    // Visual parameters
    maxScatter: 3.0,           // Maximum scatter intensity
};

/**
 * Easing functions
 */
function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
}

function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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
            uMix: { value: 0.0 },          // 0 = dispersed, 1 = converged to tree
            uScatter: { value: 0.0 },      // Scatter intensity
            uTextCount: { value: 0.0 },
            uBaseSize: { value: 0.55 },
            uColorStart: { value: new THREE.Color('#FFD700') },  // Gold
            uColorEnd: { value: new THREE.Color('#1a5f2a') },    // Forest green
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
    });
}

export const LandingParticles: React.FC<LandingParticlesProps> = () => {
    const { viewport, size } = useThree();
    const userNameRaw = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);
    const treeColor = useStore((state) => state.treeColor);

    const { onEntranceComplete, onMorphingComplete } = useLandingFlow();

    // Capitalize first letter of username
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : userNameRaw;

    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);

    // Animation state refs
    const animationRef = useRef({
        startTime: 0,
        progress: 0,
        needsReset: false, // Flag to reset startTime on next frame
    });

    // Callback guards
    const entranceCompleteRef = useRef(false);
    const morphingCompleteRef = useRef(false);

    // Generate particle data with fixed buffer allocation
    const particleData = useMemo(() => {
        // Generate text particles
        const lines = ['Merry', 'Christmas'];
        if (userName) {
            lines.push(userName);
        }

        // Responsive parameters (use pixel width, not Three.js world units)
        const isCompact = size.width < 768;
        const particleConfig = LANDING_CONFIG.title.particleGeneration;

        const fontSize = isCompact
            ? particleConfig.fontSize.compact
            : particleConfig.fontSize.normal;

        const worldWidth = isCompact
            ? particleConfig.worldWidth.compact
            : particleConfig.worldWidth.normal;

        // Resolve responsive density value
        const density = typeof particleConfig.density === 'object'
            ? (isCompact ? particleConfig.density.compact : particleConfig.density.normal)
            : particleConfig.density;

        const textResult = generateMultiLineTextParticles(lines, {
            fontSize,
            density,
            worldWidth,
            zOffset: particleConfig.zOffset,
            yOffset: particleConfig.yOffset,
        });

        // Fixed Buffer Allocation: max(text, tree)
        const treeParticleCount = PARTICLE_CONFIG.minCounts.entity;
        const maxCount = Math.max(textResult.count, treeParticleCount);

        // Pad text positions to match max count
        const textPositions = padParticlePositions(textResult, maxCount);

        // Generate tree positions (target positions for convergence)
        const treePositions = generateTreePositions(maxCount);

        // Generate particle indices
        const indices = new Float32Array(maxCount);
        for (let i = 0; i < maxCount; i++) {
            indices[i] = i;
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

        return {
            textPositions,
            treePositions,
            indices,
            randoms,
            sizes,
            count: maxCount,
            textCount: textResult.count,
        };
    }, [userName, size.width]);

    // Create geometry
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();

        // Position attribute (default to text positions)
        geo.setAttribute('position', new THREE.BufferAttribute(particleData.textPositions, 3));

        // Custom attributes for morphing
        geo.setAttribute('aPositionStart', new THREE.BufferAttribute(particleData.textPositions, 3));
        geo.setAttribute('aPositionEnd', new THREE.BufferAttribute(particleData.treePositions, 3));
        geo.setAttribute('aTextIndex', new THREE.BufferAttribute(particleData.indices, 1));
        geo.setAttribute('aRandom', new THREE.BufferAttribute(particleData.randoms, 1));
        geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));

        return geo;
    }, [particleData]);

    // Cleanup geometry
    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    // Create material synchronously
    const material = useMemo(() => createLandingShaderMaterial(), []);
    materialRef.current = material;

    // Update uniforms when data changes
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTextCount.value = particleData.textCount;
        }
    }, [particleData.textCount]);

    // Update color when treeColor changes
    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uColorEnd.value = new THREE.Color(treeColor);
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
        // Mark that we need to reset startTime on next frame using Three.js clock
        animationRef.current.needsReset = true;
        animationRef.current.progress = 0;

        // Reset callback guards and uniforms
        if (landingPhase === 'entrance') {
            entranceCompleteRef.current = false;
            if (materialRef.current) {
                materialRef.current.uniforms.uMix.value = 0.0;
                materialRef.current.uniforms.uScatter.value = 0.0;
            }
        } else if (landingPhase === 'morphing') {
            morphingCompleteRef.current = false;
            // Start from stable text state (no scatter, no mix)
            if (materialRef.current) {
                materialRef.current.uniforms.uMix.value = 0.0;
                materialRef.current.uniforms.uScatter.value = 0.0;
            }
        } else if (landingPhase === 'tree') {
            // Final state: fully converged to tree
            if (materialRef.current) {
                materialRef.current.uniforms.uMix.value = 1.0;
                materialRef.current.uniforms.uScatter.value = 0.0;
            }
        }
    }, [landingPhase]);

    // Animation loop
    useFrame((state) => {
        if (!materialRef.current) return;

        const time = state.clock.elapsedTime;
        materialRef.current.uniforms.uTime.value = time;

        // Reset startTime using Three.js clock when phase changes
        if (animationRef.current.needsReset) {
            animationRef.current.startTime = time;
            animationRef.current.needsReset = false;
        }

        const elapsed = time - animationRef.current.startTime;

        if (landingPhase === 'entrance') {
            // Entrance: particles converge to form text
            const progress = Math.min(elapsed / ANIMATION_CONFIG.entranceDuration, 1.0);

            // Start with some scatter, converge to 0
            const entranceScatter = (1.0 - easeOutCubic(progress)) * 1.5;
            materialRef.current.uniforms.uScatter.value = entranceScatter;
            materialRef.current.uniforms.uMix.value = 0.0;

            if (progress >= 1.0 && onEntranceComplete && !entranceCompleteRef.current) {
                entranceCompleteRef.current = true;
                onEntranceComplete();
            }
        } else if (landingPhase === 'text') {
            // Text phase: stable display with subtle breathing
            materialRef.current.uniforms.uMix.value = 0.0;
            materialRef.current.uniforms.uScatter.value = 0.0;
        } else if (landingPhase === 'morphing') {
            // =====================================================
            // STRICT 2-STAGE MORPHING ANIMATION
            // =====================================================
            // Stage 1: Disperse (0% -> 40%)
            //   - Title/Username particles scatter like sand blown by wind
            //   - Uses Curl Noise for soft, flowing movement
            //   - uScatter increases, uMix stays at 0
            //
            // Stage 2: Converge (40% -> 100%)
            //   - ALL particles flow toward pre-marked tree positions
            //   - Tree emerges naturally from convergence
            //   - uScatter decreases, uMix increases to 1
            // =====================================================

            const totalProgress = Math.min(elapsed / ANIMATION_CONFIG.morphDuration, 1.0);
            animationRef.current.progress = totalProgress;

            const disperseEnd = ANIMATION_CONFIG.dispersePhase;

            let currentScatter = 0.0;
            let currentMix = 0.0;

            if (totalProgress < disperseEnd) {
                // === STAGE 1: DISPERSE ===
                // Particles scatter outward like wind-blown sand
                const p = totalProgress / disperseEnd;
                // Scatter ramps up with easing
                currentScatter = easeOutCubic(p) * ANIMATION_CONFIG.maxScatter;
                // Mix stays at 0 (particles still at text positions, just scattered)
                currentMix = 0.0;
            } else {
                // === STAGE 2: CONVERGE ===
                // All particles flow to pre-marked tree target positions
                const p = (totalProgress - disperseEnd) / (1.0 - disperseEnd);
                // Scatter decreases smoothly
                currentScatter = ANIMATION_CONFIG.maxScatter * (1.0 - easeOutQuart(p));
                // Mix increases: particles interpolate from scattered to tree positions
                currentMix = easeInOutCubic(p);
            }

            materialRef.current.uniforms.uScatter.value = currentScatter;
            materialRef.current.uniforms.uMix.value = currentMix;

            // Trigger callback when complete
            if (totalProgress >= 1.0 && onMorphingComplete && !morphingCompleteRef.current) {
                morphingCompleteRef.current = true;
                onMorphingComplete();
            }
        }
    });

    // Only render during morphing phase (SceneContainer controls mounting)
    // Return null otherwise as safety check
    // 只有 tree 阶段由其他组件接管
    if (landingPhase === 'tree') {
        return null;
    }

    return (
        <points ref={pointsRef} geometry={geometry} material={materialRef.current}>
            {/* Points rendered via geometry + material */}
        </points>
    );
};

export default LandingParticles;
