import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience.tsx';
import { Controls } from './components/Controls.tsx';
import { AppConfig, PhotoData, UIState } from './types.ts';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

function App() {
  // --- State Management ---
  const [isExploded, setIsExploded] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [config, setConfig] = useState<AppConfig>({
    treeColor: '#FFC0CB', // Pastel Pink
    particleCount: 15000,  // High density for flocking effect
    snowDensity: 1200,
    rotationSpeed: 0.8,
    photoSize: 1.5,
    explosionRadius: 30,
  });

  // --- Audio Handling ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.4;

    const attemptPlay = async () => {
      try {
        await audio.play();
      } catch (err) {
        console.log("Audio autoplay prevented. Waiting for user interaction.");

        const handleInteraction = async () => {
          try {
            await audio.play();
          } catch (e) {
            console.warn("Audio playback failed after interaction:", e);
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

  // --- Handlers ---
  const updateConfig = useCallback((key: keyof AppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleExplosion = useCallback(() => {
    setIsExploded(prev => !prev);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newState = !prev;
      if (audioRef.current) {
        audioRef.current.muted = newState;
        if (!newState && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.warn("Play failed on unmute:", e));
        }
      }
      return newState;
    });
  }, []);

  const addPhotos = useCallback((files: FileList) => {
    const newPhotos: PhotoData[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      url: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  // --- UI Context Construction ---
  const uiState: UIState = {
    isExploded,
    toggleExplosion,
    photos,
    addPhotos,
    config,
    updateConfig,
    isMuted,
    toggleMute
  };

  return (
    <div className="w-full h-screen relative bg-black">
      {/* Background Music */}
      <audio
        ref={audioRef}
        src="/child-Jingle Bells.mp3"
        loop
        muted={isMuted}
        preload="auto"
      />

      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 4, 25], fov: 45 }}
          dpr={[1, 1.5]}
          gl={{ antialias: false, toneMappingExposure: 1.2, alpha: false }}
        >
          <Experience uiState={uiState} />

          {/* Magical Bloom - Tuned for clarity */}
          <EffectComposer>
            <Bloom luminanceThreshold={0.7} mipmapBlur intensity={0.6} radius={0.3} />
          </EffectComposer>
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <Controls uiState={uiState} />

      {/* Intro Overlay */}
      {!isExploded && photos.length === 0 && (
        <div className="absolute bottom-8 left-8 text-white/60 pointer-events-none z-0">
          <h1 className="text-4xl font-thin tracking-widest text-pink-200 mb-2 drop-shadow-[0_0_15px_rgba(255,183,197,0.8)]">
            MERRY CHRISTMAS
          </h1>
        </div>
      )}
    </div>
  );
}

export default App;