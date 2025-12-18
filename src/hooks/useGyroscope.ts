/**
 * useGyroscope Hook
 * 
 * Provides device orientation data for mobile gyroscope tilt effects.
 * Maps device tilt (Beta/Gamma) to normalized values for 3D photo container offset.
 * 
 * Features:
 * - Automatic iOS 13+ permission handling
 * - Fallback for non-supporting browsers
 * - Smoothed values with configurable responsiveness
 * - SSR-safe (no window access during module initialization)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { INTERACTION_CONFIG } from '../config/interactions';
import { PARTICLE_CONFIG } from '../config/particles';

export interface GyroscopeState {
    /** Normalized tilt X (-1 to 1), derived from device gamma (left-right tilt) */
    tiltX: number;
    /** Normalized tilt Y (-1 to 1), derived from device beta (front-back tilt) */
    tiltY: number;
    /** Whether gyroscope is available and active */
    isSupported: boolean;
    /** Whether permission was granted (iOS 13+) */
    hasPermission: boolean;
    /** Request permission for iOS 13+ devices */
    requestPermission: () => Promise<boolean>;
}

/**
 * Check if device supports DeviceOrientation API
 */
const checkGyroscopeSupport = (): boolean => {
    if (typeof window === 'undefined') return false;
    return 'DeviceOrientationEvent' in window;
};

/**
 * Check if device is mobile/tablet
 */
const checkIsMobile = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Hook providing device gyroscope data for tilt effects
 */
export function useGyroscope(): GyroscopeState {
    const [tiltX, setTiltX] = useState(0);
    const [tiltY, setTiltY] = useState(0);
    const [isSupported, setIsSupported] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    // Smoothed values ref (for lerp)
    const smoothedRef = useRef({ x: 0, y: 0 });

    // Animation frame ID for cleanup
    const rafIdRef = useRef<number | null>(null);

    // Config from interactions.ts
    const config = INTERACTION_CONFIG.hover.gyroscope;
    const { sensitivity, smoothing, deadzone, maxAngle } = config;

    /**
     * Process raw device orientation event
     */
    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        const { beta, gamma } = event;

        // Null check (values can be null on some devices)
        if (beta === null || gamma === null) return;

        // Normalize based on maxAngle configuration
        // Beta: Front-back tilt (-180 to 180, we use ~-90 to 90 range)
        // Gamma: Left-right tilt (-90 to 90)
        let normalizedX = gamma / maxAngle;
        let normalizedY = (beta - 45) / maxAngle; // Offset for natural phone holding position

        // Apply deadzone
        if (Math.abs(normalizedX) < deadzone) normalizedX = 0;
        if (Math.abs(normalizedY) < deadzone) normalizedY = 0;

        // Clamp to -1 to 1 range
        normalizedX = Math.max(-1, Math.min(1, normalizedX * sensitivity));
        normalizedY = Math.max(-1, Math.min(1, normalizedY * sensitivity));

        // Apply smoothing via exponential lerp
        const smoothed = smoothedRef.current;
        smoothed.x += (normalizedX - smoothed.x) * smoothing;
        smoothed.y += (normalizedY - smoothed.y) * smoothing;

        setTiltX(smoothed.x);
        setTiltY(smoothed.y);
    }, [sensitivity, smoothing, deadzone, maxAngle]);

    /**
     * Request permission for iOS 13+ devices
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        // Check if permission API is available (iOS 13+)
        const DeviceOrientationEventWithPermission = DeviceOrientationEvent as unknown as {
            requestPermission?: () => Promise<'granted' | 'denied'>;
        };

        if (typeof DeviceOrientationEventWithPermission.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEventWithPermission.requestPermission();
                const granted = permission === 'granted';
                setHasPermission(granted);
                return granted;
            } catch (error) {
                console.warn('[useGyroscope] Permission request failed:', error);
                setHasPermission(false);
                return false;
            }
        }

        // Non-iOS devices don't need permission
        setHasPermission(true);
        return true;
    }, []);

    /**
     * Initialize gyroscope listener
     */
    useEffect(() => {
        // Skip if gyroscope not enabled in config
        if (!config.enabled) {
            setIsSupported(false);
            return;
        }

        // Skip if mobileOnly is true and not on mobile device
        if (config.mobileOnly && !checkIsMobile()) {
            setIsSupported(false);
            return;
        }

        const supported = checkGyroscopeSupport();
        setIsSupported(supported);

        if (!supported) {
            console.log('[useGyroscope] DeviceOrientation not supported');
            return;
        }

        // Add listener
        window.addEventListener('deviceorientation', handleOrientation, true);
        console.log('[useGyroscope] Gyroscope listener activated');

        // Assume permission granted initially (non-iOS)
        // iOS 13+ will need explicit permission request
        const needsPermission = typeof (DeviceOrientationEvent as any).requestPermission === 'function';
        if (!needsPermission) {
            setHasPermission(true);
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation, true);
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
            console.log('[useGyroscope] Gyroscope listener deactivated');
        };
    }, [handleOrientation, config.enabled, config.mobileOnly]);

    return {
        tiltX,
        tiltY,
        isSupported,
        hasPermission,
        requestPermission,
    };
}

