import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ConfigSlice, createConfigSlice } from './slices/createConfigSlice';
import { FlowSlice, createFlowSlice, LandingPhase, TreeMorphState } from './slices/createFlowSlice';
import { InteractionSlice, createInteractionSlice } from './slices/createInteractionSlice';

// Export LandingPhase and TreeMorphState for consumers
export type { LandingPhase, TreeMorphState };

/**
 * Global Application State Interface
 * Aggregates all slices.
 */
export type AppState = ConfigSlice & FlowSlice & InteractionSlice;

/**
 * Global Zustand Store with LocalStorage Persistence
 */
export const useStore = create<AppState>()(
    persist(
        (...a) => ({
            ...createConfigSlice(...a),
            ...createFlowSlice(...a),
            ...createInteractionSlice(...a),
        }),
        {
            name: 'christmas-tree-storage',
            storage: createJSONStorage(() => localStorage),
            // Persist only specific fields
            partialize: (state) => ({
                treeColor: state.treeColor,
                particleCount: state.particleCount,
                userName: state.userName,
                magicDustColor: state.magicDustColor,
                selectedAudioId: state.selectedAudioId,
            }),
        }
    )
);
