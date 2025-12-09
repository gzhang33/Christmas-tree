import { StateCreator } from 'zustand';
import { AppState } from '../useStore';
import { DEFAULT_TREE_COLOR } from '../../config/colors';

export interface ConfigSlice {
    treeColor: string;
    particleCount: number;
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set) => ({
    treeColor: DEFAULT_TREE_COLOR,
    particleCount: 18000,
    setTreeColor: (color) => set({ treeColor: color }),
    setParticleCount: (count) => set({ particleCount: count }),
});
