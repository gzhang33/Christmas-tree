import { AppConfig, PhotoData } from '../types';

export interface ShareableState {
    p: string[]; // photo urls
    c: string;   // tree color
    cfg: Partial<AppConfig>; // config
}

/**
 * Encodes the current application state into a Base64 string
 */
export const encodeState = (
    photos: PhotoData[],
    treeColor: string,
    config: AppConfig
): string => {
    const state: ShareableState = {
        p: photos.map(photo => photo.url),
        c: treeColor,
        cfg: {
            // Only save non-default looking config if needed, or save all
            rotationSpeed: config.rotationSpeed,
            snowDensity: config.snowDensity,
            photoSize: config.photoSize
        }
    };

    try {
        const json = JSON.stringify(state);
        return btoa(json);
    } catch (e) {
        console.error("Failed to encode state", e);
        return "";
    }
};

/**
 * Decodes the shared state from a query string
 */
export const decodeState = (encoded: string): ShareableState | null => {
    try {
        const json = atob(encoded);
        return JSON.parse(json);
    } catch (e) {
        console.error("Failed to decode share state", e);
        return null;
    }
};
