/**
 * Text Particle Generator
 * 
 * Converts 2D text into 3D particle positions for the unified particle system.
 * The generated positions are in Three.js world coordinates, centered and scaled
 * to fit within the camera frustum.
 * 
 * @module utils/textParticleGenerator
 */

export interface TextParticleOptions {
    /** Text to render */
    text: string;
    /** Font family (must be loaded) */
    fontFamily: string;
    /** Font size in pixels (for canvas sampling) */
    fontSize: number;
    /** Sampling density (1 = every pixel, 2 = every 2 pixels) */
    density: number;
    /** Target width in world units (default: 20) */
    worldWidth: number;
    /** Z offset from camera (default: 5) */
    zOffset: number;
    /** Y offset in world space (default: 0) */
    yOffset: number;
}

export interface TextParticleResult {
    /** Float32Array of positions [x,y,z, x,y,z, ...] */
    positions: Float32Array;
    /** Number of particles generated */
    count: number;
    /** Bounding box in world space */
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}

const DEFAULT_OPTIONS: Partial<TextParticleOptions> = {
    fontFamily: "'Merry Christmas Flake', 'Great Vibes', serif",
    fontSize: 120,
    density: 3,
    worldWidth: 20,
    zOffset: 5,
    yOffset: 0,
};

/**
 * Generates 3D particle positions from text
 * 
 * Process:
 * 1. Render text to 2D canvas
 * 2. Sample visible pixels at given density
 * 3. Convert pixel coordinates to world space
 * 4. Center and scale to fit worldWidth
 * 
 * @param options - Text rendering and sampling options
 * @returns TextParticleResult with positions and metadata
 */
export function generateTextParticles(options: Partial<TextParticleOptions>): TextParticleResult {
    const config: TextParticleOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
        text: options.text || '',
    } as TextParticleOptions;
    if (!config.text) {
        return { positions: new Float32Array(0), count: 0, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    }

    // Create offscreen canvas for text sampling
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error('[TextParticleGenerator] Failed to get 2D context');
        return { positions: new Float32Array(0), count: 0, bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
    }

    // Calculate canvas size based on text
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    const textMetrics = ctx.measureText(config.text);
    const textWidth = textMetrics.width;
    const textHeight = config.fontSize * 1.3; // Approximate height with descenders

    // Set canvas size with padding
    const padding = config.fontSize * 0.2;
    canvas.width = Math.ceil(textWidth + padding * 2);
    canvas.height = Math.ceil(textHeight + padding * 2);

    // Render text
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(config.text, padding, padding);

    // Sample pixels and collect positions
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tempPositions: number[] = [];

    for (let y = 0; y < canvas.height; y += config.density) {
        for (let x = 0; x < canvas.width; x += config.density) {
            const index = (y * canvas.width + x) * 4;
            const alpha = imageData.data[index + 3];

            // Only include visible pixels
            if (alpha > 128) {
                tempPositions.push(x, y);
            }
        }
    }

    // Convert to 3D world coordinates
    const particleCount = tempPositions.length / 2;
    const positions = new Float32Array(particleCount * 3);

    // Calculate scale factor to fit worldWidth
    const scale = config.worldWidth / canvas.width;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Calculate world bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < particleCount; i++) {
        const px = tempPositions[i * 2];
        const py = tempPositions[i * 2 + 1];

        // Convert to centered world coordinates
        // X: left-to-right maps to -width/2 to +width/2
        // Y: top-to-bottom maps to +height/2 to -height/2 (flip for 3D)
        const worldX = (px - centerX) * scale;
        const worldY = (centerY - py) * scale + config.yOffset;
        const worldZ = config.zOffset;

        positions[i * 3] = worldX;
        positions[i * 3 + 1] = worldY;
        positions[i * 3 + 2] = worldZ;

        // Update bounds
        minX = Math.min(minX, worldX);
        maxX = Math.max(maxX, worldX);
        minY = Math.min(minY, worldY);
        maxY = Math.max(maxY, worldY);
    }

    // If no particles, set default bounds
    if (particleCount === 0) {
        minX = maxX = minY = maxY = 0;
    }

    return {
        positions,
        count: particleCount,
        bounds: { minX, maxX, minY, maxY },
    };
}

