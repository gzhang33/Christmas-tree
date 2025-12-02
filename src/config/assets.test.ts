import { describe, it, expect } from 'vitest';
import { ASSETS } from './assets';

describe('Assets Configuration', () => {
    it('should export ASSETS array', () => {
        expect(Array.isArray(ASSETS)).toBe(true);
        expect(ASSETS.length).toBeGreaterThan(0);
    });

    it('should have valid asset structure', () => {
        ASSETS.forEach(asset => {
            expect(asset).toHaveProperty('id');
            expect(asset).toHaveProperty('type');
            expect(asset).toHaveProperty('url');
            if (asset.type === 'video') {
                expect(asset).toHaveProperty('videoUrl');
            }
        });
    });
});
