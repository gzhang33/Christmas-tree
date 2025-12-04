import * as THREE from 'three';

export interface TextureAtlasResult {
    texture: THREE.CanvasTexture;
    rows: number;
    cols: number;
}

export const createTextureAtlas = async (urls: string[]): Promise<TextureAtlasResult> => {
    const count = urls.length;
    // Calculate grid dimensions (square-ish)
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    // Atlas resolution - power of 2 for better GPU support
    const size = 2048;
    const cellSize = size / Math.max(cols, rows);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    // Fill with transparent background
    ctx.clearRect(0, 0, size, size);

    const loadImage = (url: string) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                console.warn(`Failed to load image for atlas: ${url}`, e);
                // Resolve with empty image or placeholder to prevent failure
                resolve(new Image());
            };
            img.src = url;
        });
    };

    try {
        const images = await Promise.all(urls.map(loadImage));

        images.forEach((img, i) => {
            if (!img.width) return; // Skip failed loads

            const col = i % cols;
            const row = Math.floor(i / cols);

            // Canvas coordinates (0,0 is top-left)
            const x = col * cellSize;
            const y = row * cellSize;

            // Draw image to fill the cell (stretch/squash)
            // For photos, we might want to preserve aspect ratio and crop, 
            // but stretching ensures full coverage for the particle quad.
            // Given the "Polaroid" requirement, we might want to draw a frame here?
            // The story says "Apply 'Polaroid' frame effect (optional, or part of texture)".
            // Let's keep it simple for now: just the photo.

            ctx.save();

            // Optional: Add a white border for Polaroid effect
            const border = cellSize * 0.05;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y, cellSize, cellSize);

            // Draw photo inside border (Polaroid style: larger bottom border)
            const photoX = x + border;
            const photoY = y + border;
            const photoW = cellSize - border * 2;
            const photoH = cellSize - border * 3; // Extra space at bottom

            ctx.drawImage(img, photoX, photoY, photoW, photoH);

            ctx.restore();
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        // texture.flipY = false; // Match UV coordinate system if needed
        texture.needsUpdate = true;

        return { texture, rows, cols };
    } catch (error) {
        console.error('Error creating texture atlas:', error);
        // Return a fallback 1x1 texture
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 2;
        fallbackCanvas.height = 2;
        const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
        return { texture: fallbackTexture, rows: 1, cols: 1 };
    }
};

export const createSpriteAtlas = async (urls: string[]): Promise<TextureAtlasResult> => {
    const count = urls.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const size = 2048;
    const cellSize = size / Math.max(cols, rows);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    ctx.clearRect(0, 0, size, size);

    const loadImage = (url: string) => {
        return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                console.warn(`Failed to load sprite: ${url}`, e);
                resolve(new Image());
            };
            img.src = url;
        });
    };

    try {
        const images = await Promise.all(urls.map(loadImage));

        images.forEach((img, i) => {
            if (!img.width) return;

            const col = i % cols;
            const row = Math.floor(i / cols);

            const x = col * cellSize;
            const y = row * cellSize;

            // Draw image to fill the cell, preserving aspect ratio if possible, 
            // but for sprites we might want to just fit it in center
            const scale = Math.min(cellSize / img.width, cellSize / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const offsetX = (cellSize - w) / 2;
            const offsetY = (cellSize - h) / 2;

            ctx.drawImage(img, x + offsetX, y + offsetY, w, h);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        return { texture, rows, cols };
    } catch (error) {
        console.error('Error creating sprite atlas:', error);
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 2;
        fallbackCanvas.height = 2;
        const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);
        return { texture: fallbackTexture, rows: 1, cols: 1 };
    }
};
