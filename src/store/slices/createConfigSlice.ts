import { StateCreator } from 'zustand';
import { AppState } from '../useStore';
import { DEFAULT_TREE_COLOR } from '../../config/colors';
import { PERFORMANCE_CONFIG, getResponsiveValue } from '../../config/performance';
import { PARTICLE_CONFIG } from '../../config/particles';
import { DEFAULT_AUDIO_ID } from '../../config/audio';

export interface ConfigSlice {
    treeColor: string;
    particleCount: number;
    magicDustColor: string;
    selectedAudioId: string;
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
    setMagicDustColor: (color: string) => void;
    setSelectedAudioId: (id: string) => void;
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set) => ({
    treeColor: DEFAULT_TREE_COLOR,
    // 使用响应式配置：桌面端 12000，移动端 10000
    particleCount: getResponsiveValue(PERFORMANCE_CONFIG.particles.defaultCount),
    // 魔法尘埃颜色默认使用配置文件中的第一个颜色
    magicDustColor: PARTICLE_CONFIG.magicDust.colors[0],
    // 默认不播放音乐
    selectedAudioId: DEFAULT_AUDIO_ID,
    setTreeColor: (color) => set({ treeColor: color }),
    setParticleCount: (count) => set({ particleCount: count }),
    setMagicDustColor: (color) => set({ magicDustColor: color }),
    setSelectedAudioId: (id) => set({ selectedAudioId: id }),
});
