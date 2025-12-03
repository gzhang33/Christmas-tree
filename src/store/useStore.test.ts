import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useStore.setState({
            treeColor: '#D53F8C',
            particleCount: 18000,
            isExploded: false,
            activePhotoId: null,
            currentFps: null,
            isLowFps: false,
        });
        localStorage.clear();
    });

    it('should have correct initial state', () => {
        const state = useStore.getState();
        expect(state.treeColor).toBe('#D53F8C');
        expect(state.particleCount).toBe(18000);
        expect(state.isExploded).toBe(false);
        expect(state.activePhotoId).toBeNull();
    });

    it('should update treeColor', () => {
        useStore.getState().setTreeColor('#00FF00');
        expect(useStore.getState().treeColor).toBe('#00FF00');
    });

    it('should update particleCount', () => {
        useStore.getState().setParticleCount(5000);
        expect(useStore.getState().particleCount).toBe(5000);
    });

    it('should trigger explosion', () => {
        useStore.getState().triggerExplosion();
        expect(useStore.getState().isExploded).toBe(true);
    });

    it('should reset explosion', () => {
        useStore.getState().triggerExplosion();
        useStore.getState().resetExplosion();
        expect(useStore.getState().isExploded).toBe(false);
    });

    it('should set active photo id', () => {
        useStore.getState().setActivePhoto('photo-1');
        expect(useStore.getState().activePhotoId).toBe('photo-1');
    });

    it('should update FPS and set low FPS flag', () => {
        useStore.getState().setFps(25);
        expect(useStore.getState().currentFps).toBe(25);
        expect(useStore.getState().isLowFps).toBe(true);
    });

    it('should update FPS and clear low FPS flag when FPS is good', () => {
        useStore.getState().setFps(60);
        expect(useStore.getState().currentFps).toBe(60);
        expect(useStore.getState().isLowFps).toBe(false);
    });

    it('should have correct initial FPS state', () => {
        const state = useStore.getState();
        expect(state.currentFps).toBeNull();
        expect(state.isLowFps).toBe(false);
    });
});
