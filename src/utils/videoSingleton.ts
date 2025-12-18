import * as THREE from 'three';
import { PARTICLE_CONFIG } from '../config/particles';

/**
 * Singleton Video Manager
 * 
 * Maintains a single HTMLVideoElement and THREE.VideoTexture for the entire application.
 * This prevents the expensive process of creating/destroying video elements and GPU textures
 * every time a user clicks on a photo with a video.
 */

let video: HTMLVideoElement | null = null;
let texture: THREE.VideoTexture | null = null;
let currentUrl: string | null = null;
let isInitialized = false;

export const initVideoSingleton = (): void => {
    if (isInitialized) return;

    // Create a single hidden video element
    video = document.createElement('video');
    video.crossOrigin = 'Anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.style.display = 'none';

    // Critical for performance: preload none until needed
    video.preload = 'none';

    // Ensure video is appended to DOM when ready
    const appendVideo = () => {
        if (video && document.body) {
            document.body.appendChild(video);
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[VideoSingleton] Video element appended to DOM');
        }
    };

    // Check if DOM is already ready
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        // DOM is ready, append immediately
        appendVideo();
    } else {
        // DOM not ready, wait for DOMContentLoaded
        const handleDOMReady = () => {
            appendVideo();
            document.removeEventListener('DOMContentLoaded', handleDOMReady);
        };
        document.addEventListener('DOMContentLoaded', handleDOMReady);
    }

    // Create a single VideoTexture
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Optimize texture updates
    texture.generateMipmaps = false;

    isInitialized = true;
    // currentUrl remains null until a URL is assigned
    if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[VideoSingleton] Initialized global video resources');
};
export const playVideo = (url: string): Promise<void> => {
    // Ensure initialization
    if (!isInitialized || !video) {
        initVideoSingleton();
    }

    // Guard against null after init (should never happen, but TypeScript safety)
    const videoElement = video;
    if (!videoElement) {
        return Promise.reject(new Error('[VideoSingleton] Video element not initialized'));
    }

    // Compare incoming url to currentUrl (not video.src) to avoid absolute/relative URL mismatch
    if (currentUrl === url) {
        // Already playing this URL, just ensure it's playing
        return videoElement.play().catch(e => console.warn('[VideoSingleton] Video play error:', e));
    }

    // Set new URL
    videoElement.src = url;

    // Start playback and update currentUrl only on success
    return videoElement.play()
        .then(() => {
            currentUrl = url;
        })
        .catch(e => {
            console.warn('[VideoSingleton] Video play failed:', e);
            throw e; // 重新抛出错误，让调用者知道播放失败了
        });
};

export const stopVideo = (): void => {
    if (video) {
        video.pause();
        // Clear currentUrl when stopping
        currentUrl = null;
        // Optionally clear src to stop buffering
        // video.src = ''; 
    }
};

export const getVideoTexture = (): THREE.VideoTexture | null => {
    if (!isInitialized) initVideoSingleton();
    return texture;
};

export const disposeVideoSingleton = (): void => {
    if (video) {
        video.pause();
        video.src = '';
        video.remove();
        video = null;
    }
    if (texture) {
        texture.dispose();
        texture = null;
    }
    // Clear currentUrl when disposing
    currentUrl = null;
    isInitialized = false;
};
