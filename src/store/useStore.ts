import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_TREE_COLOR } from '../config/colors';

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
    activePhotoId: string | null;

    // Actions
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (id: string | null) => void;
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
            activePhotoId: null,

            // Actions
            setTreeColor: (color) => set({ treeColor: color }),
            setParticleCount: (count) => set({ particleCount: count }),
            triggerExplosion: () => set({ isExploded: true }),
            resetExplosion: () => set({ isExploded: false }),
            setActivePhoto: (id) => set({ activePhotoId: id }),
        }),
        {
            name: 'christmas-tree-storage', // LocalStorage key
            storage: createJSONStorage(() => localStorage),
            // Only persist user preferences, not transient state
            partialize: (state) => ({
                treeColor: state.treeColor,
                particleCount: state.particleCount,
            }),
        }
    )
);
