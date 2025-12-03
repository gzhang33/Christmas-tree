import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotos } from './usePhotos';

describe('usePhotos', () => {
    // Helper to create mock FileList
    const createFileList = (files: File[]): FileList => {
        return {
            ...files,
            length: files.length,
            item: (index: number) => files[index] || null,
            [Symbol.iterator]: function* () {
                for (const file of files) yield file;
            },
        } as unknown as FileList;
    };

    beforeEach(() => {
        global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with empty photos', () => {
        const { result } = renderHook(() => usePhotos());
        expect(result.current.photos).toEqual([]);
    });

    it('should add photos and create object URLs', () => {
        const { result } = renderHook(() => usePhotos());

        const file = new File([''], 'test.png', { type: 'image/png' });

        act(() => {
            result.current.addPhotos(createFileList([file]));
        });

        expect(result.current.photos).toHaveLength(1);
        expect(result.current.photos[0].url).toBe('blob:test-url');
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should revoke object URLs on unmount', () => {
        const { result, unmount } = renderHook(() => usePhotos());

        const file = new File([''], 'test.png', { type: 'image/png' });

        act(() => {
            result.current.addPhotos(createFileList([file]));
        });

        unmount();

        expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    describe('Error Handling', () => {
        it('should handle createObjectURL throwing an error', () => {
            global.URL.createObjectURL = vi.fn(() => {
                throw new Error('Quota exceeded');
            });

            const { result } = renderHook(() => usePhotos());
            const file = new File([''], 'test.png', { type: 'image/png' });

            // Should not crash the app
            expect(() => {
                act(() => {
                    result.current.addPhotos(createFileList([file]));
                });
            }).toThrow('Quota exceeded');
        });

        it('should handle files with special characters in name', () => {
            const { result } = renderHook(() => usePhotos());
            const file = new File([''], '照片 (1).png', { type: 'image/png' });

            act(() => {
                result.current.addPhotos(createFileList([file]));
            });

            expect(result.current.photos).toHaveLength(1);
        });

        it('should handle very large file names', () => {
            const { result } = renderHook(() => usePhotos());
            const longName = 'a'.repeat(500) + '.png';
            const file = new File([''], longName, { type: 'image/png' });

            act(() => {
                result.current.addPhotos(createFileList([file]));
            });

            expect(result.current.photos).toHaveLength(1);
        });

        it('should handle files with no extension', () => {
            const { result } = renderHook(() => usePhotos());
            const file = new File(['content'], 'noextension', { type: 'image/png' });

            act(() => {
                result.current.addPhotos(createFileList([file]));
            });

            expect(result.current.photos).toHaveLength(1);
        });

        it('should handle empty file (0 bytes)', () => {
            const { result } = renderHook(() => usePhotos());
            const file = new File([], 'empty.png', { type: 'image/png' });

            act(() => {
                result.current.addPhotos(createFileList([file]));
            });

            expect(result.current.photos).toHaveLength(1);
        });
    });

    describe('removePhoto', () => {
        it('should remove photo by id and cleanup URL', () => {
            const { result } = renderHook(() => usePhotos());
            const file = new File([''], 'test.png', { type: 'image/png' });

            act(() => {
                result.current.addPhotos(createFileList([file]));
            });

            const photoId = result.current.photos[0].id;

            act(() => {
                result.current.removePhoto(photoId);
            });

            expect(result.current.photos).toHaveLength(0);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
        });

        it('should not crash when removing non-existent photo', () => {
            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.removePhoto('non-existent-id');
            });

            expect(result.current.photos).toHaveLength(0);
            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });

    describe('clearPhotos', () => {
        it('should clear all photos and cleanup all URLs', () => {
            global.URL.createObjectURL = vi.fn()
                .mockReturnValueOnce('blob:url1')
                .mockReturnValueOnce('blob:url2');

            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'test1.png', { type: 'image/png' }),
                    new File([''], 'test2.png', { type: 'image/png' }),
                ]));
            });

            expect(result.current.photos).toHaveLength(2);

            act(() => {
                result.current.clearPhotos();
            });

            expect(result.current.photos).toHaveLength(0);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
        });

        it('should handle clearing empty photos array', () => {
            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.clearPhotos();
            });

            expect(result.current.photos).toHaveLength(0);
            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
        });
    });
});