/**
 * Generates particles for multi-line text (e.g., "Merry\nChristmas\n[UserName]")
 * 
 * @param lines - Array of text lines
 * @param options - Base options (applied to all lines)
 * @returns Combined TextParticleResult
 */
export function generateMultiLineTextParticles(
    lines: string[],
    options: Partial<TextParticleOptions> = {}
): TextParticleResult {
    const config = { ...DEFAULT_OPTIONS, ...options } as TextParticleOptions;

    // Calculate total height and generate each line
    const lineHeight = config.fontSize * 1.2;
    const totalHeight = lineHeight * lines.length;
    const startY = totalHeight / 2;

    const allPositions: number[] = [];
    let overallMinX = Infinity, overallMaxX = -Infinity;
    let overallMinY = Infinity, overallMaxY = -Infinity;

    lines.forEach((line, index) => {
        const yOffset = startY - (index + 0.5) * lineHeight;

        const result = generateTextParticles({
            ...config,
            text: line,
            yOffset: yOffset + (config.yOffset || 0),
        });

        // Append positions
        for (let i = 0; i < result.positions.length; i++) {
            allPositions.push(result.positions[i]);
        }

        // Update bounds
        overallMinX = Math.min(overallMinX, result.bounds.minX);
        overallMaxX = Math.max(overallMaxX, result.bounds.maxX);
        overallMinY = Math.min(overallMinY, result.bounds.minY);
        overallMaxY = Math.max(overallMaxY, result.bounds.maxY);
    });

    return {
        positions: new Float32Array(allPositions),
        count: allPositions.length / 3,
        bounds: {
            minX: overallMinX,
            maxX: overallMaxX,
            minY: overallMinY,
            maxY: overallMaxY,
        },
    };
}

/**
 * Pads particle positions array to match target count
 * Extra particles are distributed randomly within existing bounds
 * 
 * @param result - Original particle result
 * @param targetCount - Target number of particles
 * @returns New Float32Array with padded positions
 */
export function padParticlePositions(
    result: TextParticleResult,
    targetCount: number
): Float32Array {
    if (result.count >= targetCount) {
        return result.positions;
    }

    // If original result is empty, return random positions near origin
    if (result.count === 0) {
        const padded = new Float32Array(targetCount * 3);
        for (let i = 0; i < targetCount; i++) {
            padded[i * 3] = (Math.random() - 0.5) * 10;
            padded[i * 3 + 1] = (Math.random() - 0.5) * 10;
            padded[i * 3 + 2] = 5 + Math.random() * 2;
        }
        return padded;
    }

    const padded = new Float32Array(targetCount * 3);

    // Copy existing positions
    padded.set(result.positions);

    // Fill remaining with hidden positions (far away or randomized within bounds)
    const { minX, maxX, minY, maxY } = result.bounds;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    for (let i = result.count; i < targetCount; i++) {
        // Randomly distribute extra particles within text bounds
        // These will be made transparent in the shader
        padded[i * 3] = minX + Math.random() * rangeX;
        padded[i * 3 + 1] = minY + Math.random() * rangeY;
        padded[i * 3 + 2] = 5 + Math.random() * 2; // Slight Z variation
    }

    return padded;
}

/**
 * Creates entrance animation start positions (above screen)
 * 
 * @param targetPositions - Final text positions
 * @param spreadHeight - How far above screen to start (default: 50)
 * @returns Float32Array of start positions
 */
export function createEntranceStartPositions(
    targetPositions: Float32Array,
    spreadHeight: number = 50
): Float32Array {
    const count = targetPositions.length / 3;
    const startPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const targetX = targetPositions[i * 3];
        const targetZ = targetPositions[i * 3 + 2];

        // Start position: same X, random high Y, same Z
        startPositions[i * 3] = targetX + (Math.random() - 0.5) * 5; // Slight X spread
        startPositions[i * 3 + 1] = spreadHeight + Math.random() * spreadHeight; // High above
        startPositions[i * 3 + 2] = targetZ + (Math.random() - 0.5) * 3; // Slight Z spread
    }

    return startPositions;
}
