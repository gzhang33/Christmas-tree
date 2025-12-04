import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/canvas/Experience.tsx';
import { Controls } from './components/ui/Controls.tsx';
import { DebugStore } from './components/ui/DebugStore.tsx';
import { AppConfig, PhotoData, UIState } from './types.ts';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { usePerformanceMonitor, PerformanceOverlay } from './components/canvas/PerformanceMonitor.tsx';
import { useStore } from './store/useStore.ts';
import * as THREE from 'three';
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
  const treeColor = useStore((state) => state.treeColor);
  const particleCount = useStore((state) => state.particleCount);
  const isExploded = useStore((state) => state.isExploded);
  const setTreeColor = useStore((state) => state.setTreeColor);
  const setParticleCount = useStore((state) => state.setParticleCount);
  const triggerExplosion = useStore((state) => state.triggerExplosion);
  const resetExplosion = useStore((state) => state.resetExplosion);

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
    treeColor: treeColor, // Synced from store
    particleCount: particleCount, // Synced from store
    snowDensity: 1500,
    rotationSpeed: 0.6,
    photoSize: 1.5,
    explosionRadius: 30,
    snowSpeed: 1.2,
    windStrength: 0.4,
  });

  // Sync store changes to local config
  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      treeColor: treeColor,
      particleCount: particleCount,
    }));
  }, [treeColor, particleCount]);

  // Estimate total particles
  const estimatedParticleCount = Math.floor(
    config.particleCount * 1.5 + // Tree particles (entity + glow)
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
    // Update local config
    setConfig((prev) => ({ ...prev, [key]: value }));

    // Sync specific keys to global store
    if (key === 'treeColor') {
      setTreeColor(value);
    } else if (key === 'particleCount') {
      setParticleCount(value);
    }
  }, [setTreeColor, setParticleCount]);

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

  const addPhotos = useCallback((files: FileList) => {
    const newPhotos: PhotoData[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file),
    }));
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
  };

  return (
    <div className="w-full h-screen relative bg-black overflow-hidden">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/child-Jingle Bells.mp3"
        crossOrigin="anonymous"
        loop
        muted={isMuted}
        preload="auto"
      />

      {/* 3D Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 5, 28], fov: 42 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMappingExposure: 1.4, // Dynamic exposure
            alpha: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ scene }) => {
            scene.background = new THREE.Color('#030002');
          }}
        >

          <Experience uiState={uiState} />

          {/* Performance Tracker */}
          <PerformanceMonitorWrapper
            particleCount={estimatedParticleCount}
            onUpdate={handlePerformanceUpdate}
          />

          {/* === CINEMATIC POST PROCESSING PIPELINE === */}
          <EffectComposer multisampling={0}>
            {/* Primary Bloom - Main threshold 0.4 (per spec) */}
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.9}
              mipmapBlur
              intensity={1.2}
              radius={0.8}
            />
            {/* Secondary Bloom - Highlight threshold 0.85 (per spec) */}
            <Bloom
              luminanceThreshold={0.85}
              luminanceSmoothing={0.5}
              mipmapBlur
              intensity={0.8}
              radius={0.5}
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

      {/* UI Overlay */}
      <Controls uiState={uiState} />

      {/* Debug Store Panel (F4 to toggle) */}
      <DebugStore />

      {/* Performance Monitor Overlay */}
      <PerformanceOverlay visible={showPerformance} data={performanceData} />

      {/* Intro Text */}
      {!isExploded && photos.length === 0 && (
        <div
          className="absolute pointer-events-none z-10 text-white/80"
          style={{
            top: 'clamp(1rem, 4vh, 2rem)',
            left: 'clamp(1rem, 3vw, 2.5rem)',
            maxWidth: isHeroTextCompact ? 'min(60vw, 18rem)' : '22rem',
          }}
        >
          <div className="flex flex-col text-left leading-tight">
            <span
              style={{
                fontFamily: '"Great Vibes", "Great_Vibes", cursive',
                letterSpacing: '0.18em',
                fontSize: isHeroTextCompact ? 'clamp(2.4rem, 8vw, 3.2rem)' : 'clamp(3.2rem, 4vw, 4rem)',
                background: 'linear-gradient(180deg, #fff7fb 0%, #ffd6e3 45%, #f7a0c0 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 25px rgba(255,183,197,0.9), 0 8px 45px rgba(62,4,20,0.7)',
              }}
            >
              Merry
            </span>
            <span
              style={{
                fontFamily: '"Great Vibes", "Great_Vibes", cursive',
                letterSpacing: '0.18em',
                fontSize: isHeroTextCompact ? 'clamp(2.4rem, 8vw, 3.2rem)' : 'clamp(3.2rem, 4vw, 4rem)',
                paddingLeft: isHeroTextCompact ? '0.75rem' : '1.5rem',
                background: 'linear-gradient(180deg, #fff7fb 0%, #ffd6e3 45%, #f7a0c0 100%)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 25px rgba(255,183,197,0.9), 0 8px 45px rgba(62,4,20,0.7)',
              }}
            >
              Christmas
            </span>
          </div>
        </div>
      )}

      {/* Decorative corner gradient */}
      <div
        className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at bottom left, rgba(255,182,193,0.08) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

export default App;
