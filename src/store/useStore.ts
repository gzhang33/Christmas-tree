import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_TREE_COLOR } from '../config/colors';

/**
 * Landing Flow Phase Type
 * Represents the current stage of the landing page animation flow
 */
export type LandingPhase = 'input' | 'entrance' | 'text' | 'morphing' | 'tree';

/**
 * Global Application State Interface
 * 
 * This store manages shared state between 3D canvas components and UI components,
 * eliminating prop drilling and enabling efficient state synchronization.
 */
export interface AppState {
    // State
    treeColor: string;
    particleCount: number;
    isExploded: boolean;
    activePhoto: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null;
    hoveredPhotoId: string | null; // For global hover effects (stop rotation)

    // Landing Flow State
    userName: string | null;
    landingPhase: LandingPhase;

    // Actions
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (photo: { id: string; instanceId: number; position: [number, number, number]; rotation: [number, number, number] } | null) => void;
    setHoveredPhoto: (id: string | null) => void;

    // Landing Flow Actions
    setUserName: (name: string) => void;
    setLandingPhase: (phase: LandingPhase) => void;
}

/**
 * Global Zustand Store with LocalStorage Persistence
 * 
 * Persists user preferences (treeColor, particleCount) to LocalStorage
 * to satisfy FR26/FR27 requirements.
 * 
 * Note: This manages the color selection feature.
 * The treeColor controls the particle colors in the 3D tree visualization.
 * 
 * Usage:
 * - UI Components: `const treeColor = useStore(state => state.treeColor)`
 * - 3D Components: `const isExploded = useStore(state => state.isExploded)`
 * - Actions: `useStore.getState().triggerExplosion()`
 */
export const useStore = create<AppState>()(
    persist(
        (set) => ({
            // Initial State
            treeColor: DEFAULT_TREE_COLOR,
            particleCount: 18000, // Default particle count
            isExploded: false,
            activePhoto: null,
            hoveredPhotoId: null,

            // Landing Flow Initial State
            userName: null,
            landingPhase: 'input' as LandingPhase,

            // Actions
            setTreeColor: (color) => set({ treeColor: color }),
            setParticleCount: (count) => set({ particleCount: count }),
            triggerExplosion: () => set({ isExploded: true, activePhoto: null }),
            resetExplosion: () => set({ isExploded: false, activePhoto: null }),
            setActivePhoto: (photo) => set({ activePhoto: photo }),
            setHoveredPhoto: (id) => set({ hoveredPhotoId: id }),

            // Landing Flow Actions
            setUserName: (name) => set({ userName: name }),
            setLandingPhase: (phase) => set({ landingPhase: phase }),
        }),
        {
            name: 'christmas-tree-storage', // LocalStorage key
            storage: createJSONStorage(() => localStorage),
            // Persist user preferences and userName
            partialize: (state) => ({
                treeColor: state.treeColor,
                particleCount: state.particleCount,
                userName: state.userName, // Persist userName for returning visitors
            }),
        }
    )
);
