import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from '../canvas/Experience';
import { Snow } from '../canvas/Snow';
import { LandingParticles } from '../canvas/LandingParticles';
import { CinematicEffects } from '../canvas/CinematicEffects';
import { usePerformanceMonitor, PerformanceData } from '../canvas/PerformanceMonitor';
import { UIState, AppConfig } from '../../types';
import { useStore } from '../../store/useStore';
import { CAMERA_CONFIG, getResponsiveValue } from '../../config';

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

export const SceneContainer: React.FC<SceneContainerProps> = React.memo(({
    uiState,
    config,
    estimatedParticleCount,
    onPerformanceUpdate
}) => {
    const landingPhase = useStore((state) => state.landingPhase);

    return (
        <div className="absolute inset-0 z-0">
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
                    // Clear hover preview when clicking outside any object
                    const setHoveredPhoto = useStore.getState().setHoveredPhoto;
                    setHoveredPhoto(null);
                }}
            >
                {/* Snow - shown in all phases */}
                <Snow
                    count={Math.max(0, Math.floor(config.snowDensity || 0))}
                    speed={config.snowSpeed}
                    wind={config.windStrength}
                />

                {/* Landing Particles - handles Morphing phase (3D GPU particles) */}
                {landingPhase === 'morphing' && <LandingParticles />}

                {/* Tree Experience - shown only in tree phase (after morphing completes) */}
                {landingPhase === 'tree' && <Experience uiState={uiState} />}

                {/* Performance Tracker */}
                <PerformanceMonitorWrapper
                    particleCount={estimatedParticleCount}
                    onUpdate={onPerformanceUpdate}
                />

                {/* Consolidated Post-Processing Effects */}
                <CinematicEffects />
            </Canvas>
        </div>
    );
});
