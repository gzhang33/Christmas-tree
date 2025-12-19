import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { stopVideo } from '../utils/videoSingleton';
import { PARTICLE_CONFIG } from '../config/particles';

/**
 * useBackgroundHandler
 * 
 * Centralized handler for page visibility changes with full mobile support.
 * When the page goes to background (tab hidden / app switched / window minimized):
 * 1. Sets isAppInBackground = true in store (triggers Canvas frameloop pause)
 * 2. Pauses video playback
 * 
 * Mobile-specific handling:
 * - iOS Safari: `pagehide`/`pageshow` events for app switching
 * - Android Chrome: `blur`/`focus` as fallback
 * - Legacy iOS: `webkitvisibilitychange` for older Safari versions
 * 
 * Note: Music pause is handled by BackgroundMusicPlayer component directly.
 * 
 * This hook should be called once at the App level.
 */
export function useBackgroundHandler(): void {
    const setIsAppInBackground = useStore((state) => state.setIsAppInBackground);

    // Track current state to avoid redundant updates
    const isBackgroundRef = useRef(false);

    useEffect(() => {
        const setBackground = (isHidden: boolean) => {
            // Avoid redundant state updates
            if (isBackgroundRef.current === isHidden) return;
            isBackgroundRef.current = isHidden;

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

            } else {
                // === RETURNING TO FOREGROUND ===
                if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                    console.log('[BackgroundHandler] Page visible - resuming resources');
                }

                // Video will be resumed by GlobalVideoController based on activePhoto/playingVideoInHover state
                // No action needed here as the state-driven controller handles it
            }
        };

        // Primary: visibilitychange (works on most modern browsers)
        const handleVisibilityChange = () => {
            setBackground(document.hidden);
        };

        // iOS Safari: pagehide/pageshow for app switching
        // These fire more reliably on iOS when switching between apps
        const handlePageHide = () => {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log('[BackgroundHandler] pagehide event');
            }
            setBackground(true);
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log('[BackgroundHandler] pageshow event, persisted:', event.persisted);
            }
            // Only resume if the page was actually persisted (bfcache) or is now visible
            if (!document.hidden) {
                setBackground(false);
            }
        };

        // Fallback: blur/focus for edge cases on mobile
        // Some Android browsers may not fire visibilitychange reliably
        const handleBlur = () => {
            // Only treat as background if document is also hidden
            // This prevents false positives from input focus changes
            setTimeout(() => {
                if (document.hidden) {
                    setBackground(true);
                }
            }, 100);
        };

        const handleFocus = () => {
            // Always check actual visibility state
            if (!document.hidden) {
                setBackground(false);
            }
        };

        // Set initial state based on current visibility
        if (document.hidden) {
            isBackgroundRef.current = true;
            setIsAppInBackground(true);
        }

        // Add all event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // iOS Safari specific: also listen for webkit prefix (older iOS versions)
        document.addEventListener('webkitvisibilitychange', handleVisibilityChange);

        // Page lifecycle events (especially important for iOS app switching)
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('pageshow', handlePageShow);

        // Window focus events as fallback
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('webkitvisibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [setIsAppInBackground]);
}

