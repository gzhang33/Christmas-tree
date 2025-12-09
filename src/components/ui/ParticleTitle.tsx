/**
 * Particle Title Component (TREE-03)
 *
 * Renders "Merry Christmas" as an animated particle system.
 * Features:
 * - Text rendered as particles using canvas sampling
 * - Breathing/twinkling animation matching tree particle config
 * - Dispersion effect synchronized with tree explosion (matching shader params)
 * - Christmas red/green/gold/white color palette
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PARTICLE_CONFIG } from '../../config/particles';
import { TITLE_CONFIG, TITLE_COLORS } from '../../config/particleTitle';

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

// Sample text from canvas to get particle positions
const sampleTextToParticles = (
    text: string,
    fontSize: number,
    fontFamily: string,
    maxWidth: number,
    density: number = TITLE_CONFIG.sampling.density
): Particle[] => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Set canvas size with padding
    canvas.width = maxWidth;
    canvas.height = fontSize * TITLE_CONFIG.sampling.canvasPadding;

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
                    size: TITLE_CONFIG.particle.sizeMin + Math.random() * (TITLE_CONFIG.particle.sizeMax - TITLE_CONFIG.particle.sizeMin),
                    color: TITLE_COLORS[Math.floor(Math.random() * TITLE_COLORS.length)],
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
        line1: Particle[];
        line2: Particle[];
    }>({ line1: [], line2: [] });

    // Font configuration from centralized config
    const fontSize = isCompact ? TITLE_CONFIG.font.size.compact : TITLE_CONFIG.font.size.normal;
    // Use the fallback stack if defined, otherwise default to family
    // @ts-ignore - fallback property added in config
    const fontFamily = TITLE_CONFIG.font.fallback || TITLE_CONFIG.font.family;

    // Generate particles on mount
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        let isMounted = true;

        // 等待字体加载完成
        document.fonts.ready.then(() => {
            // 添加延迟确保字体在Canvas中完全可用
            timeoutId = setTimeout(() => {
                if (!isMounted) return;

                const canvasWidth = isCompact ? TITLE_CONFIG.sampling.canvasWidth.compact : TITLE_CONFIG.sampling.canvasWidth.normal;

                // 生成第一行粒子 (Merry)
                const line1Particles = sampleTextToParticles(
                    TITLE_CONFIG.text.line1,
                    fontSize,
                    fontFamily,
                    canvasWidth * 0.6, // Width for "Merry"
                    TITLE_CONFIG.sampling.density
                );

                // 生成第二行粒子 (Christmas)
                const line2Particles = sampleTextToParticles(
                    TITLE_CONFIG.text.line2,
                    fontSize,
                    fontFamily,
                    canvasWidth, // Full width for "Christmas"
                    TITLE_CONFIG.sampling.density
                );

                // 调整第二行位置和延迟
                const line2Indent = isCompact ? TITLE_CONFIG.text.line2Indent.compact : TITLE_CONFIG.text.line2Indent.normal;
                line2Particles.forEach((p) => {
                    p.originY += fontSize * TITLE_CONFIG.text.lineSpacing;
                    p.y += fontSize * TITLE_CONFIG.text.lineSpacing;
                    p.originX += line2Indent;
                    p.x += line2Indent;
                    // Adjust erosion factor for second line (triggers later)
                    p.delay = TITLE_CONFIG.animation.line2DelayOffset + p.delay * TITLE_CONFIG.animation.line2DelayScale;
                });

                setParticles({ line1: line1Particles, line2: line2Particles });
            }, TITLE_CONFIG.font.loadDelay ?? 150); // 延迟确保字体完全加载
        });

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [fontSize, fontFamily, isCompact]);

    // Track explosion start time
    useEffect(() => {
        if (isExploded && explosionStartRef.current === null) {
            explosionStartRef.current = performance.now();
        } else if (!isExploded) {
            explosionStartRef.current = null;
        }
    }, [isExploded]);

    // Memoize the specific particle combination to prevent per-frame allocation
    const allParticles = useMemo(() => {
        return [...particles.line1, ...particles.line2];
    }, [particles.line1, particles.line2]);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            allParticles.forEach((particle) => {
                let x = particle.originX;
                let y = particle.originY;
                let alpha = 1;
                let size = particle.size;

                if (isExploded && explosionStartRef.current !== null) {
                    // Use time-based exponential decay for frame-rate independence
                    const explosionElapsed = (currentTime - explosionStartRef.current) / 1000;

                    // Convert per-frame damping (at 60fps) to per-second decay rate constant
                    // If per-frame logic was: progress += (1 - progress) * k
                    // That is discrete approx of: dy/dt = -60*k*y => y(t) = exp(-60*k*t) for the remaining part (1-progress)
                    const dampingSpeedPerFrame = PARTICLE_CONFIG.animation.dampingSpeedExplosion;
                    const decayRate = dampingSpeedPerFrame * 60;

                    const globalProgress = 1 - Math.exp(-decayRate * explosionElapsed);

                    // Calculate local progress per particle (matching shader logic)
                    // trigger = (uProgress * 2.6) - (erosionNoise * 0.3 + heightDelay * 1.0)
                    const trigger =
                        globalProgress * TITLE_CONFIG.animation.progressScale -
                        (particle.random * TITLE_CONFIG.animation.erosionNoiseWeight +
                            particle.delay * TITLE_CONFIG.animation.heightDelayWeight);
                    const localProgress = Math.max(0, Math.min(trigger, 1));

                    // Easing (smoothstep equivalent)
                    const easedProgress = localProgress * localProgress * (3 - 2 * localProgress);

                    // Upward force (accelerating) - matches vec3(0.0, 15.0, 0.0) * easedProgress^2
                    const upForce = TITLE_CONFIG.animation.upwardForce * easedProgress * easedProgress;

                    // Turbulent drift (noise offset)
                    const timeOffset = elapsed * TITLE_CONFIG.animation.noiseTimeScale;
                    const noiseX =
                        Math.sin(particle.originY * TITLE_CONFIG.animation.noiseYFreq + timeOffset + particle.random * 5) *
                        TITLE_CONFIG.animation.driftAmplitude *
                        easedProgress;
                    const noiseY =
                        Math.cos(particle.originX * TITLE_CONFIG.animation.noiseXFreq + timeOffset * TITLE_CONFIG.animation.noiseXTimeScale + particle.random * 4) *
                        TITLE_CONFIG.animation.driftAmplitude *
                        TITLE_CONFIG.animation.noiseDriftYScale *
                        easedProgress;

                    x += noiseX;
                    y -= upForce + noiseY;

                    // Fade out (matching shader fadeStart=0.3, fadeEnd=0.85)
                    const fadeStart = TITLE_CONFIG.animation.fadeStart;
                    const fadeEnd = TITLE_CONFIG.animation.fadeEnd;
                    alpha = 1 - Math.max(0, Math.min((easedProgress - fadeStart) / (fadeEnd - fadeStart), 1));

                    // Size change (grow slightly then shrink)
                    const growPhase = Math.min(easedProgress / TITLE_CONFIG.animation.growPhaseEnd, 1);
                    const shrinkPhase = Math.max(0, (easedProgress - TITLE_CONFIG.animation.growPhaseEnd) / (1 - TITLE_CONFIG.animation.growPhaseEnd));
                    size *= 1 + growPhase * TITLE_CONFIG.animation.growAmount - shrinkPhase * TITLE_CONFIG.animation.shrinkAmount;
                } else {
                    // Breathing animation (matching shader breathe logic)
                    // 直接使用 PARTICLE_CONFIG 中的频率，确保与树的动画同步
                    const breatheAmp1 = PARTICLE_CONFIG.animation.breatheAmplitude1 * TITLE_CONFIG.animation.breatheAmp1Scale;
                    const breatheAmp2 = PARTICLE_CONFIG.animation.breatheAmplitude2 * TITLE_CONFIG.animation.breatheAmp2Scale;
                    const breathe =
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.breatheFrequency1 + particle.originY * 0.1) * breatheAmp1 +
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.breatheFrequency2 + particle.originX * 0.2) * breatheAmp2;

                    // Sway animation
                    // 直接使用 PARTICLE_CONFIG 中的频率，确保与树的动画同步
                    const swayAmp = PARTICLE_CONFIG.animation.swayAmplitude * TITLE_CONFIG.animation.swayAmpScale;
                    const sway =
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.swayFrequency + particle.originY * 0.15) * swayAmp;

                    x += sway + breathe * 0.3;
                    y += breathe * 0.2;

                    // Twinkling alpha
                    const twinkle =
                        Math.sin(elapsed * TITLE_CONFIG.animation.twinkleFreq + particle.random * 10) * TITLE_CONFIG.animation.twinkleAmp + TITLE_CONFIG.animation.twinkleBase;
                    alpha = twinkle;

                    // Subtle size pulse
                    size *= 1 + Math.sin(elapsed * TITLE_CONFIG.animation.sizeFreq + particle.random * 5) * TITLE_CONFIG.animation.sizeAmp;
                }

                if (alpha <= 0.01) return;

                // Draw particle with enhanced glow for better visibility
                ctx.save();
                ctx.globalAlpha = alpha;

                // Strong outer glow for visibility
                ctx.shadowBlur = TITLE_CONFIG.effects.shadowBlur;
                ctx.shadowColor = particle.color;

                // Additional background glow layer for contrast
                ctx.globalCompositeOperation = 'screen';
                ctx.beginPath();
                ctx.arc(x, y, Math.max(size * TITLE_CONFIG.particle.glowLayerSizeMultiplier, 1), 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.globalAlpha = alpha * TITLE_CONFIG.particle.glowLayerAlpha;
                ctx.fill();

                // Main particle with full opacity
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(size, TITLE_CONFIG.particle.sizeMinDraw), 0, Math.PI * 2);
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
    }, [allParticles, isExploded]);

    // Calculate canvas dimensions from config
    const canvasWidth = isCompact ? TITLE_CONFIG.sampling.canvasWidth.compact : TITLE_CONFIG.sampling.canvasWidth.normal;
    const canvasHeight = fontSize * TITLE_CONFIG.sampling.canvasHeightMultiplier;

    // Build drop-shadow filter from config
    const dropShadowFilter = `drop-shadow(0 0 ${TITLE_CONFIG.effects.dropShadow.red.blur}px ${TITLE_CONFIG.effects.dropShadow.red.color}) drop-shadow(0 0 ${TITLE_CONFIG.effects.dropShadow.green.blur}px ${TITLE_CONFIG.effects.dropShadow.green.color}) drop-shadow(0 0 ${TITLE_CONFIG.effects.dropShadow.gold.blur}px ${TITLE_CONFIG.effects.dropShadow.gold.color})`;

    return (
        <AnimatePresence>
            <motion.div
                className="absolute pointer-events-none z-10"
                style={{
                    top: TITLE_CONFIG.position.top,
                    left: TITLE_CONFIG.position.left,
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: isExploded ? TITLE_CONFIG.transition.explodedDuration : TITLE_CONFIG.transition.normalDuration }}
            >
                <canvas
                    ref={canvasRef}
                    width={canvasWidth}
                    height={canvasHeight}
                    style={{
                        filter: dropShadowFilter,
                    }}
                />
            </motion.div>
        </AnimatePresence>
    );
};
