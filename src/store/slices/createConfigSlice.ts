import { StateCreator } from 'zustand';
import { AppState } from '../useStore';
import { DEFAULT_TREE_COLOR } from '../../config/colors';
import { PERFORMANCE_CONFIG, getResponsiveValue } from '../../config/performance';

export interface ConfigSlice {
    treeColor: string;
    particleCount: number;
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set) => ({
    treeColor: DEFAULT_TREE_COLOR,
    // 使用响应式配置：桌面端 12000，移动端 10000
    particleCount: getResponsiveValue(PERFORMANCE_CONFIG.particles.defaultCount),
    setTreeColor: (color) => set({ treeColor: color }),
    setParticleCount: (count) => set({ particleCount: count }),
});
