import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { stopVideo } from '../utils/videoSingleton';
import { PARTICLE_CONFIG } from '../config/particles';

/**
 * useBackgroundHandler
 * 
 * Centralized handler for page visibility changes.
 * When the page goes to background (tab hidden / window minimized):
 * 1. Sets isAppInBackground = true in store (triggers Canvas frameloop pause)
 * 2. Pauses video playback
 * 
 * Note: Music pause is handled by BackgroundMusicPlayer component directly.
 * 
 * This hook should be called once at the App level.
 */
export function useBackgroundHandler(): void {
    const setIsAppInBackground = useStore((state) => state.setIsAppInBackground);

    // Track if video was playing before going to background
    const wasVideoPlayingRef = useRef(false);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const isHidden = document.hidden;

            // Update global state
            setIsAppInBackground(isHidden);

            if (isHidden) {
                // === ENTERING BACKGROUND ===
                if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                    console.log('[BackgroundHandler] Page hidden - pausing resources');
                }

                // Pause video (if playing)
                // Note: stopVideo() pauses but doesn't dispose, allowing quick resume
                stopVideo();
                wasVideoPlayingRef.current = true;

            } else {
                // === RETURNING TO FOREGROUND ===
                if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                    console.log('[BackgroundHandler] Page visible - resuming resources');
                }

                // Video will be resumed by GlobalVideoController based on activePhoto/playingVideoInHover state
                // No action needed here as the state-driven controller handles it
            }
        };

        // Set initial state based on current visibility
        if (document.hidden) {
            setIsAppInBackground(true);
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [setIsAppInBackground]);
}