/**
 * Singleton store for global gyroscope state
 * Used by PhotoManager to avoid multiple listeners
 */
let globalGyroscopeState: {
    tiltX: number;
    tiltY: number;
    isActive: boolean;
    listeners: Set<() => void>;
} = {
    tiltX: 0,
    tiltY: 0,
    isActive: false,
    listeners: new Set(),
};

/**
 * Get current global gyroscope tilt values
 * Used by useFrame hooks that need immediate values without React state
 */
export function getGyroscopeTilt(): { tiltX: number; tiltY: number; isActive: boolean } {
    return {
        tiltX: globalGyroscopeState.tiltX,
        tiltY: globalGyroscopeState.tiltY,
        isActive: globalGyroscopeState.isActive,
    };
}

/**
 * Initialize global gyroscope listener (call once at app level)
 * Supports both real devices and Chrome DevTools Sensors simulation
 */
export function initGlobalGyroscope(): () => void {
    if (typeof window === 'undefined') return () => { };

    const config = INTERACTION_CONFIG.hover.gyroscope;

    // Early exit if disabled
    if (!config.enabled) {
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Disabled in config');
        return () => { };
    }

    // Check mobileOnly flag - if true, require mobile device
    if (config.mobileOnly && !checkIsMobile()) {
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Skipped: mobileOnly=true but not on mobile device');
        return () => { };
    }

    // Check if DeviceOrientation API is available
    if (!checkGyroscopeSupport()) {
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] DeviceOrientationEvent not supported in this browser');
        return () => { };
    }

    const smoothed = { x: 0, y: 0 };
    let eventCount = 0;

    const handleOrientation = (event: DeviceOrientationEvent) => {
        const { beta, gamma, alpha } = event;

        // Debug: Log first few events to verify reception
        if (eventCount < 3 && PARTICLE_CONFIG.performance.enableDebugLogs) {
            console.log(`[Gyroscope] Event #${eventCount + 1}: alpha=${alpha?.toFixed(1)}, beta=${beta?.toFixed(1)}, gamma=${gamma?.toFixed(1)}`);
            eventCount++;
        }

        // Null check (values can be null on some devices or initial events)
        if (beta === null || gamma === null) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Received null values, skipping');
            return;
        }

        const { sensitivity, smoothing, deadzone, maxAngle } = config;

        let normalizedX = gamma / maxAngle;
        let normalizedY = (beta - 45) / maxAngle;

        if (Math.abs(normalizedX) < deadzone) normalizedX = 0;
        if (Math.abs(normalizedY) < deadzone) normalizedY = 0;

        normalizedX = Math.max(-1, Math.min(1, normalizedX * sensitivity));
        normalizedY = Math.max(-1, Math.min(1, normalizedY * sensitivity));

        smoothed.x += (normalizedX - smoothed.x) * smoothing;
        smoothed.y += (normalizedY - smoothed.y) * smoothing;

        globalGyroscopeState.tiltX = smoothed.x;
        globalGyroscopeState.tiltY = smoothed.y;
        globalGyroscopeState.isActive = true;
    };

    // Use standard event listener (no capture phase) for better DevTools compatibility
    window.addEventListener('deviceorientation', handleOrientation);
    if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Global listener initialized (mobileOnly=' + config.mobileOnly + ')');

    // Expose debug function to window for manual testing
    (window as any).__gyroscopeDebug = {
        getState: () => ({ ...globalGyroscopeState }),
        triggerTest: (beta: number = 45, gamma: number = 30) => {
            const testEvent = new DeviceOrientationEvent('deviceorientation', {
                alpha: 0,
                beta,
                gamma,
                absolute: true,
            });
            window.dispatchEvent(testEvent);
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Test event dispatched: beta=' + beta + ', gamma=' + gamma);
        },
        // Check current hover state from Zustand store
        getHoverState: () => {
            // Dynamic import to avoid circular dependency
            const { useStore } = require('../store/useStore');
            const state = useStore.getState();
            return {
                hoveredPhotoInstanceId: state.hoveredPhotoInstanceId,
                isAnyPhotoHovered: state.hoveredPhotoInstanceId !== null,
            };
        },
    };
    if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Debug: __gyroscopeDebug.getState() / .triggerTest(beta, gamma) / .getHoverState()');

    return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
        globalGyroscopeState.isActive = false;
        delete (window as any).__gyroscopeDebug;
        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[Gyroscope] Global listener disposed');
    };
}
