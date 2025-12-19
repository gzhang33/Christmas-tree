import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { stopVideo } from '../utils/videoSingleton';
import { PARTICLE_CONFIG } from '../config/particles';

// Global flag to bypass React rendering cycle for immediate access in high-frequency loops (like useFrame)
// This is critical for iOS where the process might be suspended almost immediately.
declare global {
    interface Window {
        __IS_BACKGROUND__: boolean;
    }
}

if (typeof window !== 'undefined') {
    window.__IS_BACKGROUND__ = false;
}

/**
 * useBackgroundHandler
 * 
 * Aggressive handler for iOS Safari 17/18 visibility and resource management.
 */
export function useBackgroundHandler(): void {
    const setIsAppInBackground = useStore((state) => state.setIsAppInBackground);

    useEffect(() => {
        const updateState = (isHidden: boolean) => {
            if (window.__IS_BACKGROUND__ === isHidden) return;

            // 1. Set global flag IMMEDIATELY (synchronous)
            window.__IS_BACKGROUND__ = isHidden;

            // 2. Immediate side effects
            if (isHidden) {
                stopVideo();
            }

            // 3. Update React state
            setIsAppInBackground(isHidden);

            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log(`[BackgroundHandler] ${isHidden ? 'Background' : 'Foreground'} detected`);
            }
        };

        const handleVisibilityChange = () => {
            // Use visibilityState for maximum reliability on iOS 17+
            updateState(document.visibilityState === 'hidden');
        };

        const handlePageTransition = (e: PageTransitionEvent | Event) => {
            if (e.type === 'pagehide') {
                updateState(true);
            } else if (e.type === 'pageshow') {
                // If returning from bfcache, check visibility
                updateState(document.visibilityState === 'hidden');
            }
        };

        // iOS specific: 'blur' can be a precursor to swiping up
        const handleBlur = () => {
            // Short timeout to differentiate between input focus and app switching
            setTimeout(() => {
                if (document.hidden || document.visibilityState === 'hidden') {
                    updateState(true);
                }
            }, 50);
        };

        const handleFocus = () => {
            if (!document.hidden) {
                updateState(false);
            }
        };

        // Attach all reliable events
        document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
        window.addEventListener('pagehide', handlePageTransition, { passive: true });
        window.addEventListener('pageshow', handlePageTransition, { passive: true });
        window.addEventListener('blur', handleBlur, { passive: true });
        window.addEventListener('focus', handleFocus, { passive: true });

        // Initial check
        if (document.visibilityState === 'hidden') {
            updateState(true);
        }

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageTransition);
            window.removeEventListener('pageshow', handlePageTransition);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [setIsAppInBackground]);
}
