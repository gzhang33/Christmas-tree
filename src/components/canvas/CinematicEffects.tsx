import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { POST_PROCESSING_CONFIG } from '../../config';

export const CinematicEffects: React.FC = () => {
    const isExploded = useStore((state) => state.isExploded);
    const hoveredPhotoId = useStore((state) => state.hoveredPhotoId);

    const chromaticRef = useRef<any>(null);

    // Animation for Chromatic Aberration
    useFrame((state, delta) => {
        if (chromaticRef.current) {
            const isHovered = !!hoveredPhotoId;
            // Target offset: exploded value when exploded and not hovering, normal otherwise
            const targetOffset = isExploded && !isHovered
                ? POST_PROCESSING_CONFIG.chromaticAberration.exploded
                : POST_PROCESSING_CONFIG.chromaticAberration.normal;

            chromaticRef.current.offset.x = THREE.MathUtils.lerp(
                chromaticRef.current.offset.x, targetOffset, delta
            );
            chromaticRef.current.offset.y = THREE.MathUtils.lerp(
                chromaticRef.current.offset.y, targetOffset, delta
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

            {/* Dynamic Chromatic Aberration */}
            <ChromaticAberration
                ref={chromaticRef}
                offset={new THREE.Vector2(
                    chromaticAberration.offset.x,
                    chromaticAberration.offset.y
                )}
                radialModulation={chromaticAberration.radialModulation}
                modulationOffset={chromaticAberration.modulationOffset}
            />
        </EffectComposer>
    );
};
