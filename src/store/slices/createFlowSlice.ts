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

/**
 * Text particle animation phase:
 * - 'hidden': Particles not visible
 * - 'forming': Particles converging to form text
 * - 'visible': Text fully formed, idle animation
 * - 'dispersing': Particles scattering outward
 * - 'drifting': Particles floating, waiting for tree to complete
 * - 'reforming': Particles converging to MagicDust spiral positions
 * - 'dust': Animation complete, particles handed off to MagicDust
 */
export type TextParticlePhase = 'hidden' | 'forming' | 'visible' | 'dispersing' | 'drifting' | 'reforming' | 'dust';

export interface FlowSlice {
    userName: string | null;
    landingPhase: LandingPhase;
    usernameTransitionComplete: boolean;
    treeMorphState: TreeMorphState;
    treeProgress: number; // Current animation progress (0.0 = tree, 1.0 = exploded)
    treeParticleCount: number; // Tree particles only (entity + glow + ornament + gift + treeBase)
    activeParticleCount: number; // Total particles currently rendered in scene (tree + snow + magic dust)
    textParticlePhase: TextParticlePhase; // Current text particle animation phase
    textParticleProgress: number; // Animation progress within current phase (0.0 - 1.0)
    setUserName: (name: string) => void;
    setLandingPhase: (phase: LandingPhase) => void;
    setUsernameTransitionComplete: (complete: boolean) => void;
    setTreeMorphState: (state: TreeMorphState) => void;
    setTreeProgress: (progress: number) => void;
    setTreeParticleCount: (count: number) => void;
    setActiveParticleCount: (count: number) => void;
    setTextParticlePhase: (phase: TextParticlePhase) => void;
    setTextParticleProgress: (progress: number) => void;
}

export const createFlowSlice: StateCreator<AppState, [], [], FlowSlice> = (set) => ({
    userName: null,
    landingPhase: 'input',
    usernameTransitionComplete: false,
    treeMorphState: 'idle',
    treeProgress: 0.0,
    treeParticleCount: 0,
    activeParticleCount: 0,
    textParticlePhase: 'hidden',
    textParticleProgress: 0.0,
    setUserName: (name) => set({ userName: name }),
    setLandingPhase: (phase) => set({ landingPhase: phase, usernameTransitionComplete: false }),
    setUsernameTransitionComplete: (complete) => set({ usernameTransitionComplete: complete }),
    setTreeMorphState: (state) => set({ treeMorphState: state }),
    setTreeProgress: (progress) => set({ treeProgress: progress }),
    setTreeParticleCount: (count) => set({ treeParticleCount: count }),
    setActiveParticleCount: (count) => set({ activeParticleCount: count }),
    setTextParticlePhase: (phase) => set({ textParticlePhase: phase }),
    setTextParticleProgress: (progress) => set({ textParticleProgress: progress }),
});

