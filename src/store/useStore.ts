import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
    
    // Performance monitoring (runtime only, not persisted)
    currentFps: number | null;
    isLowFps: boolean;

    // Actions
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
    triggerExplosion: () => void;
    resetExplosion: () => void;
    setActivePhoto: (id: string | null) => void;
    setFps: (fps: number) => void;
}

/**
 * Global Zustand Store with LocalStorage Persistence
 * 
 * Persists user preferences (treeColor, particleCount) to LocalStorage
 * to satisfy FR26/FR27 requirements.
 * 
 * Usage:
 * Usage:
 * - UI Components: `const treeColor = useStore(state => state.treeColor)` * - 3D Components: `const isExploded = useStore(state => state.isExploded)`
 * - Actions: `useStore.getState().triggerExplosion()`
 */
export const useStore = create<AppState>()(
    persist(
        (set) => ({
            // Initial State
            treeColor: '#D53F8C', // Default Midnight Pink
            particleCount: 18000, // Default particle count
            isExploded: false,
            activePhotoId: null,
            
            // Performance monitoring (runtime only)
            currentFps: null,
            isLowFps: false,

            // Actions
            setTreeColor: (color) => set({ treeColor: color }),
            setParticleCount: (count) => set({ particleCount: count }),
            triggerExplosion: () => set({ isExploded: true }),
            resetExplosion: () => set({ isExploded: false }),
            setActivePhoto: (id) => set({ activePhotoId: id }),
            setFps: (fps) => set({ 
                currentFps: fps, 
                isLowFps: fps < 30 
            }),
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
