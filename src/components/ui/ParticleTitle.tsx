/**
 * Particle Title Component (TREE-03)
 *
 * Renders "Merry Christmas" as an animated particle system.
 * Features:
 * - Text rendered as particles using canvas sampling
 * - Breathing/twinkling animation matching tree particle config
 * - Dispersion effect synchronized with tree explosion (matching shader params)
 * - Christmas red/green color palette
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PARTICLE_CONFIG } from '../../config/particles';

interface ParticleTitleProps {
    isExploded: boolean;
    isCompact?: boolean;
}

interface Particle {
    x: number;
    y: number;
    originX: number;
    originY: number;
    size: number;
    color: string;
    delay: number; // Erosion delay (0-1), matching shader heightDelay
    random: number; // Random seed for noise, matching shader aRandom
}

// Christmas red/green color palette
const CHRISTMAS_COLORS = [
    '#228B22', // Forest Green
    '#006400', // Dark Green
    '#32CD32', // Lime Green
    '#DC143C', // Crimson Red
    '#B22222', // Fire Brick Red
    '#FF6347', // Tomato Red
    '#FFD700', // Gold accent
    '#FFFFFF', // White snow accent
];

// Animation parameters matching PARTICLE_CONFIG
const ANIMATION = {
    breatheFreq1: PARTICLE_CONFIG.animation.breatheFrequency1,
    breatheFreq2: PARTICLE_CONFIG.animation.breatheFrequency2,
    breatheAmp1: PARTICLE_CONFIG.animation.breatheAmplitude1 * 15, // Scale for 2D
    breatheAmp2: PARTICLE_CONFIG.animation.breatheAmplitude2 * 15,
    swayFreq: PARTICLE_CONFIG.animation.swayFrequency,
    swayAmp: PARTICLE_CONFIG.animation.swayAmplitude * 8,
    // Dispersion parameters matching shader
    upwardForce: 200, // Matches vec3(0.0, 15.0, 0.0) scaled for 2D canvas
    driftAmplitude: 60, // Matches noiseOffset * 4.0 scaled
    progressScale: 2.6, // Matches uProgress * 2.6 in shader
    erosionNoiseWeight: 0.3, // Matches erosionNoise * 0.3
    heightDelayWeight: 1.0, // Matches heightDelay * 1.0
};

// Sample text from canvas to get particle positions
const sampleTextToParticles = (
    text: string,
    fontSize: number,
    fontFamily: string,
    maxWidth: number,
    density: number = 2
): Particle[] => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Set canvas size with padding
    canvas.width = maxWidth;
    canvas.height = fontSize * 1.6;

    // Configure text rendering
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 0, fontSize * 0.2);

    // Sample pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];

    for (let y = 0; y < canvas.height; y += density) {
        for (let x = 0; x < canvas.width; x += density) {
            const index = (y * canvas.width + x) * 4;
            const alpha = imageData.data[index + 3];

            // Only create particle if pixel is visible
            if (alpha > 128) {
                // Calculate erosion factor (top triggers first, bottom last)
                // Matches shader: heightDelay = (14.0 - y) / 20.0
                const normalizedY = y / canvas.height;
                const erosionFactor = normalizedY; // Top = 0, Bottom = 1

                particles.push({
                    x: x,
                    y: y,
                    originX: x,
                    originY: y,
                    size: 2 + Math.random() * 2,
                    color: CHRISTMAS_COLORS[Math.floor(Math.random() * CHRISTMAS_COLORS.length)],
                    delay: erosionFactor,
                    random: Math.random(),
                });
            }
        }
    }

    return particles;
};

export const ParticleTitle: React.FC<ParticleTitleProps> = ({
    isExploded,
    isCompact = false,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const explosionStartRef = useRef<number | null>(null);
    const [particles, setParticles] = useState<{
        merry: Particle[];
        christmas: Particle[];
    }>({ merry: [], christmas: [] });

    // Increased font size
    const fontSize = isCompact ? 56 : 72;
    const fontFamily = '"Great Vibes", cursive';

    // Generate particles on mount
    useEffect(() => {
        const merryParticles = sampleTextToParticles(
            'Merry',
            fontSize,
            fontFamily,
            420,
            3
        );
        const christmasParticles = sampleTextToParticles(
            'Christmas',
            fontSize,
            fontFamily,
            560,
            3
        );

        // Offset Christmas particles below Merry
        christmasParticles.forEach((p) => {
            p.originY += fontSize * 1.15;
            p.y += fontSize * 1.15;
            p.originX += isCompact ? 16 : 32; // Indent
            p.x += isCompact ? 16 : 32;
            // Adjust erosion factor for second line (triggers later)
            p.delay = 0.3 + p.delay * 0.7;
        });

        setParticles({ merry: merryParticles, christmas: christmasParticles });
    }, [fontSize, isCompact]);

    // Track explosion start time
    useEffect(() => {
        if (isExploded && explosionStartRef.current === null) {
            explosionStartRef.current = performance.now();
        } else if (!isExploded) {
            explosionStartRef.current = null;
        }
    }, [isExploded]);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const startTime = performance.now();
        const allParticles = [...particles.merry, ...particles.christmas];

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            allParticles.forEach((particle) => {
                let x = particle.originX;
                let y = particle.originY;
                let alpha = 1;
                let size = particle.size;

                if (isExploded && explosionStartRef.current !== null) {
                    // Calculate global progress (0-1 over ~2.5 seconds)
                    const explosionElapsed = (currentTime - explosionStartRef.current) / 1000;
                    const globalProgress = Math.min(explosionElapsed / 2.5, 1);

                    // Calculate local progress per particle (matching shader logic)
                    // trigger = (uProgress * 2.6) - (erosionNoise * 0.3 + heightDelay * 1.0)
                    const trigger =
                        globalProgress * ANIMATION.progressScale -
                        (particle.random * ANIMATION.erosionNoiseWeight +
                            particle.delay * ANIMATION.heightDelayWeight);
                    const localProgress = Math.max(0, Math.min(trigger, 1));

                    // Easing (smoothstep equivalent)
                    const easedProgress = localProgress * localProgress * (3 - 2 * localProgress);

                    // Upward force (accelerating) - matches vec3(0.0, 15.0, 0.0) * easedProgress^2
                    const upForce = ANIMATION.upwardForce * easedProgress * easedProgress;

                    // Turbulent drift (noise offset)
                    const timeOffset = elapsed * 0.5;
                    const noiseX =
                        Math.sin(particle.originY * 0.5 + timeOffset + particle.random * 5) *
                        ANIMATION.driftAmplitude *
                        easedProgress;
                    const noiseY =
                        Math.cos(particle.originX * 0.3 + timeOffset * 0.8 + particle.random * 4) *
                        ANIMATION.driftAmplitude *
                        0.3 *
                        easedProgress;

                    x += noiseX;
                    y -= upForce + noiseY;

                    // Fade out (matching shader fadeStart=0.3, fadeEnd=0.85)
                    const fadeStart = 0.3;
                    const fadeEnd = 0.85;
                    alpha = 1 - Math.max(0, Math.min((easedProgress - fadeStart) / (fadeEnd - fadeStart), 1));

                    // Size change (grow slightly then shrink)
                    const growPhase = Math.min(easedProgress / 0.3, 1);
                    const shrinkPhase = Math.max(0, (easedProgress - 0.3) / 0.7);
                    size *= 1 + growPhase * 0.3 - shrinkPhase * 0.6;
                } else {
                    // Breathing animation (matching shader breathe logic)
                    const breathe =
                        Math.sin(elapsed * ANIMATION.breatheFreq1 + particle.originY * 0.1) * ANIMATION.breatheAmp1 +
                        Math.sin(elapsed * ANIMATION.breatheFreq2 + particle.originX * 0.2) * ANIMATION.breatheAmp2;

                    // Sway animation
                    const sway =
                        Math.sin(elapsed * ANIMATION.swayFreq + particle.originY * 0.15) * ANIMATION.swayAmp;

                    x += sway + breathe * 0.3;
                    y += breathe * 0.2;

                    // Twinkling alpha
                    const twinkle =
                        Math.sin(elapsed * 3 + particle.random * 10) * 0.2 + 0.9;
                    alpha = twinkle;

                    // Subtle size pulse
                    size *= 1 + Math.sin(elapsed * 2 + particle.random * 5) * 0.1;
                }

                if (alpha <= 0.01) return;

                // Draw particle with glow
                ctx.save();
                ctx.globalAlpha = alpha;

                // Outer glow
                ctx.shadowBlur = 12;
                ctx.shadowColor = particle.color;

                // Draw particle
                ctx.beginPath();
                ctx.arc(x, y, Math.max(size, 0.5), 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();

                ctx.restore();
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [particles, isExploded]);

    // Calculate canvas dimensions (increased for larger text)
    const canvasWidth = isCompact ? 400 : 520;
    const canvasHeight = fontSize * 2.8;

    return (
        <AnimatePresence>
            <motion.div
                className="absolute pointer-events-none z-10"
                style={{
                    top: 'clamp(1rem, 4vh, 2rem)',
                    left: 'clamp(1rem, 3vw, 2.5rem)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: isExploded ? 0 : 1 }}
                transition={{ duration: isExploded ? 2.5 : 0.8 }}
            >
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{
                        filter: 'drop-shadow(0 0 25px rgba(220, 20, 60, 0.6)) drop-shadow(0 0 15px rgba(34, 139, 34, 0.5))',
                    }}
                />
            </motion.div>
        </AnimatePresence>
    );
};
