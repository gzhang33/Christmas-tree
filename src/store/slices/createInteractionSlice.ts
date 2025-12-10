import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

export interface InteractionSlice {
    isExploded: boolean;
    activePhoto: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null;
    hoveredPhotoInstanceId: number | null; // Changed from hoveredPhotoId to use instanceId
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (photo: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null) => void;
    setHoveredPhoto: (instanceId: number | null) => void; // Changed parameter type
}

export const createInteractionSlice: StateCreator<AppState, [], [], InteractionSlice> = (set) => ({
    isExploded: false,
    activePhoto: null,
    hoveredPhotoInstanceId: null, // Changed from hoveredPhotoId
    triggerExplosion: () => set({ isExploded: true, activePhoto: null }),
    resetExplosion: () => set({ isExploded: false, activePhoto: null }),
    setActivePhoto: (photo) => set({ activePhoto: photo }),
    setHoveredPhoto: (instanceId) => set({ hoveredPhotoInstanceId: instanceId }), // Changed
});
