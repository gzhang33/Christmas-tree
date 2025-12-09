import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const CinematicEffects: React.FC = () => {
    const isExploded = useStore((state) => state.isExploded);
    const hoveredPhotoId = useStore((state) => state.hoveredPhotoId);

    const chromaticRef = useRef<any>(null);

    // Animation for Chromatic Aberration
    useFrame((state, delta) => {
        if (chromaticRef.current) {
            const isHovered = !!hoveredPhotoId;
            // Target offset: 0.002 when exploded and not hovering, tiny otherwise
            const targetOffset = isExploded && !isHovered ? 0.002 : 0.0002;

            chromaticRef.current.offset.x = THREE.MathUtils.lerp(
                chromaticRef.current.offset.x, targetOffset, delta
            );
            chromaticRef.current.offset.y = THREE.MathUtils.lerp(
                chromaticRef.current.offset.y, targetOffset, delta
            );
        }
    });

    return (
        <EffectComposer multisampling={0}>
            {/* Primary Bloom - Higher threshold for sharper tree silhouette */}
            <Bloom
                luminanceThreshold={0.6}
                luminanceSmoothing={0.85}
                mipmapBlur
                intensity={0.4}
                radius={0.5}
            />

            {/* Secondary Bloom - Highlights for star/top particles only */}
            <Bloom
                luminanceThreshold={0.92}
                luminanceSmoothing={0.4}
                mipmapBlur
                intensity={0.35}
                radius={0.35}
            />

            {/* Cinematic Vignette */}
            <Vignette
                offset={0.35}
                darkness={0.65}
                blendFunction={BlendFunction.NORMAL}
            />

            {/* Dynamic Chromatic Aberration */}
            <ChromaticAberration
                ref={chromaticRef}
                offset={new THREE.Vector2(0.0002, 0.0002)}
                radialModulation={false}
                modulationOffset={0}
            />
        </EffectComposer>
    );
};
