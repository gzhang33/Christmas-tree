import React, { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Experience } from '../canvas/Experience';
import { Snow } from '../canvas/Snow';
import { LandingParticles } from '../canvas/LandingParticles';
import { CinematicEffects } from '../canvas/CinematicEffects';
import { usePerformanceMonitor } from '../canvas/PerformanceMonitor';
import { UIState, AppConfig } from '../../types';
import { useStore } from '../../store/useStore';

interface SceneContainerProps {
    uiState: UIState;
    config: AppConfig;
    estimatedParticleCount: number;
    onPerformanceUpdate: (data: any) => void;
}

// Performance monitor wrapper component internal to SceneContainer
const PerformanceMonitorWrapper: React.FC<{
    particleCount: number;
    onUpdate: (data: any) => void;
}> = ({ particleCount, onUpdate }) => {
    const { TrackerComponent, updateData } = usePerformanceMonitor();

    useEffect(() => {
        onUpdate({ particleCount });
    }, [particleCount, onUpdate]);

    return <TrackerComponent onUpdate={(data) => { updateData(data); onUpdate(data); }} />;
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
                camera={{ position: [0, 5, 28], fov: 42 }}
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
            >
                {/* Snow - shown in all phases */}
                <Snow count={Math.floor(config.snowDensity)} speed={config.snowSpeed} wind={config.windStrength} />

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
