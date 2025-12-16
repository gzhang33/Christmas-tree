/**
 * useUniversalParticleSystem Hook
 * 
 * Generates unified particle attributes for the Universal Particle System.
 * Handles both text sampling and spiral parameter calculation.
 * 
 * Output: BufferGeometry attributes for positions, colors, random seeds, spiralT, etc.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { LANDING_CONFIG } from '../config/landing';
import { PARTICLE_CONFIG } from '../config/particles';
import { useStore } from '../store/useStore';

interface TextParticleData {
    positions: Float32Array;
    spiralT: Float32Array;
    randoms: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    flickerPhases: Float32Array;
    types: Float32Array; // 1.0 = text particle, 0.0 = pure dust particle
    count: number;
}


interface UniversalParticleSystemConfig {
    title: string | readonly string[];
    username: string;
    dustColors?: readonly string[];
    lineSpacing?: number;
}

/**
 * Sample text pixels using OffscreenCanvas and generate particle positions
 */
function generateTextParticles(
    text: string,
    fontSize: number,
    fontFamily: string,
    density: number,
    worldWidth: number,
    yOffset: number
): TextParticleData {
    // Create offscreen canvas for text sampling
    const canvas = new OffscreenCanvas(1024, 256);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.warn('[UniversalParticleSystem] Failed to get 2D context');
        return {
            positions: new Float32Array(0),
            spiralT: new Float32Array(0),
            randoms: new Float32Array(0),
            colors: new Float32Array(0),
            sizes: new Float32Array(0),
            flickerPhases: new Float32Array(0),
            types: new Float32Array(0),
            count: 0
        };
    }

    // Setup text rendering
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;

    // Resize canvas to fit text
    canvas.width = Math.ceil(textWidth + 20);
    canvas.height = Math.ceil(textHeight + 20);

    // Re-setup after resize
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    // Draw text
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const particlePositions: number[] = [];
    const particleSpiralT: number[] = [];
    const particleRandoms: number[] = [];

    // Sample at density intervals
    for (let y = 0; y < canvas.height; y += density) {
        for (let x = 0; x < canvas.width; x += density) {
            const i = (y * canvas.width + x) * 4;
            const alpha = pixels[i + 3];

            if (alpha > 128) {
                // Convert canvas coords to world coords
                const worldX = ((x / canvas.width) - 0.5) * worldWidth;
                const worldY = ((0.5 - y / canvas.height) * (worldWidth * canvas.height / canvas.width)) + yOffset;
                const worldZ = 0;

                particlePositions.push(worldX, worldY, worldZ);

                // Assign random spiral T for reform phase (uniform distribution ensures even spiral coverage)
                particleSpiralT.push(Math.random());
                particleRandoms.push(Math.random());
            }
        }
    }

    const count = particlePositions.length / 3;
    const types = new Float32Array(count).fill(1.0); // All text particles are type 1.0

    return {
        positions: new Float32Array(particlePositions),
        spiralT: new Float32Array(particleSpiralT),
        randoms: new Float32Array(particleRandoms),
        colors: new Float32Array(count * 3), // Placeholder, will be filled with dust colors
        sizes: new Float32Array(count),      // Placeholder, will be filled with sizes
        flickerPhases: new Float32Array(count), // Placeholder
        types,
        count,
    };
}

/**
 * Generate particles for multi-line text (array of strings)
 * Each line is rendered vertically stacked with proper spacing
 */
