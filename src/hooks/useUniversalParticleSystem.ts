/**
 * useUniversalParticleSystem Hook
 * 
 * Generates unified particle attributes for the Universal Particle System.
 * Handles both text sampling and spiral parameter calculation.
 * 
 * Output: BufferGeometry attributes for positions, colors, random seeds, spiralT, etc.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { LANDING_CONFIG } from '../config/landing';
import { PARTICLE_CONFIG } from '../config/particles';
import { useStore } from '../store/useStore';
import { getResponsiveValue } from '../utils/responsiveUtils';

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
 * PERF: Pre-allocates arrays and uses typed arrays directly to reduce memory churn
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
    const canvasWidth = Math.ceil(textWidth + 20);
    const canvasHeight = Math.ceil(textHeight + 20);
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Re-setup after resize
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';

    // Draw text
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

    // Sample pixels
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = imageData.data;

    // PERF: First pass - count particles
    let particleCount = 0;
    for (let y = 0; y < canvasHeight; y += density) {
        for (let x = 0; x < canvasWidth; x += density) {
            const i = (y * canvasWidth + x) * 4;
            if (pixels[i + 3] > 128) {
                particleCount++;
            }
        }
    }

    // PERF: Pre-allocate typed arrays with exact size
    const positions = new Float32Array(particleCount * 3);
    const spiralT = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);

    // Second pass - fill arrays
    let idx = 0;
    for (let y = 0; y < canvasHeight; y += density) {
        for (let x = 0; x < canvasWidth; x += density) {
            const i = (y * canvasWidth + x) * 4;
            if (pixels[i + 3] > 128) {
                // Convert canvas coords to world coords
                const worldX = ((x / canvasWidth) - 0.5) * worldWidth;
                const worldY = ((0.5 - y / canvasHeight) * (worldWidth * canvasHeight / canvasWidth)) + yOffset;

                positions[idx * 3] = worldX;
                positions[idx * 3 + 1] = worldY;
                positions[idx * 3 + 2] = 0; // worldZ

                spiralT[idx] = Math.random();
                randoms[idx] = Math.random();
                idx++;
            }
        }
    }

    const types = new Float32Array(particleCount).fill(1.0);

    return {
        positions,
        spiralT,
        randoms,
        colors: new Float32Array(particleCount * 3),
        sizes: new Float32Array(particleCount),
        flickerPhases: new Float32Array(particleCount),
        types,
        count: particleCount,
    };
}

/**
 * Generate particles for multi-line text (array of strings)
 * Each line is rendered vertically stacked with proper spacing
 * PERF: Uses two-pass approach to pre-allocate arrays
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
    const pixelToWorldScale = worldWidth / maxLineWidth;
    const worldLineHeight = (fontSize * 1.2) * pixelToWorldScale;
    const worldLineSpacing = worldLineHeight * lineSpacing;
    const totalWorldHeight = (lines.length - 1) * worldLineSpacing;
    const topY = yOffset + (totalWorldHeight / 2);

    // PERF: Two-pass approach
    // Pass 1: Count total particles across all lines
    type LinePixelData = { pixels: Uint8ClampedArray; width: number; height: number; lineWorldWidth: number; lineWorldY: number };
    const lineDataCache: LinePixelData[] = [];
    let totalParticleCount = 0;

    lineMetrics.forEach((metrics, lineIndex) => {
        const canvas = new OffscreenCanvas(metrics.width, metrics.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(metrics.text, metrics.width / 2, metrics.height / 2);

        const imageData = ctx.getImageData(0, 0, metrics.width, metrics.height);
        const lineWorldY = topY - (lineIndex * worldLineSpacing);
        const lineWorldWidth = metrics.width * pixelToWorldScale;

        // Count particles for this line
        let lineCount = 0;
        for (let y = 0; y < metrics.height; y += density) {
            for (let x = 0; x < metrics.width; x += density) {
                const i = (y * metrics.width + x) * 4;
                if (imageData.data[i + 3] > 128) {
                    lineCount++;
                }
            }
        }
        totalParticleCount += lineCount;

        lineDataCache.push({
            pixels: imageData.data,
            width: metrics.width,
            height: metrics.height,
            lineWorldWidth,
            lineWorldY
        });
    });

    // Pass 2: Pre-allocate and fill arrays
    const positions = new Float32Array(totalParticleCount * 3);
    const spiralT = new Float32Array(totalParticleCount);
    const randoms = new Float32Array(totalParticleCount);

    let idx = 0;
    lineDataCache.forEach((lineData) => {
        const { pixels, width, height, lineWorldWidth, lineWorldY } = lineData;

        for (let y = 0; y < height; y += density) {
            for (let x = 0; x < width; x += density) {
                const i = (y * width + x) * 4;
                if (pixels[i + 3] > 128) {
                    const worldX = ((x / width) - 0.5) * lineWorldWidth;
                    const localY = (0.5 - y / height) * (height * pixelToWorldScale);
                    const worldY = lineWorldY + localY;

                    positions[idx * 3] = worldX;
                    positions[idx * 3 + 1] = worldY;
                    positions[idx * 3 + 2] = 0;

                    spiralT[idx] = Math.random();
                    randoms[idx] = Math.random();
                    idx++;
                }
            }
        }
    });

    const types = new Float32Array(totalParticleCount).fill(1.0);

    return {
        positions,
        spiralT,
        randoms,
        colors: new Float32Array(totalParticleCount * 3),
        sizes: new Float32Array(totalParticleCount),
        flickerPhases: new Float32Array(totalParticleCount),
        types,
        count: totalParticleCount,
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

    // Responsive config detection using standardized getResponsiveValue for consistent behavior
    const config = LANDING_CONFIG.textParticle;
    const density = getResponsiveValue(config.density);
    const baseWorldWidth = getResponsiveValue(config.layout.worldWidth);

    // Responsive layout params
    const titleY = getResponsiveValue(config.layout.titleY);
    const usernameY = getResponsiveValue(config.layout.usernameY);

    // PERF FIX: Cache worldWidth on first render to prevent re-generation on minor viewport changes
    // Mobile browsers toggle address bar visibility, causing frequent viewport.width fluctuations.
    // Using useRef ensures particle generation is stable after initial mount.
    const cachedWorldWidthRef = useRef<number>(-1);
    if (cachedWorldWidthRef.current < 0 && viewport.width > 0) {
        cachedWorldWidthRef.current = Math.round(Math.min(baseWorldWidth, viewport.width * 0.85) * 10) / 10;
    }
    const worldWidth = cachedWorldWidthRef.current > 0 ? cachedWorldWidthRef.current : baseWorldWidth;

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
                titleY
            );
        } else {
            // Multi-line mode (mobile) - title is readonly string[]
            titleData = generateMultilineTextParticles(
                [...title], // Convert readonly array to mutable for iteration
                fontSize,
                fontFamily,
                density,
                worldWidth,
                titleY,
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

        if (PARTICLE_CONFIG.performance.enableDebugLogs) {
            console.log(`[UniversalParticleSystem] Generated ${totalCount} particles (title: ${titleData.count}, dust budget: ${dustParticleCount})`);
        }

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
    }, [title, density, worldWidth, titleY, dustColors, dustParticleCount]);

    return attributes;
}

export type UniversalParticleAttributes = ReturnType<typeof useUniversalParticleSystem>;
