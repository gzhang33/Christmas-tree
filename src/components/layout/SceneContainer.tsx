import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
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
import { GiftBoxes } from '../canvas/GiftBoxes';


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
 * FrameloopController
 * 
 * Drives the render loop when frameloop="demand".
 * Continuously calls invalidate() to request new frames,
 * but stops when isAppInBackground=true to release GPU resources.
 * 
 * When returning from background, useFrame won't run (no frames requested),
 * so we use a useEffect to call invalidate() once to kickstart the loop.
 */
const FrameloopController: React.FC = () => {
    const isAppInBackgroundStore = useStore((state) => state.isAppInBackground);
    const { invalidate } = useThree();

    // Combined foreground check: Use global flag for immediate response + store for React reactivity
    const isActuallyHidden = () => {
        return (typeof window !== 'undefined' && window.__IS_BACKGROUND__) || isAppInBackgroundStore;
    };

    // Kickstart frameloop when returning from background
    useEffect(() => {
        if (!isActuallyHidden()) {
            invalidate();
        }
    }, [isAppInBackgroundStore, invalidate]);

    useFrame(() => {
        // Only request next frame if app is in foreground
        if (!isActuallyHidden()) {
            invalidate();
        }
    });

    return null;
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
                    dpr={isMobile ? 1 : [1, 1.5]} // Performance: Lock to 1.0 on mobile to avoid rendering excessive pixels on high-DPI screens
                    frameloop="demand" // Render on-demand; FrameloopController calls invalidate() every frame unless in background
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
                        const {
                            setActivePhoto,
                            setHoveredPhoto,
                            setPlayingVideoInHover,
                            isExploded,
                            isResetLocked,
                            resetExplosion
                        } = useStore.getState();

                        // Global Double-tap detection: Uses shared timestamp with TreeParticles
                        // Allows double-taps where first tap lands on particles and second on background
                        const now = Date.now();
                        const lastClick = (window as any)._lastGlobalClick || 0;

                        // Increased threshold for iOS compatibility (300ms touch delay + margin)
                        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                        const doubleTapThreshold = isTouch ? 600 : 400;

                        (window as any)._lastGlobalClick = now;

                        if (now - lastClick < doubleTapThreshold) {
                            // Only reset if exploded AND not already resetting (prevents jank)
                            if (isExploded && !isResetLocked) {
                                if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[SceneContainer] Background double-tap detected - Restoring tree');
                                resetExplosion();
                            }
                        }

                        setActivePhoto(null);
                        setHoveredPhoto(null);
                        setPlayingVideoInHover(null);
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
                        PRE-LOADED from input phase (hidden) to eliminate black screen transition.
                        Handles text intro → dispersion → dust loop as seamless animation. */}
                    {(landingPhase === 'input' || landingPhase === 'entrance' || landingPhase === 'text' || landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <React.Suspense fallback={null}>
                            <UniversalParticleSystemComponent
                                title={responsiveTitle}
                                username={userName || 'Friend'}
                            />
                        </React.Suspense>
                    )}

                    {/* Persistent Environment Elements (Floor + GiftBoxes) - Pre-loaded from input phase */}
                    {/* Rendered from input onwards to ensure all resources are loaded immediately */}
                    {/* GiftBoxes visible at 100% from start, Floor animates opacity */}
                    {(landingPhase === 'input' || landingPhase === 'entrance' || landingPhase === 'text' || landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <>
                            <Floor />
                            {/* Layered accumulated snow on top of the reflective floor */}
                            <SnowFloor count={3000} opacity={0.3} />
                            {/* Gift Boxes - GLB models loaded and displayed immediately */}
                            <GiftBoxes />
                        </>
                    )}

                    {/* Tree Experience - Grouped in Suspense for synchronized loading */}
                    {(landingPhase === 'text' || landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <React.Suspense fallback={null}>
                            <Experience
                                uiState={uiState}
                                visible={landingPhase === 'tree' || landingPhase === 'morphing'}
                            />
                            {/* Shader Warmup - MUST be inside Suspense, after shader-using components */}
                            <ShaderWarmup />
                        </React.Suspense>
                    )}

                    {/* 3D Scattered Text - Pre-mounted from text phase for font warmup
                        Mobile Optimization: Font glyphs are loaded and GPU-uploaded during text phase (opacity:0)
                        so they're ready when morphing triggers, preventing jank during title→dust transition */}
                    {(landingPhase === 'text' || landingPhase === 'morphing' || landingPhase === 'tree') && (
                        <ScatterText3D />
                    )}

                    {/* Performance Tracker */}
                    <PerformanceMonitorWrapper
                        particleCount={estimatedParticleCount}
                        onUpdate={onPerformanceUpdate}
                    />

                    {/* Frameloop Controller - Drives render loop, pauses in background */}
                    <FrameloopController />

                    {/* Consolidated Post-Processing Effects */}
                    <CinematicEffects />
                </Canvas>
            </ErrorBoundary>
        </div>
    );
});
