/**
 * Web Worker for Photo Position Generation
 * 
 * Offloads the heavy initial calculation of photo positions to a background thread
 * to prevent blocking the main thread during component mounting.
 */
import { generatePhotoPositions } from '../config/photoConfig';

// Handle messages from the main thread
self.onmessage = (e: MessageEvent) => {
    const { count, aspectRatio } = e.data;

    // Perform the heavy calculation
    const positions = generatePhotoPositions(count, aspectRatio);

    // Send result back to main thread
    self.postMessage(positions);
};
