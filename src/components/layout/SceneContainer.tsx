import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from '../canvas/Experience';
import { Snow } from '../canvas/Snow';
import { CinematicEffects } from '../canvas/CinematicEffects';
import { Floor } from '../canvas/Floor';
import { SnowFloor } from '../canvas/SnowFloor';
import { ShaderWarmup } from '../canvas/ShaderWarmup';
import { UniversalParticleSystemComponent } from '../canvas/UniversalParticleSystem';
import { ScatterText3D } from '../canvas/ScatterText3D';
import { PARTICLE_CONFIG } from '../../config/particles';
import { LANDING_CONFIG } from '../../config/landing';
import { usePerformanceMonitor, PerformanceData } from '../canvas/PerformanceMonitor';
import { UIState, AppConfig } from '../../types';
import { useStore } from '../../store/useStore';
import { CAMERA_CONFIG, SCENE_CONFIG } from '../../config';
import { getResponsiveValue } from '../../utils/responsiveUtils';
import { useFrame } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import { ErrorBoundary } from '../utils/ErrorBoundary';


interface SceneContainerProps {
    uiState: UIState;
    config: AppConfig;
    estimatedParticleCount: number;
    onPerformanceUpdate: (data: Partial<PerformanceData>) => void;
}

// Performance monitor wrapper component internal to SceneContainer
const PerformanceMonitorWrapper: React.FC<{
    particleCount: number;
    onUpdate: (data: Partial<PerformanceData>) => void;
}> = ({ particleCount, onUpdate }) => {
    const { TrackerComponent, updateData } = usePerformanceMonitor();

    // Store the latest onUpdate callback in a ref to avoid re-running the effect
    // when the parent recreates the callback function
    const onUpdateRef = useRef(onUpdate);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    // Only depend on particleCount, use the ref for the callback
    useEffect(() => {
        onUpdateRef.current({ particleCount });
    }, [particleCount]);

    return <TrackerComponent onUpdate={(data) => {
        updateData(data);
        onUpdateRef.current({ ...data, particleCount });
    }} />;
};

/**
 * Handles consistent lighting and environment across all phases
 */
const SceneEnvironment: React.FC = () => {
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const mainSpotRef = useRef<THREE.SpotLight>(null);
    const fillSpotRef = useRef<THREE.SpotLight>(null);

    const hoveredPhotoInstanceId = useStore((state) => state.hoveredPhotoInstanceId);

    // Light dimming effect on hover
    useFrame((state, delta) => {
        const isHovered = hoveredPhotoInstanceId !== null;
        const targetFactor = isHovered
            ? SCENE_CONFIG.lighting.dimming.targetFactorHovered
            : SCENE_CONFIG.lighting.dimming.targetFactorNormal;

        const lerpSpeed = SCENE_CONFIG.lighting.dimming.lerpSpeed * delta;

        if (ambientRef.current) {
            ambientRef.current.intensity = THREE.MathUtils.lerp(
                ambientRef.current.intensity, SCENE_CONFIG.lighting.ambient.intensity * targetFactor, lerpSpeed
            );
        }
        if (mainSpotRef.current) {
            mainSpotRef.current.intensity = THREE.MathUtils.lerp(
                mainSpotRef.current.intensity, SCENE_CONFIG.lighting.mainSpot.intensity * targetFactor, lerpSpeed
            );
        }
        if (fillSpotRef.current) {
            fillSpotRef.current.intensity = THREE.MathUtils.lerp(
                fillSpotRef.current.intensity, SCENE_CONFIG.lighting.fillSpot.intensity * targetFactor, lerpSpeed
            );
        }
    });

    return (
        <>
            {/* Environment & Stars */}
            <Environment preset={SCENE_CONFIG.environment.preset} />
            <Stars
                radius={SCENE_CONFIG.environment.stars.radius}
                depth={SCENE_CONFIG.environment.stars.depth}
                count={SCENE_CONFIG.environment.stars.count}
                factor={SCENE_CONFIG.environment.stars.factor}
                saturation={SCENE_CONFIG.environment.stars.saturation}
                fade={SCENE_CONFIG.environment.stars.fade}
                speed={SCENE_CONFIG.environment.stars.speed}
            />

            {/* Lights */}
            <ambientLight
                ref={ambientRef}
                intensity={SCENE_CONFIG.lighting.ambient.intensity}
                color={SCENE_CONFIG.lighting.ambient.color}
            />
            <spotLight
                ref={mainSpotRef}
                position={SCENE_CONFIG.lighting.mainSpot.position}
                intensity={SCENE_CONFIG.lighting.mainSpot.intensity}
                color={SCENE_CONFIG.lighting.mainSpot.color}
                angle={SCENE_CONFIG.lighting.mainSpot.angle}
                penumbra={SCENE_CONFIG.lighting.mainSpot.penumbra}
                decay={SCENE_CONFIG.lighting.mainSpot.decay}
                distance={SCENE_CONFIG.lighting.mainSpot.distance}
                castShadow={false}
            />
            <spotLight
                ref={fillSpotRef}
                position={SCENE_CONFIG.lighting.fillSpot.position}
                intensity={SCENE_CONFIG.lighting.fillSpot.intensity}
                color={SCENE_CONFIG.lighting.fillSpot.color}
                angle={SCENE_CONFIG.lighting.fillSpot.angle}
                penumbra={SCENE_CONFIG.lighting.fillSpot.penumbra}
                decay={SCENE_CONFIG.lighting.fillSpot.decay}
                distance={SCENE_CONFIG.lighting.fillSpot.distance}
            />
        </>
    );
};

