import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

export type LandingPhase = 'input' | 'entrance' | 'text' | 'morphing' | 'tree';

/**
 * Particle tree morphing state:
 * - 'idle': Tree is static (fully formed or fully exploded)
 * - 'morphing-in': Particles are converging to form the tree (entrance animation)
 * - 'morphing-out': Particles are dispersing from tree to photo sea (explosion animation)
 */
export type TreeMorphState = 'idle' | 'morphing-in' | 'morphing-out';

export interface FlowSlice {
    userName: string | null;
    landingPhase: LandingPhase;
    usernameTransitionComplete: boolean;
    treeMorphState: TreeMorphState;
    treeProgress: number; // Current animation progress (0.0 = tree, 1.0 = exploded)
    setUserName: (name: string) => void;
    setLandingPhase: (phase: LandingPhase) => void;
    setUsernameTransitionComplete: (complete: boolean) => void;
    setTreeMorphState: (state: TreeMorphState) => void;
    setTreeProgress: (progress: number) => void;
}

export const createFlowSlice: StateCreator<AppState, [], [], FlowSlice> = (set) => ({
    userName: null,
    landingPhase: 'input',
    usernameTransitionComplete: false,
    treeMorphState: 'idle',
    treeProgress: 0.0,
    setUserName: (name) => set({ userName: name }),
    setLandingPhase: (phase) => set({ landingPhase: phase, usernameTransitionComplete: false }),
    setUsernameTransitionComplete: (complete) => set({ usernameTransitionComplete: complete }),
    setTreeMorphState: (state) => set({ treeMorphState: state }),
    setTreeProgress: (progress) => set({ treeProgress: progress }),
});

