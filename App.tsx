import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AppConfig, PhotoData, UIState } from './types';
import { Controls } from './components/Controls';
import { Experience } from './components/Experience';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExploded, setIsExploded] = useState(false);
  const [photos, setPhotos] = useState<PhotoData[]>([]);

  const [config, setConfig] = useState<AppConfig>({
    treeColor: '#FFC0CB', // Pastel Pink
    particleCount: 15000,  // High density for flocking effect
    snowDensity: 1200,
    rotationSpeed: 0.8,
    photoSize: 1.5,
    explosionRadius: 30,
    snowSpeed: 0.4,
    windStrength: 1.0,
  });

  // --- Audio Handling ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.4;

    let resolvedByGesture = false;

    const tryUnmuted = async () => {
      if (!audio) return false;
      try {
        audio.muted = false;
        await audio.play();
        setIsMuted(false);
        return true;
      } catch (e) {
        console.warn('Unmuted autoplay blocked:', e);
        return false;
      }
    };

    const tryMuted = async () => {
      if (!audio) return false;
      try {
        audio.muted = true;
        await audio.play();
        setIsMuted(true);
        return true;
      } catch (e) {
        console.warn('Muted autoplay blocked:', e);
        return false;
      }
    };

    const attemptPlayback = async () => {
      const unmuted = await tryUnmuted();
      if (!unmuted) {
        await tryMuted();
      } else {
        resolvedByGesture = true;
        detachGestureUnlock();
      }
    };

    const gestureUnlock = () => {
      if (resolvedByGesture) return;
      tryUnmuted().then(success => {
        if (success) {
          resolvedByGesture = true;
          detachGestureUnlock();
        }
      });
    };

    const detachGestureUnlock = () => {
      document.removeEventListener('pointerdown', gestureUnlock);
      document.removeEventListener('keydown', gestureUnlock);
      document.removeEventListener('touchstart', gestureUnlock);
      window.removeEventListener('focus', gestureUnlock);
    };

    attemptPlayback();

    document.addEventListener('pointerdown', gestureUnlock);
    document.addEventListener('keydown', gestureUnlock);
    document.addEventListener('touchstart', gestureUnlock);
    window.addEventListener('focus', gestureUnlock);

    return () => {
      detachGestureUnlock();
    };
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
    <ErrorBoundary>
      <div className="w-full h-screen relative bg-black">
        {/* Background Music */}
        <audio
          ref={audioRef}
          src="/child-Jingle Bells.mp3"
          loop
          muted={isMuted} // Controlled by state
          preload="auto"
          autoPlay // Try to autoplay (will work if muted)
          onError={(e) => {
            console.warn('Audio playback error:', e);
            // Gracefully handle audio errors without breaking the app
          }}
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
              <Bloom luminanceThreshold={0.8} mipmapBlur intensity={1.2} radius={0.4} />
            </EffectComposer>
          </Canvas>
        </div>

      {/* UI Overlay Layer */}
      <Controls uiState={uiState} />

      {/* Intro Overlay */}
      {!isExploded && photos.length === 0 && (
        <div className="absolute top-8 left-8 md:top-12 md:left-12 pointer-events-none z-10 select-none text-left">
          <div
            className="font-['Great_Vibes'] leading-none transition-colors duration-700 origin-top-left"
            style={{
              color: config.treeColor,
              textShadow: `
                0 0 20px ${config.treeColor}80,
                2px 2px 0px rgba(0,0,0,0.5),
                4px 4px 4px rgba(0,0,0,0.3)
              `,
              transform: 'perspective(1000px) rotateY(12deg) rotateX(5deg) translateZ(20px)',
            }}
          >
            <h1 className="text-5xl md:text-[8rem] block">Merry</h1>
            <h1 className="text-5xl md:text-[8rem] block ml-8 md:ml-32 mt-2 md:mt-0">Christmas</h1>
          </div>
        </div>
      )}

        {/* Music Attribution */}
        <div className="absolute bottom-4 right-4 text-white/30 text-[10px] pointer-events-none z-0 font-light tracking-wide">
          Music: 'Jingle Bells' by Georgia & August Greenberg, from Free Music Archive, licensed under CC BY-NC.
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;