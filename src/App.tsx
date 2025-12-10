import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Controls } from './components/ui/Controls.tsx';
import { DebugStore } from './components/ui/DebugStore.tsx';
import { LandingFlowController } from './components/ui/LandingFlowController.tsx';
import { LandingTitle } from './components/ui/LandingTitle.tsx';
import { BackgroundMusicPlayer } from './components/ui/BackgroundMusicPlayer.tsx';
import { AppConfig, PhotoData, UIState } from './types.ts';
import { PerformanceOverlay } from './components/canvas/PerformanceMonitor.tsx';
import { useStore } from './store/useStore.ts';
import { LandingFlowProvider } from './contexts/LandingFlowContext.tsx';
import { SceneContainer } from './components/layout/SceneContainer';
import { useShareSystem } from './hooks/useShareSystem';
import './index.css';

// === POST-PROCESSING PIPELINE (Per Specification) ===
// 1. HDR color conversion (handled by Three.js tone mapping)
// 2. Dual-layer Bloom (main threshold 0.4 / highlight threshold 0.85)
// 3. Screen-space volumetric light (simulated via bloom)
// 4. Dynamic exposure adjustment (tone mapping exposure)
// 5. Cinematic vignette

function App() {
  // Global State from Zustand Store
  const particleCount = useStore((state) => state.particleCount);
  const isExploded = useStore((state) => state.isExploded);
  const triggerExplosion = useStore((state) => state.triggerExplosion);
  const resetExplosion = useStore((state) => state.resetExplosion);
  const landingPhase = useStore((state) => state.landingPhase);
  const hoveredPhotoId = useStore((state) => state.hoveredPhotoId);

  // Local State (not in global store)
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [showPerformance, setShowPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    particleCount: 0,
    lodLevel: 'High',
    memoryUsage: 0,
  });
  const [isHeroTextCompact, setIsHeroTextCompact] = useState(false);

  // Local config (non-persisted settings)
  const [config, setConfig] = useState<AppConfig>({
    snowDensity: 1500,
    rotationSpeed: 0.6,
    photoSize: 1.5,
    explosionRadius: 30,
    snowSpeed: 1.2,
    windStrength: 0.4,
  });

  // Audio State (simplified - managed by BackgroundMusicPlayer)
  const [isMuted, setIsMuted] = useState(false);
  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);
  const unmute = useCallback(async () => {
    setIsMuted(false);
  }, []);

  // Share System Hook
  const { generateShareUrl } = useShareSystem({
    photos,
    config,
    setPhotos,
    setConfig
  });

  // Estimate total particles
  const estimatedParticleCount = useMemo(() => Math.floor(
    particleCount * 1.5 + // Tree particles (entity + glow)
    3000 + // Ornaments
    5500 + // Gifts
    config.snowDensity + // Snow
    1200 // Magic dust
  ), [particleCount, config.snowDensity]);

  useEffect(() => {
    const handleResize = () => {
      setIsHeroTextCompact(window.innerWidth < 900);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut for performance panel (` key or F3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === 'F3') {
        e.preventDefault();
        setShowPerformance((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const updateConfig = useCallback((key: keyof AppConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleExplosion = useCallback(() => {
    if (isExploded) {
      resetExplosion();
    } else {
      triggerExplosion();
    }
  }, [isExploded, triggerExplosion, resetExplosion]);

  const addPhotos = useCallback((input: FileList | string[]) => {
    let newPhotos: PhotoData[] = [];

    if (input instanceof FileList) {
      newPhotos = Array.from(input).map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        url: URL.createObjectURL(file), // Local preview
      }));
    } else if (Array.isArray(input)) {
      // Handle direct URL strings (e.g. from Cloudinary)
      newPhotos = input.map((url) => ({
        id: Math.random().toString(36).substring(2, 9),
        url: url,
      }));
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
  }, []);

  // Track current photos in a ref for cleanup on unmount
  const photosRef = useRef<PhotoData[]>(photos);
  photosRef.current = photos;

  // Cleanup ObjectURLs when photos are removed
  const prevPhotosRef = useRef<PhotoData[]>([]);
  useEffect(() => {
    const prevPhotos = prevPhotosRef.current;
    const currentPhotoIds = new Set(photos.map((p) => p.id));

    // Revoke URLs for photos that were removed
    prevPhotos.forEach((photo) => {
      if (!currentPhotoIds.has(photo.id)) {
        URL.revokeObjectURL(photo.url);
      }
    });

    // Update ref for next comparison (create a shallow copy)
    prevPhotosRef.current = [...photos];
  }, [photos]);

  // Cleanup all ObjectURLs on component unmount
  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        URL.revokeObjectURL(photo.url);
      });
    };
  }, []);

  const handlePerformanceUpdate = useCallback((data: any) => {
    setPerformanceData((prev) => ({ ...prev, ...data, particleCount: estimatedParticleCount }));
  }, [estimatedParticleCount]);

  // Optimized UI State
  const uiState: UIState = useMemo(() => ({
    isExploded,
    toggleExplosion,
    photos,
    addPhotos,
    config,
    updateConfig,
    isMuted,
    toggleMute,
    generateShareUrl,
  }), [
    isExploded,
    toggleExplosion,
    photos,
    addPhotos,
    config,
    updateConfig,
    isMuted,
    toggleMute,
    generateShareUrl
  ]);

  return (
    <LandingFlowProvider>
      <div className="w-full h-screen relative bg-black overflow-hidden">
        {/* 3D Canvas Scene */}
        <SceneContainer
          uiState={uiState}
          config={config}
          estimatedParticleCount={estimatedParticleCount}
          onPerformanceUpdate={handlePerformanceUpdate}
        />

        {/* UI Overlay - only shown in tree phase */}
        {landingPhase === 'tree' && <Controls uiState={uiState} />}

        {/* Debug Store Panel (F4 to toggle) */}
        <DebugStore performanceData={performanceData} />

        {/* Landing Flow Controller - handles name input, click prompts */}
        <LandingFlowController
          onPhaseChange={(phase) => console.log('[LandingFlow] Phase:', phase)}
          onAudioResume={async () => {
            // Use the hook's unmute method to sync state and resume playback
            await unmute();
          }}
        />

        {/* Landing Title - shown during entrance/text/morphing phases (2D canvas particles) */}
        <LandingTitle />

        {/* Background Music Player - plays user-selected music from Controls */}
        <BackgroundMusicPlayer isMuted={isMuted} />

        {/* Performance Monitor Overlay */}
        <PerformanceOverlay visible={showPerformance} data={performanceData} />

        {/* Particle Title removed from tree phase per user request */}

        {/* Decorative corner gradient */}

      </div>
    </LandingFlowProvider>
  );
}

export default App;
