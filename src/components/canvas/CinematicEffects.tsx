import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { POST_PROCESSING_CONFIG } from '../../config';

export const CinematicEffects: React.FC = () => {
    const isExploded = useStore((state) => state.isExploded);
    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId);

    const chromaticRef = useRef<any>(null);

    // Calculate initial offset to avoid jump on first load
    // 计算初始偏移值，避免首次加载时的跳动
    const initialOffset = useMemo(() => {
        const offset = isExploded && hoveredPhotoInstanceId === null
            ? POST_PROCESSING_CONFIG.chromaticAberration.exploded
            : POST_PROCESSING_CONFIG.chromaticAberration.normal;
        return new THREE.Vector2(offset, offset);
    }, [isExploded, hoveredPhotoInstanceId]);

    // Animation for Chromatic Aberration
    useFrame((state, delta) => {
        if (chromaticRef.current) {
            const isHovered = hoveredPhotoInstanceId !== null;
            // Target offset: exploded value when exploded and not hovering, normal otherwise
            const targetOffset = isExploded && !isHovered
                ? POST_PROCESSING_CONFIG.chromaticAberration.exploded
                : POST_PROCESSING_CONFIG.chromaticAberration.normal;

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

    return (
        <EffectComposer multisampling={composer.multisampling}>
            {/* Primary Bloom - Higher threshold for sharper tree silhouette */}
            <Bloom
                luminanceThreshold={bloom.primary.luminanceThreshold}
                luminanceSmoothing={bloom.primary.luminanceSmoothing}
                mipmapBlur={bloom.primary.mipmapBlur}
                intensity={bloom.primary.intensity}
                radius={bloom.primary.radius}
            />

            {/* Secondary Bloom - Highlights for star/top particles only */}
            <Bloom
                luminanceThreshold={bloom.secondary.luminanceThreshold}
                luminanceSmoothing={bloom.secondary.luminanceSmoothing}
                mipmapBlur={bloom.secondary.mipmapBlur}
                intensity={bloom.secondary.intensity}
                radius={bloom.secondary.radius}
            />

            {/* Cinematic Vignette */}
            <Vignette
                offset={vignette.offset}
                darkness={vignette.darkness}
                blendFunction={BlendFunction.NORMAL}
            />

            <ChromaticAberration
                ref={chromaticRef}
                offset={initialOffset}
                radialModulation={chromaticAberration.radialModulation}
                modulationOffset={chromaticAberration.modulationOffset}
            />
        </EffectComposer>
    );
};
