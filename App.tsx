import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience.tsx';
import { Controls } from './components/Controls.tsx';
import { AppConfig, PhotoData, UIState } from './types.ts';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { usePerformanceMonitor, PerformanceOverlay } from './components/PerformanceMonitor.tsx';

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
  // State Management
  const [isExploded, setIsExploded] = useState(false);
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

  const [config, setConfig] = useState<AppConfig>({
    treeColor: '#FFC0CB',
    particleCount: 18000,
    snowDensity: 1500,
    rotationSpeed: 0.6,
    photoSize: 1.5,
    explosionRadius: 30,
  });

  // Estimate total particles
  const estimatedParticleCount = Math.floor(
    config.particleCount * 1.5 + // Tree particles (entity + glow)
    3000 + // Ornaments
    1800 + // Crown
    5500 + // Gifts
    config.snowDensity + // Snow
    1200 // Magic dust
  );

  // Audio Handling
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.35;

    const attemptPlay = async () => {
      try {
        await audio.play();
        setIsMuted(false);
      } catch (err) {
        console.log('Audio autoplay prevented. Waiting for user interaction.');
        setIsMuted(true);

        const handleInteraction = async () => {
          try {
            await audio.play();
            setIsMuted(false);
          } catch (e) {
            console.warn('Audio playback failed after interaction:', e);
          }
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('keydown', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
      }
    };

    attemptPlay();
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
    setIsExploded((prev) => !prev);
  }, []);

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
        src="https://ia800501.us.archive.org/22/items/JingleBells_209/JingleBells.mp3"
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
        >
          <color attach="background" args={['#030002']} />

          <Experience uiState={uiState} />

          {/* Performance Tracker */}
          <PerformanceMonitorWrapper
            particleCount={estimatedParticleCount}
            onUpdate={handlePerformanceUpdate}
          />

          {/* === CINEMATIC POST PROCESSING PIPELINE === */}
          <EffectComposer disableNormalPass multisampling={0}>
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
            {/* Tertiary Bloom - Crown HDR glow (threshold 1.0+) */}
            <Bloom
              luminanceThreshold={1.2}
              luminanceSmoothing={0.3}
              mipmapBlur
              intensity={0.5}
              radius={0.3}
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

      {/* Performance Monitor Overlay */}
      <PerformanceOverlay visible={showPerformance} data={performanceData} />

      {/* Intro Text */}
      {!isExploded && photos.length === 0 && (
        <div className="absolute bottom-8 left-8 text-white/60 pointer-events-none z-10">
          <h1
            className="text-4xl font-thin tracking-widest mb-2"
            style={{
              color: '#FFD1DC',
              textShadow: '0 0 20px rgba(255,183,197,0.8), 0 0 40px rgba(255,183,197,0.4)',
            }}
          >
            ROYAL CHRISTMAS
          </h1>
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{ color: 'rgba(255, 200, 210, 0.7)' }}
          >
            Tap the tree to unwrap memory universe
          </p>
          <p
            className="text-xs tracking-[0.2em] mt-2 opacity-50"
            style={{ color: 'rgba(255, 200, 210, 0.5)' }}
          >
            Press ` or F3 for performance panel
          </p>
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
