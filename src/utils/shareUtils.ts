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
        const base64 = btoa(unescape(encodeURIComponent(json)));
        // 转换为 URL 安全格式：+ 换成 -，/ 换成 _，删除 =
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
        // Reverse URL safe replacements
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

        // Add padding if needed
        const padding = base64.length % 4;
        if (padding) {
            base64 += '='.repeat(4 - padding);
        }

        // Decode Base64 to percent-encoded string (to handle UTF-8 correctly)
        const binaryString = atob(base64);
        const json = decodeURIComponent(escape(binaryString));

        const data = JSON.parse(json);

        // Runtime Validation
        if (!data || typeof data !== 'object') {
            console.warn("Invalid share state: not an object");
            return null;
        }

        // Validate 'p' (photos) is REQUIRED and must be an array of strings
        if (!data.p || !Array.isArray(data.p) || data.p.some((item: any) => typeof item !== 'string')) {
            console.warn("Invalid share state: 'p' is missing or invalid (must be string[])");
            return null;
        }

        // Validate 'c' (color) is REQUIRED and must be a string
        if (data.c === undefined || data.c === null || typeof data.c !== 'string') {
            console.warn("Invalid share state: 'c' is missing or invalid (must be string)");
            return null;
        }

        // Validate 'cfg' (config) is OPTIONAL but if present must be an object
        if (data.cfg && (typeof data.cfg !== 'object' || Array.isArray(data.cfg))) {
            console.warn("Invalid share state: 'cfg' must be an object");
            return null;
        }

        return data as ShareableState;
    } catch (e) {
        console.error("Failed to decode share state", e);
        return null;
    }
};
