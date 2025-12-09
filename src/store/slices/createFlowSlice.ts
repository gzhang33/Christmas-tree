import { StateCreator } from 'zustand';
import { AppState } from '../useStore';

export type LandingPhase = 'input' | 'entrance' | 'text' | 'morphing' | 'tree';

export interface FlowSlice {
    userName: string | null;
    landingPhase: LandingPhase;
    setUserName: (name: string) => void;
    setLandingPhase: (phase: LandingPhase) => void;
}

export const createFlowSlice: StateCreator<AppState, [], [], FlowSlice> = (set) => ({
    userName: null,
    landingPhase: 'input',
    setUserName: (name) => set({ userName: name }),
    setLandingPhase: (phase) => set({ landingPhase: phase }),
});
