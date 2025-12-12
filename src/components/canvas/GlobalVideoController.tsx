import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { MEMORIES } from '../../config/assets';
import { playVideo, stopVideo, initVideoSingleton } from '../../utils/videoSingleton';

/**
 * GlobalVideoController
 * 
 * Logic-only component that synchronizes the Global Video Singleton
 * with the application state (activePhoto).
 */
export const GlobalVideoController = () => {
    const activePhoto = useStore((state) => state.activePhoto);

    // Initialize singleton on mount
    useEffect(() => {
        initVideoSingleton();
        return () => stopVideo();
    }, []);

    // Sync play/pause state
    useEffect(() => {
        if (activePhoto) {
            // Find the memory config for this photo ID
            const memory = MEMORIES.find(m => m.id === activePhoto.id);

            if (memory && memory.video) {
                // If it has a video, play it on the singleton
                console.log(`[VideoController] Playing video for ${activePhoto.id}`);
                playVideo(memory.video);
            } else {
                // Active photo but no video? Ensure stopped.
                stopVideo();
            }
        } else {
            // No active photo, stop video
            stopVideo();
        }
    }, [activePhoto]);

    return null; // Logic only, no render
};
