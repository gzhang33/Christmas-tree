import { StateCreator } from 'zustand';
import { AppState } from '../useStore';
import { COLOR_CONFIG } from '../../config/colors';
import { PERFORMANCE_CONFIG } from '../../config/performance';
import { getResponsiveValue } from '../../utils/responsiveUtils';
import { PARTICLE_CONFIG } from '../../config/particles';
import { AUDIO_CONFIG } from '../../config/audio';
import { PHOTO_WALL_CONFIG } from '../../config/photoConfig';

export interface ConfigSlice {
    treeColor: string;
    particleCount: number;
    magicDustColor: string;
    selectedAudioId: string;
    setTreeColor: (color: string) => void;
    setParticleCount: (count: number) => void;
    setMagicDustColor: (color: string) => void;
    setSelectedAudioId: (id: string) => void;
    photoCount: number;
    setPhotoCount: (count: number) => void;
}

export const createConfigSlice: StateCreator<AppState, [], [], ConfigSlice> = (set) => ({
    treeColor: COLOR_CONFIG.tree.default,
    // 使用响应式配置：桌面端 12000，移动端 10000
    particleCount: getResponsiveValue(PERFORMANCE_CONFIG.particles.defaultCount),
    magicDustColor: COLOR_CONFIG.magicDust.default,
    selectedAudioId: AUDIO_CONFIG.defaultId,
    photoCount: getResponsiveValue(PHOTO_WALL_CONFIG.count),
    setTreeColor: (color) => set({ treeColor: color }),
    setParticleCount: (count) => set({ particleCount: count }),
    setMagicDustColor: (color) => set({ magicDustColor: color }),
    setSelectedAudioId: (id) => set({ selectedAudioId: id }),
    setPhotoCount: (count) => set({ photoCount: count }),
});