function generateMultilineTextParticles(
    lines: string[],
    fontSize: number,
    fontFamily: string,
    density: number,
    worldWidth: number,
    yOffset: number,
    lineSpacing: number = 1.4
): TextParticleData {
    if (lines.length === 0) {
        return {
            positions: new Float32Array(0),
            spiralT: new Float32Array(0),
            randoms: new Float32Array(0),
            colors: new Float32Array(0),
            sizes: new Float32Array(0),
            flickerPhases: new Float32Array(0),
            types: new Float32Array(0),
            count: 0
        };
    }

    const allPositions: number[] = [];
    const allSpiralT: number[] = [];
    const allRandoms: number[] = [];

    // 1. Measure all lines to find the widest one for consistent scaling
    const tempCanvas = new OffscreenCanvas(1024, 256);
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return { count: 0 } as any;

    tempCtx.font = `${fontSize}px ${fontFamily}`;

    // Store metrics for each line
    const lineMetrics = lines.map(line => {
        const measured = tempCtx.measureText(line);
        const width = Math.ceil(measured.width + 20);
        const height = Math.ceil(fontSize * 1.2 + 20);
        return { text: line, width, height };
    });

    const maxLineWidth = Math.max(...lineMetrics.map(m => m.width));

    // Calculate global scale: how many World Units per Pixel
    // The widest line maps to 'worldWidth'
    const pixelToWorldScale = worldWidth / maxLineWidth;

    // Calculate World Height for a single line (based on font size)
    // We use the raw font height (fontSize * 1.2) converted to world units
    // Note: lineMetrics.height includes padding, so we use fontSize * 1.2 for layout
    const worldLineHeight = (fontSize * 1.2) * pixelToWorldScale;
    const worldLineSpacing = worldLineHeight * lineSpacing;

    // Calculate total height of the block in World Units
    // (lines - 1) * spacing + last line height
    const totalWorldHeight = (lines.length - 1) * worldLineSpacing;

    // Start Y (Top line center Y)
    // Center the block around yOffset
    // Top line Y = yOffset + half total height
    // Actually, let's stack from top to bottom
    const topY = yOffset + (totalWorldHeight / 2);

    // Generate particles
    lineMetrics.forEach((metrics, lineIndex) => {
        const lineText = metrics.text;

        // Setup canvas for this specific line
        const canvas = new OffscreenCanvas(metrics.width, metrics.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';

        ctx.fillText(lineText, canvas.width / 2, canvas.height / 2);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Calculate this line's world Y position
        // Index 0 is top
        const lineWorldY = topY - (lineIndex * worldLineSpacing);

        // Calculate this line's specific world width based on the global scale
        // This ensures font size stays consistent across lines
        const lineWorldWidth = metrics.width * pixelToWorldScale; // Incorrect logic if we map 0..1 to this
        // Correct logic:
        // x / canvas.width maps 0..1
        // We want 1.0 in canvas width space to equal lineWorldWidth in world space
        // So: ((x / width) - 0.5) * lineWorldWidth

        for (let y = 0; y < canvas.height; y += density) {
            for (let x = 0; x < canvas.width; x += density) {
                const i = (y * canvas.width + x) * 4;
                if (pixels[i + 3] > 128) {
                    // X: Standard mapping centered at 0
                    const worldX = ((x / canvas.width) - 0.5) * lineWorldWidth;

                    // Y: Relative to line center
                    // (0.5 - y/h) gives range [0.5, -0.5] relative to center
                    const localY = (0.5 - y / canvas.height) * (metrics.height * pixelToWorldScale);

                    const worldY = lineWorldY + localY;
                    const worldZ = 0;

                    allPositions.push(worldX, worldY, worldZ);
                    allSpiralT.push(Math.random());
                    allRandoms.push(Math.random());
                }
            }
        }
    });

    const count = allPositions.length / 3;
    const types = new Float32Array(count).fill(1.0); // All text particles are type 1.0

    return {
        positions: new Float32Array(allPositions),
        spiralT: new Float32Array(allSpiralT),
        randoms: new Float32Array(allRandoms),
        colors: new Float32Array(count * 3),
        sizes: new Float32Array(count),
        flickerPhases: new Float32Array(count),
        types,
        count,
    };
}

/**
 * Generate dust particle colors from MagicDust color palette
 */
function generateDustColors(
    count: number,
    baseColor: string,
): { colors: Float32Array; sizes: Float32Array; flickerPhases: Float32Array } {
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const flickerPhases = new Float32Array(count);

    const base = new THREE.Color(baseColor);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);

    // Create 3 variations: lighter, base, darker
    const colorVariations = [
        new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 0.8, 1), Math.min(hsl.l + 0.2, 0.95)), // Lighter
        base.clone(), // Base
        new THREE.Color().setHSL(hsl.h, Math.min(hsl.s * 1.2, 1), Math.max(hsl.l - 0.1, 0.2)), // Darker
    ];

    const minSize = PARTICLE_CONFIG.magicDust.minSize;
    const maxSize = PARTICLE_CONFIG.magicDust.maxSize;

    for (let i = 0; i < count; i++) {
        // Color choice with weighted distribution
        const colorChoice = Math.random();
        let c: THREE.Color;
        if (colorChoice < 0.3) c = colorVariations[0];
        else if (colorChoice < 0.7) c = colorVariations[1];
        else c = colorVariations[2];

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;

        // Size variation
        sizes[i] = minSize + Math.random() * (maxSize - minSize);

        // Flicker phase
        flickerPhases[i] = Math.random() * Math.PI * 2;
    }

    return { colors, sizes, flickerPhases };
}

/**
 * Hook that generates unified particle attributes for the universal particle system
 */
