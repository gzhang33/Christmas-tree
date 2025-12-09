/**
 * Web Worker for Photo Position Generation
 * 
 * Offloads the heavy initial calculation of photo positions to a background thread
 * to prevent blocking the main thread during component mounting.
 */
import { generatePhotoPositions } from '../config/photoConfig';

// Handle messages from the main thread
self.onmessage = (e: MessageEvent) => {
    try {
        const { count, aspectRatio } = e.data;

        // Input validation
        if (typeof count !== 'number' || !isFinite(count) || count <= 0) {
            throw new Error('Invalid count: must be a positive number');
        }
        if (typeof aspectRatio !== 'number' || !isFinite(aspectRatio) || aspectRatio <= 0) {
            throw new Error('Invalid aspectRatio: must be a positive number');
        }

        // Perform the heavy calculation
        const positions = generatePhotoPositions(count, aspectRatio);

        // Send success result back to main thread
        self.postMessage({ success: true, positions });
    } catch (error: any) {
        // Send error result back to main thread
        self.postMessage({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
