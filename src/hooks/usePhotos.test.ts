import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePhotos } from './usePhotos';

describe('usePhotos', () => {
    it('should initialize with empty photos', () => {
        const { result } = renderHook(() => usePhotos());
        expect(result.current.photos).toEqual([]);
    });

    it('should add photos and create object URLs', () => {
        const { result } = renderHook(() => usePhotos());

        // Mock URL.createObjectURL
        const createObjectURL = vi.fn(() => 'blob:test-url');
        global.URL.createObjectURL = createObjectURL;

        const file = new File([''], 'test.png', { type: 'image/png' });
        const fileList = {
            0: file,
            length: 1,
            item: (index: number) => file,
            [Symbol.iterator]: function* () { yield file; }
        } as unknown as FileList;

        act(() => {
            result.current.addPhotos(fileList);
        });

        expect(result.current.photos).toHaveLength(1);
        expect(result.current.photos[0].url).toBe('blob:test-url');
        expect(createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should revoke object URLs on unmount', () => {
        const revokeObjectURL = vi.fn();
        global.URL.revokeObjectURL = revokeObjectURL;
        global.URL.createObjectURL = vi.fn(() => 'blob:test-url');

        const { result, unmount } = renderHook(() => usePhotos());

        const file = new File([''], 'test.png', { type: 'image/png' });
        const fileList = {
            0: file,
            length: 1,
            item: () => file,
            [Symbol.iterator]: function* () { yield file; }
        } as unknown as FileList;

        act(() => {
            result.current.addPhotos(fileList);
        });

        unmount();

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });
});
