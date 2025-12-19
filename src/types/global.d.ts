/**
 * Global type declarations for the Christmas Tree application
 * 
 * This file augments global interfaces and types used throughout the application.
 */

// Augment the Window interface with custom properties
declare global {
    interface Window {
        /**
         * Flag indicating whether the application is currently in the background.
         * Used for performance optimization on iOS and other platforms.
         * When true, resource-intensive operations should be paused.
         */
        __IS_BACKGROUND__?: boolean;
    }
}

// Export empty object to make this a module
// This is required for TypeScript to recognize the global augmentation
export { };
