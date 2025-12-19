import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { POST_PROCESSING_CONFIG } from '../../config';
import { isMobileViewport, isMobileDevice } from '../../utils/responsiveUtils';

export const CinematicEffects: React.FC = () => {
    const isExploded = useStore((state) => state.isExploded);
    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId);

    const chromaticRef = useRef<any>(null);

    // Calculate initial offset ONCE on mount to avoid jump on first load
    // 只在挂载时计算一次初始偏移值，避免状态变化时重新创建 Vector2
    const initialOffset = useMemo(() => {
        // Start with normal chromatic aberration value
        // Always use normal value as initial - the useFrame will handle transitions
        const offset = POST_PROCESSING_CONFIG.chromaticAberration.normal;
        return new THREE.Vector2(offset, offset);
    }, []); // Empty deps - compute only once on mount

    // Animation for Chromatic Aberration
    useFrame((state, delta) => {
        if (chromaticRef.current) {
            const isHovered = hoveredPhotoInstanceId !== null;
            // 修复逻辑：聚焦时完全清晰（0色差），其他情况使用正常值
            const targetOffset = isExploded && isHovered
                ? 0.0  // 聚焦照片时：完全清晰，无色差
                : POST_PROCESSING_CONFIG.chromaticAberration.normal;  // 其他情况：正常色差

            // Frame-rate independent lerp factor
            const CHROMATIC_LERP_SPEED = 3.0; // Adjust to taste
            const t = Math.min(delta * CHROMATIC_LERP_SPEED, 1);

            chromaticRef.current.offset.x = THREE.MathUtils.lerp(
                chromaticRef.current.offset.x, targetOffset, t
            );
            chromaticRef.current.offset.y = THREE.MathUtils.lerp(
                chromaticRef.current.offset.y, targetOffset, t
            );
        }
    });

    const { bloom, vignette, chromaticAberration, composer } = POST_PROCESSING_CONFIG;
    const { viewport } = useThree();

    // Detection for mobile using standardized threshold
    // Fallback to isMobileDevice() when viewport is not yet initialized (width = 0)
    // This prevents conditional rendering flip-flop during initial mount
    const isMobile = viewport.width > 0
        ? isMobileViewport(viewport.width)
        : isMobileDevice();

    // Dynamic bloom intensity reduction during explosion peak (mobile only)
    const treeMorphState = useStore((state) => state.treeMorphState);
    const treeProgress = useStore((state) => state.treeProgress);

    // CRITICAL FIX: Instead of unmounting EffectComposer, we only disable heavy passes.
    // This prevents the "black screen" flash caused by GPU re-initializing the composer.
    const isExplosionPeak = isMobile && isExploded && treeMorphState === 'morphing-out' && treeProgress < 0.7;

    // Use a ref to smoothly transition intensity to avoid desktop frame drops from sudden multiplier changes
    const intensityFactorRef = useRef(1.0);
    useFrame((_, delta) => {
        const target = isExplosionPeak ? 0.0 : 1.0;
        intensityFactorRef.current = THREE.MathUtils.lerp(intensityFactorRef.current, target, Math.min(delta * 10, 1));
    });

    const bloomIntensityMultiplier = isMobile ? 0.8 : 1.0;

    return (
        <EffectComposer multisampling={isMobile ? 0 : composer.multisampling}>
            {/* Primary Bloom - Dynamically zeroed during explosion peak on mobile */}
            <Bloom
                luminanceThreshold={bloom.primary.luminanceThreshold}
                luminanceSmoothing={bloom.primary.luminanceSmoothing}
                mipmapBlur={bloom.primary.mipmapBlur}
                intensity={bloom.primary.intensity * bloomIntensityMultiplier * intensityFactorRef.current}
                radius={bloom.primary.radius}
            />

            {/* Secondary Bloom - Disabled on mobile to save a full render pass */}
            {!isMobile && (
                <Bloom
                    luminanceThreshold={bloom.secondary.luminanceThreshold}
                    luminanceSmoothing={bloom.secondary.luminanceSmoothing}
                    mipmapBlur={bloom.secondary.mipmapBlur}
                    intensity={bloom.secondary.intensity * intensityFactorRef.current}
                    radius={bloom.secondary.radius}
                />
            )}

            {/* Cinematic Vignette - Low cost, keep on both */}
            <Vignette
                offset={vignette.offset}
                darkness={vignette.darkness}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* Chromatic Aberration - Disabled on mobile as it's a per-pixel distortion */}
            {!isMobile && (
                <ChromaticAberration
                    ref={chromaticRef}
                    offset={initialOffset}
                    radialModulation={chromaticAberration.radialModulation}
                    modulationOffset={chromaticAberration.modulationOffset}
                />
            )}
        </EffectComposer>
    );
};
