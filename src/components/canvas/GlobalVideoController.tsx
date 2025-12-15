import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ASSET_CONFIG } from '../../config/assets';
import { playVideo, stopVideo, initVideoSingleton } from '../../utils/videoSingleton';

/**
 * GlobalVideoController
 * 
 * Logic-only component that synchronizes the Global Video Singleton
 * with the application state (playingVideoInHover has priority over activePhoto).
 */
export const GlobalVideoController = () => {
    const activePhoto = useStore((state) => state.activePhoto);
    const playingVideoInHover = useStore((state) => state.playingVideoInHover);

    // Initialize singleton on mount
    useEffect(() => {
        initVideoSingleton();
        return () => stopVideo();
    }, []);

    // Sync play/pause state - playingVideoInHover has priority
    useEffect(() => {
        // Priority 1: Hover video playback (new feature)
        if (playingVideoInHover) {
            console.log(`[VideoController] Playing hover video for instanceId ${playingVideoInHover.instanceId}`);
            playVideo(playingVideoInHover.videoUrl);
            return;
        }

        // Priority 2: Active photo video (legacy behavior, kept for compatibility)
        if (activePhoto) {
            const memory = ASSET_CONFIG.memories.find(m => m.id === activePhoto.id);

            if (memory && memory.video) {
                console.log(`[VideoController] Playing video for ${activePhoto.id}`);
                playVideo(memory.video);
            } else {
                stopVideo();
            }
            return;
        }

        // No active state, stop video
        stopVideo();
    }, [activePhoto, playingVideoInHover]);

    return null; // Logic only, no render
};

