import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotos } from './usePhotos';

/**
 * Integration tests for usePhotos hook
 * Tests the complete photo upload flow including multiple files,
 * removal, and cleanup scenarios.
 */
describe('usePhotos Integration Tests', () => {
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        createObjectURLMock = vi.fn((file: File) => `blob:${file.name}`);
        revokeObjectURLMock = vi.fn();
        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = revokeObjectURLMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

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

    describe('Multiple File Upload Flow', () => {
        it('should handle uploading multiple files at once', () => {
            const { result } = renderHook(() => usePhotos());

            const files = [
                new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
                new File(['content2'], 'photo2.png', { type: 'image/png' }),
                new File(['content3'], 'photo3.gif', { type: 'image/gif' }),
            ];

            act(() => {
                result.current.addPhotos(createFileList(files));
            });

            expect(result.current.photos).toHaveLength(3);
            expect(createObjectURLMock).toHaveBeenCalledTimes(3);
            expect(result.current.photos[0].url).toBe('blob:photo1.jpg');
            expect(result.current.photos[1].url).toBe('blob:photo2.png');
            expect(result.current.photos[2].url).toBe('blob:photo3.gif');
        });

        it('should handle multiple upload batches', () => {
            const { result } = renderHook(() => usePhotos());

            // First batch
            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'batch1-photo1.jpg', { type: 'image/jpeg' }),
                ]));
            });

            expect(result.current.photos).toHaveLength(1);

            // Second batch
            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'batch2-photo1.jpg', { type: 'image/jpeg' }),
                    new File([''], 'batch2-photo2.jpg', { type: 'image/jpeg' }),
                ]));
            });

            expect(result.current.photos).toHaveLength(3);
            expect(createObjectURLMock).toHaveBeenCalledTimes(3);
        });
    });

    describe('Photo Removal Flow', () => {
        it('should remove a single photo and cleanup its URL', () => {
            const { result } = renderHook(() => usePhotos());

            // Add photos
            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
                ]));
            });

            const photoToRemove = result.current.photos[0];

            // Remove first photo
            act(() => {
                result.current.removePhoto(photoToRemove.id);
            });

            expect(result.current.photos).toHaveLength(1);
            expect(result.current.photos[0].url).toBe('blob:photo2.jpg');
            expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:photo1.jpg');
        });

        it('should handle removing non-existent photo gracefully', () => {
            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
                ]));
            });

            // Try to remove non-existent photo
            act(() => {
                result.current.removePhoto('non-existent-id');
            });

            // Should not crash and photos should remain unchanged
            expect(result.current.photos).toHaveLength(1);
            expect(revokeObjectURLMock).not.toHaveBeenCalled();
        });

        it('should remove all photos when clearPhotos is called', () => {
            const { result } = renderHook(() => usePhotos());

            // Add multiple photos
            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo3.jpg', { type: 'image/jpeg' }),
                ]));
            });

            expect(result.current.photos).toHaveLength(3);

            // Clear all
            act(() => {
                result.current.clearPhotos();
            });

            expect(result.current.photos).toHaveLength(0);
            expect(revokeObjectURLMock).toHaveBeenCalledTimes(3);
        });
    });

    describe('Memory Cleanup Scenarios', () => {
        it('should cleanup all URLs on unmount after multiple operations', () => {
            const { result, unmount } = renderHook(() => usePhotos());

            // Add photos
            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo2.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo3.jpg', { type: 'image/jpeg' }),
                ]));
            });

            // Remove one photo (should cleanup that URL)
            const removedPhotoUrl = result.current.photos[0].url;
            act(() => {
                result.current.removePhoto(result.current.photos[0].id);
            });

            expect(revokeObjectURLMock).toHaveBeenCalledWith(removedPhotoUrl);
            revokeObjectURLMock.mockClear();

            // Unmount should cleanup remaining URLs
            unmount();

            // Should cleanup the 2 remaining URLs
            expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);
        });

        it('should not double-cleanup URLs', () => {
            const { result, unmount } = renderHook(() => usePhotos());

            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo1.jpg', { type: 'image/jpeg' }),
                ]));
            });

            // Clear photos (cleans up URL)
            act(() => {
                result.current.clearPhotos();
            });

            expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
            revokeObjectURLMock.mockClear();

            // Unmount should not cleanup again (URL already revoked)
            unmount();

            // No additional cleanup calls
            expect(revokeObjectURLMock).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty FileList', () => {
            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.addPhotos(createFileList([]));
            });

            expect(result.current.photos).toHaveLength(0);
            expect(createObjectURLMock).not.toHaveBeenCalled();
        });

        it('should generate unique IDs for each photo', () => {
            const { result } = renderHook(() => usePhotos());

            act(() => {
                result.current.addPhotos(createFileList([
                    new File([''], 'photo.jpg', { type: 'image/jpeg' }),
                    new File([''], 'photo.jpg', { type: 'image/jpeg' }), // Same filename
                ]));
            });

            const ids = result.current.photos.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(2); // All IDs should be unique
        });
    });
});

