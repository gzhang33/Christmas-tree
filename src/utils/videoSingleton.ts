import * as THREE from 'three';

/**
 * Singleton Video Manager
 * 
 * Maintains a single HTMLVideoElement and THREE.VideoTexture for the entire application.
 * This prevents the expensive process of creating/destroying video elements and GPU textures
 * every time a user clicks on a photo with a video.
 */

let video: HTMLVideoElement | null = null;
let texture: THREE.VideoTexture | null = null;
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

    // Append to body (optional, but good for some browser policies)
    document.body.appendChild(video);

    // Create a single VideoTexture
    texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Optimize texture updates
    texture.generateMipmaps = false;

    isInitialized = true;
    console.log('[VideoSingleton] Initialized global video resources');
};

export const playVideo = (url: string): Promise<void> => {
    if (!isInitialized || !video) initVideoSingleton();

    // If already playing this URL, just ensure it's playing
    if (video!.src === url || video!.src.endsWith(url)) {
        return video!.play().catch(e => console.warn('Video play error:', e));
    }

    video!.src = url;
    return video!.play().catch(e => {
        console.warn('Video play failed:', e);
    });
};

export const stopVideo = (): void => {
    if (video) {
        video.pause();
        // clear src to stop buffering? maybe optional.
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
    isInitialized = false;
};