export const SceneContainer: React.FC<SceneContainerProps> = React.memo(({
    uiState,
    config,
    estimatedParticleCount,
    onPerformanceUpdate
}) => {
    const landingPhase = useStore((state) => state.landingPhase);
    const userName = useStore((state) => state.userName);

    // Responsive title detection based on breakpoint
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < LANDING_CONFIG.title.breakpoints.mobile
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < LANDING_CONFIG.title.breakpoints.mobile);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Responsive title: array for mobile (two lines), string for desktop (single line)
    const responsiveTitle = isMobile
        ? LANDING_CONFIG.textParticle.text.compact
        : LANDING_CONFIG.textParticle.text.normal;

    return (
        <div className="absolute inset-0 z-40">
            <ErrorBoundary name="SceneCanvas">
                <Canvas
                    camera={{
                        position: getResponsiveValue(CAMERA_CONFIG.default.position) as [number, number, number],
                        fov: CAMERA_CONFIG.default.fov
                    }}
                    dpr={[1, 1.5]} // Performance: Cap pixel ratio to 1.5 for high-DPI screens
                    gl={{
                        antialias: false, // Performance: Disable MSAA if not critical (Bloom smooths edges)
                        toneMappingExposure: 1.08,
                        alpha: false,
                        powerPreference: 'high-performance',
                        stencil: false,
                        depth: true
                    }}
                    onCreated={({ scene }) => {
                        scene.background = new THREE.Color('#030002');
                    }}
                    onPointerMissed={() => {
                        // Clear active photo and hover preview when clicking outside any object
                        const { setActivePhoto, setHoveredPhoto } = useStore.getState();
                        setActivePhoto(null);
                        setHoveredPhoto(null);
                    }}
                >
                    {/* Global Environment & Lighting - Persistent across phases */}
                    <SceneEnvironment />

                    {/* Snow - shown in all phases */}
                    <Snow
                        count={Math.max(0, Math.floor(config.snowDensity || 0))}
                        speed={config.snowSpeed}
                        wind={config.windStrength}
                    />

                    {/* Universal Particle System - Permanent background element
                        Mounts at entrance phase and never unmounts.
                        Handles text intro → dispersion → dust loop as seamless animation. */}
                    {(landingPhase === 'entrance' || landingPhase === 'text' || landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <React.Suspense fallback={null}>
                            <UniversalParticleSystemComponent
                                title={responsiveTitle}
                                username={userName || 'Friend'}
                            />
                        </React.Suspense>
                    )}

                    {/* Persistent Environment Elements (Floor) - Visible in both phases to prevent pop */}
                    {/* Floor */}
                    {(landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <>
                            <Floor />
                            {/* Layered accumulated snow on top of the reflective floor */}
                            <SnowFloor count={3000} opacity={0.3} />
                        </>
                    )}

                    {/* Tree Experience - Grouped in Suspense for synchronized loading */}
                    {(landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <React.Suspense fallback={null}>
                            <Experience
                                uiState={uiState}
                                visible={landingPhase === 'tree' || landingPhase === 'morphing'}
                            />
                            {/* Shader Warmup - MUST be inside Suspense, after shader-using components */}
                            <ShaderWarmup />
                        </React.Suspense>
                    )}

                    {/* 3D Scattered Text - shown after tree explosion */}
                    {landingPhase === 'tree' && (
                        <ScatterText3D />
                    )}

                    {/* Performance Tracker */}
                    <PerformanceMonitorWrapper
                        particleCount={estimatedParticleCount}
                        onUpdate={onPerformanceUpdate}
                    />

                    {/* Consolidated Post-Processing Effects */}
                    <CinematicEffects />
                </Canvas>
            </ErrorBoundary>
        </div>
    );
});