export function useUniversalParticleSystem({
    title,
    username,
    dustColors = PARTICLE_CONFIG.magicDust.colors,
}: UniversalParticleSystemConfig) {
    const { viewport } = useThree();

    // Get global particle count from store for ratio-based calculation
    const globalParticleCount = useStore((state) => state.particleCount);

    // Calculate dust particle count based on config ratios (matching original MagicDust)
    // Formula: Math.max(particleCount * ratio, minCount) * 6 (trail density multiplier)
    const dustParticleCount = Math.floor(
        Math.max(
            globalParticleCount * PARTICLE_CONFIG.ratios.magicDust,
            PARTICLE_CONFIG.minCounts.magicDust,
        ) * 6 // *6 for trail density, matching original MagicDust
    );

    // Responsive config detection
    const isMobile = viewport.width < 10;
    const config = LANDING_CONFIG.textParticle;
    const density = isMobile ? config.density.compact : config.density.normal;
    const worldWidth = isMobile ? config.layout.worldWidth.compact : config.layout.worldWidth.normal;

    const attributes = useMemo(() => {
        const fontFamily = config.typography.titleFont;
        const fontSize = config.typography.samplingFontSize;
        const lineSpacing = config.text.lineSpacing;

        // Generate title particles - use multiline or single line based on title type
        let titleData: TextParticleData;
        if (typeof title === 'string') {
            // Single line mode (desktop)
            titleData = generateTextParticles(
                title,
                fontSize,
                fontFamily,
                density,
                worldWidth,
                config.layout.titleY
            );
        } else {
            // Multi-line mode (mobile) - title is readonly string[]
            titleData = generateMultilineTextParticles(
                [...title], // Convert readonly array to mutable for iteration
                fontSize,
                fontFamily,
                density,
                worldWidth,
                config.layout.titleY,
                lineSpacing
            );
        }


        // Generate username particles - REMOVED per request
        /*
        const usernameData = generateTextParticles(
            username,
            fontSize * config.typography.usernameScale,
            config.typography.usernameFont,
            density,
            worldWidth * 0.6,
            config.layout.usernameY
        );
        */


        // Calculate total particle count: max of text particles and dust requirements
        // Use the ratio-based dust count for proper density matching MagicDust
        // Calculate total particle count: max of text particles and dust requirements
        // Use the ratio-based dust count for proper density matching MagicDust
        const textParticleCount = titleData.count;

        const totalCount = Math.max(textParticleCount, dustParticleCount);

        // Allocate combined arrays
        const allPositions = new Float32Array(totalCount * 3);
        const allSpiralT = new Float32Array(totalCount);
        const allRandoms = new Float32Array(totalCount);
        const allTypes = new Float32Array(totalCount);

        // Copy title particles
        allPositions.set(titleData.positions, 0);
        allSpiralT.set(titleData.spiralT, 0);
        allRandoms.set(titleData.randoms, 0);
        allTypes.set(titleData.types, 0);

        // Copy username particles - REMOVED
        /*
        allPositions.set(usernameData.positions, titleData.count * 3);
        allSpiralT.set(usernameData.spiralT, titleData.count);
        allRandoms.set(usernameData.randoms, titleData.count);
        allTypes.set(usernameData.types, titleData.count);
        */


        // Fill extra particles (if totalCount > textParticleCount)
        // These particles must start "hidden" in the cloud area to prevent bottom-up artifact
        for (let i = textParticleCount; i < totalCount; i++) {
            // Random position generally matching text area (scattered cloud)
            // Instead of -100, we place them around the visible center
            allPositions[i * 3] = (Math.random() - 0.5) * 20;      // X: +/- 10
            allPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;  // Y: +/- 5 (Center screen)
            allPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;  // Z: +/- 5

            // Uniform spiralT distribution for even dust coverage
            allSpiralT[i] = i / totalCount;
            allRandoms[i] = Math.random();
            allTypes[i] = 0.0; // Extra particle
        }

        // Generate dust colors and sizes for all particles
        const dustColor = dustColors[1] || dustColors[0] || PARTICLE_CONFIG.magicDust.colors[1] || '#b150e4';
        const { colors, sizes, flickerPhases } = generateDustColors(totalCount, dustColor);

        console.log(`[UniversalParticleSystem] Generated ${totalCount} particles (title: ${titleData.count}, dust budget: ${dustParticleCount})`);


        return {
            positions: allPositions,
            spiralT: allSpiralT,
            randoms: allRandoms,
            colors,
            sizes,
            flickerPhases,
            types: allTypes,
            count: totalCount,
            textParticleCount, // Track how many are from text (vs extra dust particles)
        };
    }, [title, density, worldWidth, config.layout.titleY, dustColors, dustParticleCount]);

    return attributes;
}

export type UniversalParticleAttributes = ReturnType<typeof useUniversalParticleSystem>;
