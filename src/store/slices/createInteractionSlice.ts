import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

/**
 * Hover Video Playback State
 * Used for playing video at hover position without camera movement
 */
export interface PlayingVideoInHover {
    instanceId: number;
    videoUrl: string;
    photoPosition: [number, number, number];
}

export interface InteractionSlice {
    isExploded: boolean;
    activePhoto: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null;
    hoveredPhotoInstanceId: number | null; // Changed from hoveredPhotoId to use instanceId
    playingVideoInHover: PlayingVideoInHover | null; // NEW: Hover video playback state
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (photo: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null) => void;
    setHoveredPhoto: (instanceId: number | null) => void; // Changed parameter type
    setPlayingVideoInHover: (data: PlayingVideoInHover | null) => void; // NEW: Set hover video state
}

export const createInteractionSlice: StateCreator<AppState, [], [], InteractionSlice> = (set) => ({
    isExploded: false,
    activePhoto: null,
    hoveredPhotoInstanceId: null, // Changed from hoveredPhotoId
    playingVideoInHover: null, // NEW: Initially no video playing in hover
    triggerExplosion: () => set({ isExploded: true, activePhoto: null, playingVideoInHover: null }),
    resetExplosion: () => set({ isExploded: false, activePhoto: null, playingVideoInHover: null }),
    setActivePhoto: (photo) => set({ activePhoto: photo, playingVideoInHover: null }), // Clear hover video when activating
    setHoveredPhoto: (instanceId) => set({ hoveredPhotoInstanceId: instanceId }), // Changed
    setPlayingVideoInHover: (data) => set({ playingVideoInHover: data }), // NEW
});
