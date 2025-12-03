import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePhotos } from './usePhotos';

/**
 * Performance benchmark tests for usePhotos hook
 * These tests verify that the hook performs well under stress conditions.
 */
describe('usePhotos Performance Benchmarks', () => {
    beforeEach(() => {
        global.URL.createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
        global.URL.revokeObjectURL = vi.fn();
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

    // Helper to create multiple files
    const createFiles = (count: number, sizeKB: number = 1): File[] => {
        const content = new Array(sizeKB * 1024).fill('a').join('');
        return Array.from({ length: count }, (_, i) => 
            new File([content], `photo${i}.jpg`, { type: 'image/jpeg' })
        );
    };

    describe('Bulk Upload Performance', () => {
        it('should handle 100 files upload within acceptable time', () => {
            const { result } = renderHook(() => usePhotos());
            const files = createFiles(100);

            const startTime = performance.now();
            
            act(() => {
                result.current.addPhotos(createFileList(files));
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(result.current.photos).toHaveLength(100);
            // Should complete within 100ms
            expect(duration).toBeLessThan(100);
            console.log(`100 files upload: ${duration.toFixed(2)}ms`);
        });

        it('should handle 500 files upload within acceptable time', () => {
            const { result } = renderHook(() => usePhotos());
            const files = createFiles(500);

            const startTime = performance.now();
            
            act(() => {
                result.current.addPhotos(createFileList(files));
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(result.current.photos).toHaveLength(500);
            // Should complete within 500ms
            expect(duration).toBeLessThan(500);
            console.log(`500 files upload: ${duration.toFixed(2)}ms`);
        });
    });

    describe('Memory Management Performance', () => {
        it('should cleanup 100 URLs efficiently on unmount', () => {
            const { result, unmount } = renderHook(() => usePhotos());
            const files = createFiles(100);

            act(() => {
                result.current.addPhotos(createFileList(files));
            });

            const startTime = performance.now();
            unmount();
            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(100);
            // Cleanup should complete within 50ms
            expect(duration).toBeLessThan(50);
            console.log(`100 URLs cleanup: ${duration.toFixed(2)}ms`);
        });

        it('should handle rapid add/remove cycles', () => {
            const { result } = renderHook(() => usePhotos());
            
            const startTime = performance.now();
            
            // Simulate rapid add/remove cycles
            for (let i = 0; i < 50; i++) {
                act(() => {
                    result.current.addPhotos(createFileList([
                        new File([''], `photo${i}.jpg`, { type: 'image/jpeg' })
                    ]));
                });
                
                if (result.current.photos.length > 10) {
                    act(() => {
                        result.current.removePhoto(result.current.photos[0].id);
                    });
                }
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete within 200ms
            expect(duration).toBeLessThan(200);
            console.log(`50 add/remove cycles: ${duration.toFixed(2)}ms`);
            
            // Verify final state: after 50 iterations with removal logic,
            // count should be capped at 11 (first 11 adds, then add+remove cycles)
            expect(result.current.photos.length).toBeLessThanOrEqual(11);
        });
    });

    describe('Stress Tests', () => {
        it('should handle multiple sequential batch uploads', () => {
            const { result } = renderHook(() => usePhotos());
            
            const startTime = performance.now();
            
            // 10 batches of 50 files each
            for (let batch = 0; batch < 10; batch++) {
                act(() => {
                    result.current.addPhotos(createFileList(createFiles(50)));
                });
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(result.current.photos).toHaveLength(500);
            // Should complete within 500ms
            expect(duration).toBeLessThan(500);
            console.log(`10 batches x 50 files: ${duration.toFixed(2)}ms`);
        });

        it('should maintain performance with large accumulated photo list', () => {
            const { result } = renderHook(() => usePhotos());
            
            // Add 200 photos first
            act(() => {
                result.current.addPhotos(createFileList(createFiles(200)));
            });

            // Now measure adding more photos with large existing list
            const startTime = performance.now();
            
            act(() => {
                result.current.addPhotos(createFileList(createFiles(50)));
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            expect(result.current.photos).toHaveLength(250);
            // Adding 50 more should still be fast
            expect(duration).toBeLessThan(50);
            console.log(`Add 50 to existing 200: ${duration.toFixed(2)}ms`);
        });
    });
});

