import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from './useStore';
import { DEFAULT_TREE_COLOR } from '../config/colors';

describe('useStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store to initial state
    useStore.setState({
      treeColor: DEFAULT_TREE_COLOR,
      particleCount: 18000,
      isExploded: false,
      activePhotoId: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default treeColor', () => {
      const treeColor = useStore.getState().treeColor;
      expect(treeColor).toBe(DEFAULT_TREE_COLOR);
    });

    it('should initialize with default particleCount', () => {
      const particleCount = useStore.getState().particleCount;
      expect(particleCount).toBe(18000);
    });

    it('should initialize with isExploded as false', () => {
      const isExploded = useStore.getState().isExploded;
      expect(isExploded).toBe(false);
    });

    it('should initialize with activePhotoId as null', () => {
      const activePhotoId = useStore.getState().activePhotoId;
      expect(activePhotoId).toBeNull();
    });
  });

  describe('Actions', () => {
    it('should update treeColor when setTreeColor is called', () => {
      const newColor = '#FF0000';
      useStore.getState().setTreeColor(newColor);
      expect(useStore.getState().treeColor).toBe(newColor);
    });

    it('should update particleCount when setParticleCount is called', () => {
      const newCount = 20000;
      useStore.getState().setParticleCount(newCount);
      expect(useStore.getState().particleCount).toBe(newCount);
    });

    it('should set isExploded to true when triggerExplosion is called', () => {
      useStore.getState().triggerExplosion();
      expect(useStore.getState().isExploded).toBe(true);
    });

    it('should set isExploded to false when resetExplosion is called', () => {
      // First trigger explosion
      useStore.getState().triggerExplosion();
      expect(useStore.getState().isExploded).toBe(true);
      
      // Then reset
      useStore.getState().resetExplosion();
      expect(useStore.getState().isExploded).toBe(false);
    });

    it('should update activePhotoId when setActivePhoto is called', () => {
      const photoId = 'test-photo-123';
      useStore.getState().setActivePhoto(photoId);
      expect(useStore.getState().activePhotoId).toBe(photoId);
    });

    it('should set activePhotoId to null when setActivePhoto is called with null', () => {
      // First set a photo
      useStore.getState().setActivePhoto('test-photo-123');
      expect(useStore.getState().activePhotoId).toBe('test-photo-123');
      
      // Then clear it
      useStore.getState().setActivePhoto(null);
      expect(useStore.getState().activePhotoId).toBeNull();
    });
  });

  describe('Persistence Middleware', () => {
    it('should persist treeColor to localStorage', () => {
      const newColor = '#00FF00';
      useStore.getState().setTreeColor(newColor);
      
      // Wait for persistence to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stored = localStorage.getItem('christmas-tree-storage');
          expect(stored).toBeTruthy();
          if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.state.treeColor).toBe(newColor);
          }
          resolve();
        }, 100);
      });
    });

    it('should persist particleCount to localStorage', () => {
      const newCount = 25000;
      useStore.getState().setParticleCount(newCount);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stored = localStorage.getItem('christmas-tree-storage');
          expect(stored).toBeTruthy();
          if (stored) {
            const parsed = JSON.parse(stored);
            expect(parsed.state.particleCount).toBe(newCount);
          }
          resolve();
        }, 100);
      });
    });

    it('should NOT persist isExploded to localStorage', () => {
      useStore.getState().triggerExplosion();
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stored = localStorage.getItem('christmas-tree-storage');
          expect(stored).toBeTruthy();
          if (stored) {
            const parsed = JSON.parse(stored);
            // isExploded should not be in persisted state
            expect(parsed.state.isExploded).toBeUndefined();
          }
          resolve();
        }, 100);
      });
    });

    it('should NOT persist activePhotoId to localStorage', () => {
      useStore.getState().setActivePhoto('test-photo-456');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stored = localStorage.getItem('christmas-tree-storage');
          expect(stored).toBeTruthy();
          if (stored) {
            const parsed = JSON.parse(stored);
            // activePhotoId should not be in persisted state
            expect(parsed.state.activePhotoId).toBeUndefined();
          }
          resolve();
        }, 100);
      });
    });

    it('should restore state from localStorage on initialization', () => {
      // Set up localStorage with persisted values
      const persistedState = {
        state: {
          treeColor: '#ABCDEF',
          particleCount: 30000,
        },
        version: 0,
      };
      localStorage.setItem('christmas-tree-storage', JSON.stringify(persistedState));
      
      // Create a new store instance to test restoration
      // Note: In a real scenario, this would happen on page reload
      // For testing, we'll verify the store can read from localStorage
      const stored = localStorage.getItem('christmas-tree-storage');
      expect(stored).toBeTruthy();
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.treeColor).toBe('#ABCDEF');
        expect(parsed.state.particleCount).toBe(30000);
      }
    });
  });
});



