import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

export interface InteractionSlice {
    isExploded: boolean;
    activePhoto: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null;
    hoveredPhotoId: string | null;
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (photo: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null) => void;
    setHoveredPhoto: (id: string | null) => void;
}

export const createInteractionSlice: StateCreator<AppState, [], [], InteractionSlice> = (set) => ({
    isExploded: false,
    activePhoto: null,
    hoveredPhotoId: null,
    triggerExplosion: () => set({ isExploded: true, activePhoto: null }),
    resetExplosion: () => set({ isExploded: false, activePhoto: null }),
    setActivePhoto: (photo) => set({ activePhoto: photo }),
    setHoveredPhoto: (id) => set({ hoveredPhotoId: id }),
});
