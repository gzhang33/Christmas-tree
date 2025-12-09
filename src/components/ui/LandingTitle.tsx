/**
 * Landing Title Component
 *
 * Particle title for Landing page.
 * Uses TITLE_CONFIG as the single source of truth for sizing.
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PARTICLE_CONFIG } from '../../config/particles';
import { TITLE_CONFIG, TITLE_COLORS, USERNAME_COLORS, LANDING_CONFIG } from '../../config/landing';
import { useStore } from '../../store/useStore';

interface LandingTitleProps {
    onEntranceComplete?: () => void;
    onFadeOutComplete?: () => void;
}

interface Particle {
    x: number;
    y: number;
    originX: number;
    originY: number;
    startY: number;
    size: number;
    color: string;
    delay: number;
    random: number;
    visible: boolean;
    isUserName: boolean;
}

// Utility to measure actual text width for dynamic canvas sizing
const measureTextWidth = (text: string, fontSize: number, fontFamily: string): number => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return fontSize * text.length * 0.6; // fallback estimate
    ctx.font = `${fontSize}px ${fontFamily}`;
    return Math.ceil(ctx.measureText(text).width * 1.15); // 15% padding for safety
};

// Sample text to particles
const sampleTextToParticles = (
    text: string,
    fontSize: number,
    fontFamily: string,
    maxWidth: number,
    density: number,
    startVisible: boolean,
    isUserName: boolean = false
): Particle[] => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    canvas.width = maxWidth;
    canvas.height = fontSize * TITLE_CONFIG.sampling.canvasPadding;

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 0, fontSize * 0.15);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const particles: Particle[] = [];
    const colorPalette = isUserName ? USERNAME_COLORS : TITLE_COLORS;

    for (let y = 0; y < canvas.height; y += density) {
        for (let x = 0; x < canvas.width; x += density) {
            const index = (y * canvas.width + x) * 4;
            const alpha = imageData.data[index + 3];

            if (alpha > 100) {
                particles.push({
                    x,
                    y,
                    originX: x,
                    originY: y,
                    startY: -50 - Math.random() * LANDING_CONFIG.entrance.spreadHeight,
                    size: TITLE_CONFIG.particle.sizeMin + Math.random() * (TITLE_CONFIG.particle.sizeMax - TITLE_CONFIG.particle.sizeMin),
                    color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                    delay: Math.random() * LANDING_CONFIG.entrance.delayVariation,
                    random: Math.random(),
                    visible: startVisible,
                    isUserName,
                });
            }
        }
    }

    return particles;
};

export const LandingTitle: React.FC<LandingTitleProps> = ({
    onEntranceComplete,
    onFadeOutComplete,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const entranceStartRef = useRef<number | null>(null);
    const fadeOutStartRef = useRef<number | null>(null);
    const entranceCompletedRef = useRef(false);
    const fadeOutCompletedRef = useRef(false);

    const userName = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);

    const [particles, setParticles] = useState<{
        line1: Particle[];
        line2: Particle[];
        line3: Particle[];
    }>({ line1: [], line2: [], line3: [] });

    const [dimensions, setDimensions] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Viewport-based responsive sizing - 确保内容完整显示不被截断
    const responsive = useMemo(() => {
        const { width, height } = dimensions;
        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1200;
        const vp = LANDING_CONFIG.title.viewportScale;

        // Linear interpolation for viewport scale
        const clampedWidth = Math.max(vp.minWidth, Math.min(width, vp.maxWidth));
        const t = (clampedWidth - vp.minWidth) / (vp.maxWidth - vp.minWidth);
        const viewportScale = vp.minScale + t * (vp.maxScale - vp.minScale);

        // Base values from TITLE_CONFIG
        const baseFontSize = isMobile ? TITLE_CONFIG.font.size.compact : TITLE_CONFIG.font.size.normal;
        const baseCanvasWidth = isMobile ? TITLE_CONFIG.sampling.canvasWidth.compact : TITLE_CONFIG.sampling.canvasWidth.normal;

        // Calculate initial font size with viewport scale
        let fontSize = Math.round(baseFontSize * viewportScale * LANDING_CONFIG.title.scale);
        let canvasWidth = Math.round(baseCanvasWidth * viewportScale * LANDING_CONFIG.title.scale);

        // 安全边距
        const horizontalPadding = isMobile ? 20 : 40;
        const verticalPadding = isMobile ? 100 : 150; // 为 ClickPrompt 留出空间

        // 确保画布宽度不超出视口
        const maxAllowedWidth = width - horizontalPadding * 2;
        if (canvasWidth > maxAllowedWidth) {
            const scaleDown = maxAllowedWidth / canvasWidth;
            canvasWidth = maxAllowedWidth;
            fontSize = Math.round(fontSize * scaleDown);
        }

        // 计算预估画布高度
        const baseHeightMultiplier = isMobile
            ? TITLE_CONFIG.sampling.canvasHeightMultiplier.compact
            : TITLE_CONFIG.sampling.canvasHeightMultiplier.normal;

        // 动态计算所需高度：确保画布能容纳用户名
        // 用户名 Y 位置 = fontSize * lineSpacing * yOffset + 用户名字体高度
        const userNameConfig = LANDING_CONFIG.title.userName;
        const userNameYOffset = isMobile ? userNameConfig.yOffset.compact : userNameConfig.yOffset.normal;
        const userNameFontRatio = userNameConfig.fontSizeRatio;
        // 所需高度倍数 = lineSpacing * yOffset + 用户名占用高度 (约 1.2 倍用户名字体)
        const requiredHeightForUserName = TITLE_CONFIG.text.lineSpacing * userNameYOffset + userNameFontRatio * 1.2;
        // 取两者最大值
        const heightMultiplier = Math.max(baseHeightMultiplier, requiredHeightForUserName);

        let canvasHeight = Math.round(fontSize * heightMultiplier);

        // 确保画布高度不超出视口 (留出顶部和底部空间)
        const maxAllowedHeight = height - verticalPadding * 2;
        if (canvasHeight > maxAllowedHeight) {
            const scaleDown = maxAllowedHeight / canvasHeight;
            canvasHeight = maxAllowedHeight;
            fontSize = Math.round(fontSize * scaleDown);
            canvasWidth = Math.round(canvasWidth * scaleDown);
        }

        // 最小字体限制，确保可读性
        const minFontSize = isMobile ? 30 : 50;
        if (fontSize < minFontSize) {
            fontSize = minFontSize;
            canvasHeight = Math.round(fontSize * heightMultiplier);
        }

        const density = LANDING_CONFIG.title.densityOverride ?? TITLE_CONFIG.sampling.density;

        // Resolve responsive userName config (already resolved above for height calculation)
        const userNameIndent = isMobile ? userNameConfig.indent.compact : userNameConfig.indent.normal;

        // Resolve alignment and vertical offset
        const alignment = isMobile ? LANDING_CONFIG.title.alignment.compact : LANDING_CONFIG.title.alignment.normal;
        const verticalOffset = isMobile ? LANDING_CONFIG.title.verticalOffset.compact : LANDING_CONFIG.title.verticalOffset.normal;

        return {
            fontSize,
            userNameFontSize: Math.round(fontSize * userNameConfig.fontSizeRatio),
            canvasWidth: Math.max(canvasWidth, 280), // 最小宽度
            canvasHeight,
            density: isMobile ? density + 1 : density, // 移动端稍微减少粒子数量
            line2Indent: Math.round((isMobile ? TITLE_CONFIG.text.line2Indent.compact : TITLE_CONFIG.text.line2Indent.normal) * (fontSize / baseFontSize)),
            lineSpacing: TITLE_CONFIG.text.lineSpacing,
            viewportScale,
            userNameIndent,
            userNameYOffset,
            alignment,
            verticalOffset,
            isMobile,
        };
    }, [dimensions]);

    const fontFamily = TITLE_CONFIG.font.fallback || TITLE_CONFIG.font.family;

    // Generate particles
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        let isMounted = true;

        entranceCompletedRef.current = false;
        fadeOutCompletedRef.current = false;
        entranceStartRef.current = null;
        fadeOutStartRef.current = null;

        document.fonts.ready.then(() => {
            timeoutId = setTimeout(() => {
                if (!isMounted) return;

                const { fontSize, userNameFontSize, canvasWidth, density, line2Indent, lineSpacing } = responsive;

                // Measure actual text widths to prevent truncation
                const line1MeasuredWidth = measureTextWidth(TITLE_CONFIG.text.line1, fontSize, fontFamily);
                const line2MeasuredWidth = measureTextWidth(TITLE_CONFIG.text.line2, fontSize, fontFamily);
                const userNameFont = "'Inter', 'Helvetica Neue', Arial, sans-serif";
                const userNameMeasuredWidth = userName ? measureTextWidth(userName, userNameFontSize, userNameFont) : 0;

                // Calculate required canvas width (max of all lines with indents)
                const requiredWidth = Math.max(
                    line1MeasuredWidth,
                    line2MeasuredWidth + line2Indent,
                    userNameMeasuredWidth + (canvasWidth * responsive.userNameIndent)
                );
                const actualCanvasWidth = Math.max(canvasWidth, requiredWidth);

                // Line 1: "Merry" - use measured width
                const line1Particles = sampleTextToParticles(
                    TITLE_CONFIG.text.line1,
                    fontSize,
                    fontFamily,
                    line1MeasuredWidth,
                    density,
                    true,
                    false
                );

                // Line 2: "Christmas" - use measured width
                const line2Particles = sampleTextToParticles(
                    TITLE_CONFIG.text.line2,
                    fontSize,
                    fontFamily,
                    line2MeasuredWidth,
                    density,
                    true,
                    false
                );

                const line2YOffset = fontSize * lineSpacing;
                line2Particles.forEach((p) => {
                    p.originY += line2YOffset;
                    p.y += line2YOffset;
                    p.originX += line2Indent;
                    p.x += line2Indent;
                    p.delay = 0.1 + p.delay * 0.2;
                });

                // Line 3: userName - sort by X for true typewriter effect
                let line3Particles: Particle[] = [];
                if (userName) {
                    line3Particles = sampleTextToParticles(
                        userName,
                        userNameFontSize,
                        userNameFont,
                        userNameMeasuredWidth,
                        density + 1,
                        false,
                        true
                    );

                    const line3YOffset = fontSize * lineSpacing * responsive.userNameYOffset;
                    const line3Indent = actualCanvasWidth * responsive.userNameIndent;
                    line3Particles.forEach((p) => {
                        p.originY += line3YOffset;
                        p.y += line3YOffset;
                        p.originX += line3Indent;
                        p.x += line3Indent;
                        p.delay = 0.3 + p.delay * 0.15;
                    });

                    // Sort by X position for true left-to-right typewriter reveal
                    line3Particles.sort((a, b) => a.originX - b.originX);
                }

                setParticles({ line1: line1Particles, line2: line2Particles, line3: line3Particles });
            }, TITLE_CONFIG.font.loadDelay);
        });

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [responsive, fontFamily, userName]);

    // Phase transitions
    useEffect(() => {
        if (landingPhase === 'entrance' && entranceStartRef.current === null) {
            entranceStartRef.current = performance.now();
        }
    }, [landingPhase]);

    useEffect(() => {
        if (landingPhase === 'morphing' && fadeOutStartRef.current === null) {
            fadeOutStartRef.current = performance.now();
        }
    }, [landingPhase]);

    // Typewriter effect - true character-by-character using X position
    useEffect(() => {
        if (landingPhase === 'text' && userName && particles.line3.length > 0) {
            const charCount = userName.length;
            let currentChar = 0;

            // Calculate character boundaries by measuring each character's width
            const userNameFont = "'Inter', 'Helvetica Neue', Arial, sans-serif";
            const charBoundaries: number[] = [];
            let xPos = responsive.canvasWidth * responsive.userNameIndent;
            for (const char of userName) {
                xPos += measureTextWidth(char, responsive.userNameFontSize, userNameFont);
                charBoundaries.push(xPos);
            }

            const interval = setInterval(() => {
                currentChar++;
                const boundaryX = charBoundaries[Math.min(currentChar - 1, charBoundaries.length - 1)];

                setParticles((prev) => ({
                    ...prev,
                    line3: prev.line3.map((p) => ({
                        ...p,
                        visible: p.originX <= boundaryX
                    })),
                }));

                if (currentChar >= charCount) clearInterval(interval);
            }, LANDING_CONFIG.typewriter.charDelay);

            return () => clearInterval(interval);
        }
    }, [landingPhase, userName, particles.line3.length, responsive]);

    const allParticles = useMemo(() => {
        return [...particles.line1, ...particles.line2, ...particles.line3];
    }, [particles]);

    // Animation loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = responsive.canvasWidth * dpr;
        canvas.height = responsive.canvasHeight * dpr;
        canvas.style.width = `${responsive.canvasWidth}px`;
        canvas.style.height = `${responsive.canvasHeight}px`;
        ctx.scale(dpr, dpr);

        const startTime = performance.now();
        const treeCenterX = responsive.canvasWidth / 2;
        const treeCenterY = responsive.canvasHeight + 60;

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;
            ctx.clearRect(0, 0, responsive.canvasWidth, responsive.canvasHeight);

            let entranceProgress = 1;
            if (landingPhase === 'entrance' && entranceStartRef.current !== null) {
                const entranceElapsed = (currentTime - entranceStartRef.current) / 1000;
                entranceProgress = Math.min(entranceElapsed / LANDING_CONFIG.entrance.duration, 1);

                if (entranceProgress >= 1 && !entranceCompletedRef.current) {
                    entranceCompletedRef.current = true;
                    onEntranceComplete?.();
                }
            }

            let fadeOutProgress = 0;
            if (landingPhase === 'morphing' && fadeOutStartRef.current !== null) {
                const fadeOutElapsed = (currentTime - fadeOutStartRef.current) / 1000;
                fadeOutProgress = Math.min(fadeOutElapsed / LANDING_CONFIG.morphing.duration, 1);

                if (fadeOutProgress >= 1 && !fadeOutCompletedRef.current) {
                    fadeOutCompletedRef.current = true;
                    onFadeOutComplete?.();
                }
            }

            allParticles.forEach((particle) => {
                if (!particle.visible) return;

                let x = particle.originX;
                let y = particle.originY;
                let alpha = 1;
                let size = particle.size;

                if (landingPhase === 'entrance') {
                    const adjustedProgress = Math.max(0, (entranceProgress - particle.delay) / (1 - particle.delay));
                    const easedProgress = easeOutCubic(Math.min(adjustedProgress, 1));

                    y = particle.startY + (particle.originY - particle.startY) * easedProgress;
                    alpha = Math.min(easedProgress * 1.8, 1);
                    x += Math.sin(elapsed * 3 + particle.random * 6) * (1 - easedProgress) * 3;
                } else if (landingPhase === 'text') {
                    const breathe =
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.breatheFrequency1 + particle.originY * 0.03) *
                        TITLE_CONFIG.animation.breatheAmp1Scale * LANDING_CONFIG.text.breatheAmplitude +
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.breatheFrequency2 + particle.originX * 0.04) *
                        TITLE_CONFIG.animation.breatheAmp2Scale * LANDING_CONFIG.text.breatheAmplitude;

                    x += breathe * 0.3;
                    y += breathe * 0.15;

                    // Skip twinkle for username particles to ensure sharp typewriter effect
                    if (!particle.isUserName) {
                        const twinkle = Math.sin(elapsed * LANDING_CONFIG.text.twinkleSpeed + particle.random * 6) *
                            TITLE_CONFIG.animation.twinkleAmp + TITLE_CONFIG.animation.twinkleBase;
                        alpha = twinkle;
                    }
                    // Username particles stay at full alpha = 1 for instant appearance
                } else if (landingPhase === 'morphing') {
                    const trigger = fadeOutProgress * 1.6 - particle.delay * 0.5;
                    const localProgress = Math.max(0, Math.min(trigger, 1));
                    const easedProgress = easeInOutCubic(localProgress);

                    x = particle.originX + (treeCenterX - particle.originX) * easedProgress;
                    y = particle.originY + (treeCenterY - particle.originY) * easedProgress;

                    alpha = localProgress < 0.6 ? 1 : 1 - (localProgress - 0.6) / 0.4;
                    size *= 1 - easedProgress * 0.4;
                }

                if (alpha <= 0.02 || size <= 0.3) return;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = TITLE_CONFIG.effects.shadowBlur;
                ctx.shadowColor = particle.color;

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
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [allParticles, landingPhase, responsive, onEntranceComplete, onFadeOutComplete]);

    if (landingPhase === 'input' || landingPhase === 'tree') {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 flex pointer-events-none z-20"
                style={{
                    justifyContent: responsive.alignment === 'left' ? 'flex-start' : 'center',
                    alignItems: 'center',
                    paddingLeft: responsive.alignment === 'left' ? 'clamp(40px, 5vw, 80px)' : undefined,
                    transform: `translateY(${responsive.verticalOffset}%)`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        width: responsive.canvasWidth,
                        height: responsive.canvasHeight,
                    }}
                />
            </motion.div>
        </AnimatePresence>
    );
};

function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export default LandingTitle;
