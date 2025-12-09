import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/canvas/Experience.tsx';
import { Snow } from './components/canvas/Snow.tsx';
import { Controls } from './components/ui/Controls.tsx';
import { DebugStore } from './components/ui/DebugStore.tsx';
import { LandingFlowController } from './components/ui/LandingFlowController.tsx';
import { LandingTitle } from './components/ui/LandingTitle.tsx';
import { AppConfig, PhotoData, UIState } from './types.ts';
import { AUDIO } from './config/assets.ts';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { usePerformanceMonitor, PerformanceOverlay } from './components/canvas/PerformanceMonitor.tsx';
import { useStore, LandingPhase } from './store/useStore.ts';
import * as THREE from 'three';
import { encodeState, decodeState } from './utils/shareUtils';
import './index.css';

// === POST-PROCESSING PIPELINE (Per Specification) ===
// 1. HDR color conversion (handled by Three.js tone mapping)
// 2. Dual-layer Bloom (main threshold 0.4 / highlight threshold 0.85)
// 3. Screen-space volumetric light (simulated via bloom)
// 4. Dynamic exposure adjustment (tone mapping exposure)
// 5. Cinematic vignette

// Performance monitor wrapper component
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

function App() {
  // Global State from Zustand Store
  const particleCount = useStore((state) => state.particleCount);
  const isExploded = useStore((state) => state.isExploded);
  const triggerExplosion = useStore((state) => state.triggerExplosion);
  const resetExplosion = useStore((state) => state.resetExplosion);
  const landingPhase = useStore((state) => state.landingPhase);
  const setLandingPhase = useStore((state) => state.setLandingPhase);

  // Local State (not in global store)
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isMuted, setIsMuted] = useState(false);
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
  const audioRef = useRef<HTMLAudioElement>(null);
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

  // Estimate total particles
  const estimatedParticleCount = Math.floor(
    particleCount * 1.5 + // Tree particles (entity + glow)
    3000 + // Ornaments
    5500 + // Gifts
    config.snowDensity + // Snow
    1200 // Magic dust
  );

  // Audio Handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    // Declare handleInteraction outside attemptPlay to ensure stable reference
    const handleInteraction = async () => {
      try {
        await audio.play();
        setIsMuted(false);
      } catch (e) {
        console.warn('Audio playback failed after interaction:', e);
      }
      // Remove listeners after successful interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    const attemptPlay = async () => {
      try {
        await audio.play();
        setIsMuted(false);
      } catch (err) {
        console.log('Audio autoplay prevented. Waiting for user interaction.');
        setIsMuted(true);

        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
      }
    };

    attemptPlay();

    // Cleanup function to remove listeners on unmount
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

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

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newState = !prev;
      if (audioRef.current) {
        audioRef.current.muted = newState;
        if (!newState && audioRef.current.paused) {
          audioRef.current.play().catch((e) => console.warn('Play failed on unmute:', e));
        }
      }
      return newState;
    });
  }, []);

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

  // Share Logic
  const generateShareUrl = useCallback(() => {
    const shareCode = encodeState(photos, useStore.getState().treeColor, config); // Read directly from store
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?s=${shareCode}`;
  }, [photos, config]); // treeColor is read from store getter

  // startup restoration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareCode = params.get('s');

    if (shareCode) {
      const data = decodeState(shareCode);
      if (data) {
        // Restore Photos
        if (data.p && Array.isArray(data.p)) {
          // 验证URL格式
          const validUrls = data.p.filter(url =>
            typeof url === 'string' &&
            (url.startsWith('https://') || url.startsWith('http://'))
          );
          const restoredPhotos = validUrls.map(url => ({
            id: Math.random().toString(36).substring(2, 9),
            url: url
          }));
          setPhotos(restoredPhotos);
        }

        // Restore Config
        if (data.cfg) {
          // 只恢复已知的配置项，并验证数值范围
          const safeConfig: Partial<AppConfig> = {};
          if (typeof data.cfg.snowDensity === 'number' && data.cfg.snowDensity >= 0 && data.cfg.snowDensity <= 10000) {
            safeConfig.snowDensity = data.cfg.snowDensity;
          }
          if (typeof data.cfg.rotationSpeed === 'number' && data.cfg.rotationSpeed >= 0 && data.cfg.rotationSpeed <= 5) {
            safeConfig.rotationSpeed = data.cfg.rotationSpeed;
          }
          if (typeof data.cfg.photoSize === 'number' && data.cfg.photoSize >= 0.5 && data.cfg.photoSize <= 5) {
            safeConfig.photoSize = data.cfg.photoSize;
          }
          if (typeof data.cfg.explosionRadius === 'number' && data.cfg.explosionRadius >= 0 && data.cfg.explosionRadius <= 100) {
            safeConfig.explosionRadius = data.cfg.explosionRadius;
          }
          if (typeof data.cfg.snowSpeed === 'number' && data.cfg.snowSpeed >= 0 && data.cfg.snowSpeed <= 10) {
            safeConfig.snowSpeed = data.cfg.snowSpeed;
          }
          if (typeof data.cfg.windStrength === 'number' && data.cfg.windStrength >= 0 && data.cfg.windStrength <= 5) {
            safeConfig.windStrength = data.cfg.windStrength;
          }
          setConfig(prev => ({ ...prev, ...safeConfig }));
        }

        // Restore Color
        if (data.c && /^#[0-9A-Fa-f]{6}$/.test(data.c)) {
          useStore.getState().setTreeColor(data.c);
        }

        // Optional: clear URL to keep it clean? 
        // window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);
  // UI Context
  const uiState: UIState = {
    isExploded,
    toggleExplosion,
    photos,
    addPhotos,
    config,
    updateConfig,
    isMuted,
    toggleMute,
    generateShareUrl,
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src={AUDIO.jingleBells}
        crossOrigin="anonymous"
        loop
        muted={isMuted}
        preload="auto"
      />

      {/* 3D Canvas */}
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

          {/* Tree Experience - shown once morphing starts or in tree phase */}
          {(landingPhase === 'morphing' || landingPhase === 'tree') && <Experience uiState={uiState} />}

          {/* Performance Tracker */}
          <PerformanceMonitorWrapper
            particleCount={estimatedParticleCount}
            onUpdate={handlePerformanceUpdate}
          />

          {/* === CINEMATIC POST PROCESSING PIPELINE === */}
          {/* Optimized for clearer silhouette and reduced overexposure */}
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
            {/* Cinematic Vignette (per spec) */}
            <Vignette
              offset={0.35}
              darkness={0.65}
              blendFunction={BlendFunction.NORMAL}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Overlay - only shown in tree phase */}
      {landingPhase === 'tree' && <Controls uiState={uiState} />}

      {/* Debug Store Panel (F4 to toggle) */}
      <DebugStore performanceData={performanceData} />

      {/* Landing Flow Controller - handles name input, click prompts */}
      <LandingFlowController
        onPhaseChange={(phase) => console.log('[LandingFlow] Phase:', phase)}
        onAudioResume={() => {
          if (audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
            setIsMuted(false);
          }
        }}
      />

      {/* Landing Title - shown during entrance/text/morphing phases (2D canvas particles) */}
      <LandingTitle
        onEntranceComplete={() => setLandingPhase('text')}
        onFadeOutComplete={() => setLandingPhase('tree')}
      />

      {/* Performance Monitor Overlay */}
      <PerformanceOverlay visible={showPerformance} data={performanceData} />

      {/* Particle Title removed from tree phase per user request */}

      {/* Decorative corner gradient */}

    </div>
  );
}

export default App;
