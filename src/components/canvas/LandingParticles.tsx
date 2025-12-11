/**
 * Landing Particles Component
 * 
 * GPU-driven particle system for landing page transition.
 * 
 * Refactored: Text generation removed.
 * Animation Flow:
 * 1. Text is now HTML/CSS (LandingTitle.tsx).
 * 2. Morphing: Particles appear from random positions (Scatter) and converge to Tree.
 */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { useLandingFlow } from '../../contexts/LandingFlowContext';
import { PARTICLE_CONFIG } from '../../config/particles';
// Removed text generator imports
import { getTreeRadius } from '../../utils/treeUtils';

import landingVertexShader from '../../shaders/landing.vert?raw';
import landingFragmentShader from '../../shaders/landing.frag?raw';

interface LandingParticlesProps { }

/**
 * Generates tree particle positions (target positions)
 */
function generateTreePositions(count: number): Float32Array {
    const positions = new Float32Array(count * 3);
    const treeHeight = PARTICLE_CONFIG.treeHeight;
    const treeBottomY = PARTICLE_CONFIG.treeBottomY;

    for (let i = 0; i < count; i++) {
        const t = Math.pow(Math.random(), 1.8);
        const y = treeBottomY + t * treeHeight;
        const baseRadius = getTreeRadius(t);
        const layerNoise = Math.sin(y * 2.5) * 0.15;
        const coneR = baseRadius + layerNoise;
        const branchAngle = Math.random() * Math.PI * 2;
        const isSurface = Math.random() > 0.25;
        const distFromTrunk = isSurface ? 0.95 + Math.random() * 0.05 : Math.pow(Math.random(), 0.5);
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
 * Generates random dispersed positions for start
 */
function generateDispersedPositions(count: number): Float32Array {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        // Random cloud around the center, slightly higher
        const r = 15 + Math.random() * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.cos(phi) + 5; // Lifted slightly
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return positions;
}

const ANIMATION_CONFIG = {
    morphDuration: 3.5,
    dispersePhase: 0.2, // Short disperse phase to introduce particles
    maxScatter: 2.0,
};

function easeOutQuart(x: number): number {
    return 1 - Math.pow(1 - x, 4);
}
function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function createLandingShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        vertexShader: landingVertexShader,
        fragmentShader: landingFragmentShader,
        uniforms: {
            uTime: { value: 0.0 },
            uMix: { value: 0.0 },
            uScatter: { value: 0.0 },
            uTextCount: { value: 0.0 }, // kept to prevent shader errors, though unused
            uBaseSize: { value: 0.85 },
            uColorStart: { value: new THREE.Color('#FFD700') },
            uColorEnd: { value: new THREE.Color('#1a5f2a') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
    });
}

export const LandingParticles: React.FC<LandingParticlesProps> = () => {
    const { size } = useThree();
    const landingPhase = useStore((state) => state.landingPhase);
    const treeColor = useStore((state) => state.treeColor);
    const { onMorphingComplete } = useLandingFlow();

    const pointsRef = useRef<THREE.Points>(null);
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);

    const animationRef = useRef({
        startTime: 0,
        progress: 0,
        needsReset: false,
    });

    const morphingCompleteRef = useRef(false);

    // Simplification: No longer dependent on username/text length
    const particleData = useMemo(() => {
        const count = PARTICLE_CONFIG.minCounts.entity; // Constant count
        const treePositions = generateTreePositions(count);
        const startPositions = generateDispersedPositions(count); // New random starts

        const indices = new Float32Array(count);
        const randoms = new Float32Array(count);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            indices[i] = i;
            randoms[i] = Math.random();
            sizes[i] = 0.4 + Math.random() * 0.5;
        }

        return {
            startPositions,
            treePositions,
            indices,
            randoms,
            sizes,
            count
        };
    }, []);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(particleData.startPositions, 3));
        geo.setAttribute('aPositionStart', new THREE.BufferAttribute(particleData.startPositions, 3));
        geo.setAttribute('aPositionEnd', new THREE.BufferAttribute(particleData.treePositions, 3));
        geo.setAttribute('aTextIndex', new THREE.BufferAttribute(particleData.indices, 1));
        geo.setAttribute('aRandom', new THREE.BufferAttribute(particleData.randoms, 1));
        geo.setAttribute('aSize', new THREE.BufferAttribute(particleData.sizes, 1));
        return geo;
    }, [particleData]);

    useEffect(() => {
        return () => { geometry.dispose(); };
    }, [geometry]);

    const material = useMemo(() => createLandingShaderMaterial(), []);
    materialRef.current = material;

    useEffect(() => {
        if (materialRef.current) {
            materialRef.current.uniforms.uColorEnd.value = new THREE.Color(treeColor);
        }
    }, [treeColor]);

    useEffect(() => {
        return () => { materialRef.current?.dispose(); };
    }, []);

    useEffect(() => {
        animationRef.current.needsReset = true;
        animationRef.current.progress = 0;

        if (landingPhase === 'morphing') {
            morphingCompleteRef.current = false;
            // Visible immediately
            if (materialRef.current) {
                materialRef.current.visible = true;
                materialRef.current.uniforms.uMix.value = 0.0;
            }
        }
    }, [landingPhase]);

    useFrame((state) => {
        if (!materialRef.current || landingPhase !== 'morphing') return;

        const time = state.clock.elapsedTime;
        materialRef.current.uniforms.uTime.value = time;

        if (animationRef.current.needsReset) {
            animationRef.current.startTime = time;
            animationRef.current.needsReset = false;
        }

        const elapsed = time - animationRef.current.startTime;
        const totalProgress = Math.min(elapsed / ANIMATION_CONFIG.morphDuration, 1.0);

        // Simple converge: 0 -> 1
        // Optional: add a "Disperse" phase if we want them to explode first, but simple converge is likely cleaner given the new fade-in
        // Let's implement a quick disperse-then-converge to make it dynamic

        let currentMix = 0.0;
        let currentScatter = 0.0;

        // Start from high scatter (random cloud) -> Converge to tree
        // So uMix goes 0 -> 1.
        // And uScatter can add some noise during transit.

        const p = totalProgress;
        currentMix = easeInOutCubic(p); // 0 (start) -> 1 (tree)

        // Add a little turbulent scatter in the middle
        currentScatter = Math.sin(p * Math.PI) * ANIMATION_CONFIG.maxScatter * 0.5;

        materialRef.current.uniforms.uMix.value = currentMix;
        materialRef.current.uniforms.uScatter.value = currentScatter;

        if (totalProgress >= 1.0 && onMorphingComplete && !morphingCompleteRef.current) {
            morphingCompleteRef.current = true;
            onMorphingComplete();
        }
    });

    if (landingPhase !== 'morphing') return null;

    return (
        <points ref={pointsRef} geometry={geometry} material={materialRef.current}>
        </points>
    );
};

export default LandingParticles;
