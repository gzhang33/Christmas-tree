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
    // Separate canvas refs for title and username to prevent truncation
    const titleCanvasRef = useRef<HTMLCanvasElement>(null);
    const userNameCanvasRef = useRef<HTMLCanvasElement>(null);
    const titleAnimationRef = useRef<number>(0);
    const userNameAnimationRef = useRef<number>(0);
    const entranceStartRef = useRef<number | null>(null);
    const fadeOutStartRef = useRef<number | null>(null);
    const entranceCompletedRef = useRef(false);
    const fadeOutCompletedRef = useRef(false);

    const userNameRaw = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);

    // Capitalize first letter of username
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : userNameRaw;

    // Separate particle state for title and username
    const [titleParticles, setTitleParticles] = useState<{
        line1: Particle[];
        line2: Particle[];
    }>({ line1: [], line2: [] });

    const [userNameParticles, setUserNameParticles] = useState<Particle[]>([]);

    // Track canvas dimensions separately
    const [titleCanvasWidth, setTitleCanvasWidth] = useState(0);
    const [userNameCanvasWidth, setUserNameCanvasWidth] = useState(0);

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
        const isMobile = width < LANDING_CONFIG.title.breakpoints.mobile;
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

        // Safe area padding from config
        const horizontalPadding = isMobile
            ? LANDING_CONFIG.title.padding.horizontal.mobile
            : LANDING_CONFIG.title.padding.horizontal.desktop;
        const verticalPadding = isMobile
            ? LANDING_CONFIG.title.padding.vertical.mobile
            : LANDING_CONFIG.title.padding.vertical.desktop;

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
        const userNameConfig = LANDING_CONFIG.userName;
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

        // Resolve responsive userName config
        const userNameXOffset = isMobile ? userNameConfig.xOffset.compact : userNameConfig.xOffset.normal;

        // Resolve alignment and offsets
        const alignment = isMobile ? LANDING_CONFIG.title.alignment.compact : LANDING_CONFIG.title.alignment.normal;
        const verticalOffset = isMobile ? LANDING_CONFIG.title.verticalOffset.compact : LANDING_CONFIG.title.verticalOffset.normal;
        const horizontalOffset = isMobile ? LANDING_CONFIG.title.horizontalOffset.compact : LANDING_CONFIG.title.horizontalOffset.normal;

        return {
            fontSize,
            userNameFontSize: Math.round(fontSize * userNameConfig.fontSizeRatio),
            canvasWidth: Math.max(canvasWidth, 280), // 最小宽度
            canvasHeight,
            density: isMobile ? density + 1 : density, // 移动端稍微减少粒子数量
            line2Indent: Math.round((isMobile ? TITLE_CONFIG.text.line2Indent.compact : TITLE_CONFIG.text.line2Indent.normal) * (fontSize / baseFontSize)),
            lineSpacing: TITLE_CONFIG.text.lineSpacing,
            viewportScale,
            userNameXOffset,
            userNameYOffset,
            alignment,
            verticalOffset,
            horizontalOffset,
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

                // ========= Title Particles (Merry Christmas) =========
                const line1MeasuredWidth = measureTextWidth(TITLE_CONFIG.text.line1, fontSize, fontFamily);
                const line2MeasuredWidth = measureTextWidth(TITLE_CONFIG.text.line2, fontSize, fontFamily);

                // Calculate title canvas width (max of two lines with indent)
                const titleRequiredWidth = Math.max(
                    line1MeasuredWidth,
                    line2MeasuredWidth + line2Indent
                );
                const titleCanvasWidth = Math.max(canvasWidth, titleRequiredWidth);
                setTitleCanvasWidth(titleCanvasWidth);

                // Line 1: "Merry"
                const line1Particles = sampleTextToParticles(
                    TITLE_CONFIG.text.line1,
                    fontSize,
                    fontFamily,
                    line1MeasuredWidth,
                    density,
                    true,
                    false
                );

                // Line 2: "Christmas"
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

                setTitleParticles({ line1: line1Particles, line2: line2Particles });

                // ========= Username Particles =========
                if (userName) {
                    const userNameFont = LANDING_CONFIG.userName.fontFamily;
                    const userNameMeasuredWidth = measureTextWidth(userName, userNameFontSize, userNameFont);

                    // Calculate username canvas width (independent)
                    const userNameCanvasWidth = Math.max(
                        canvasWidth * LANDING_CONFIG.userName.canvasWidthMultiplier.min,
                        userNameMeasuredWidth * LANDING_CONFIG.userName.canvasWidthMultiplier.padding
                    );
                    setUserNameCanvasWidth(userNameCanvasWidth);

                    let userNamePartArray = sampleTextToParticles(
                        userName,
                        userNameFontSize,
                        userNameFont,
                        userNameMeasuredWidth,
                        density + 1,
                        false,
                        true
                    );

                    // Sort by X position for true left-to-right typewriter reveal
                    userNamePartArray.sort((a, b) => a.originX - b.originX);
                    setUserNameParticles(userNamePartArray);
                } else {
                    setUserNameParticles([]);
                    setUserNameCanvasWidth(0);
                }
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
        if (landingPhase === 'text' && userName && userNameParticles.length > 0 && userNameCanvasWidth > 0) {
            const charCount = userName.length;
            let currentChar = 0;

            // Calculate character boundaries by measuring each character's width
            const userNameFont = LANDING_CONFIG.userName.fontFamily;
            const charBoundaries: number[] = [];
            let xPos = 0; // Start from 0 since username has its own canvas
            for (const char of userName) {
                xPos += measureTextWidth(char, responsive.userNameFontSize, userNameFont);
                charBoundaries.push(xPos);
            }

            const interval = setInterval(() => {
                currentChar++;
                const boundaryX = charBoundaries[Math.min(currentChar - 1, charBoundaries.length - 1)];

                setUserNameParticles((prev) =>
                    prev.map((p) => ({
                        ...p,
                        visible: p.originX <= boundaryX
                    }))
                );

                if (currentChar >= charCount) clearInterval(interval);
            }, LANDING_CONFIG.typewriter.charDelay);

            return () => clearInterval(interval);
        }
    }, [landingPhase, userName, userNameParticles.length, responsive, userNameCanvasWidth]);

    // Combine title particles for shared animation logic
    const allTitleParticles = useMemo(() => {
        return [...titleParticles.line1, ...titleParticles.line2];
    }, [titleParticles]);

    // Title Animation loop
    useEffect(() => {
        const canvas = titleCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Use actual titleCanvasWidth or fallback to responsive.canvasWidth
        const actualWidth = titleCanvasWidth || responsive.canvasWidth;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = actualWidth * dpr;
        canvas.height = responsive.canvasHeight * dpr;
        canvas.style.width = `${actualWidth}px`;
        canvas.style.height = `${responsive.canvasHeight}px`;
        ctx.scale(dpr, dpr);

        const startTime = performance.now();
        const treeCenterX = actualWidth / 2;
        const treeCenterY = responsive.canvasHeight + 60;

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;
            ctx.clearRect(0, 0, actualWidth, responsive.canvasHeight);

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

            allTitleParticles.forEach((particle) => {
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

                    // Title particles get twinkle effect
                    if (!particle.isUserName) {
                        const twinkle = Math.sin(elapsed * LANDING_CONFIG.text.twinkleSpeed + particle.random * 6) *
                            TITLE_CONFIG.animation.twinkleAmp + TITLE_CONFIG.animation.twinkleBase;
                        alpha = twinkle;
                    }
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

            titleAnimationRef.current = requestAnimationFrame(animate);
        };

        titleAnimationRef.current = requestAnimationFrame(animate);

        return () => {
            if (titleAnimationRef.current) cancelAnimationFrame(titleAnimationRef.current);
        };
    }, [allTitleParticles, landingPhase, responsive, titleCanvasWidth, onEntranceComplete, onFadeOutComplete]);

    // Username Animation loop (separate canvas)
    useEffect(() => {
        const canvas = userNameCanvasRef.current;
        if (!canvas || !userName || userNameParticles.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const canvasHeight = responsive.userNameFontSize * LANDING_CONFIG.userName.canvasHeightMultiplier;
        canvas.width = userNameCanvasWidth * dpr;
        canvas.height = canvasHeight * dpr;
        canvas.style.width = `${userNameCanvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        ctx.scale(dpr, dpr);

        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = (currentTime - startTime) / 1000;
            ctx.clearRect(0, 0, userNameCanvasWidth, canvasHeight);

            userNameParticles.forEach((particle) => {
                if (!particle.visible) return;

                let x = particle.originX;
                let y = particle.originY;
                let alpha = 1; // Username always full alpha for sharp typewriter effect
                const size = particle.size;

                // Simple breathe animation for username
                if (landingPhase === 'text') {
                    const breathe =
                        Math.sin(elapsed * PARTICLE_CONFIG.animation.breatheFrequency1 + particle.originY * 0.03) *
                        TITLE_CONFIG.animation.breatheAmp1Scale * LANDING_CONFIG.text.breatheAmplitude * 0.5;

                    x += breathe * 0.2;
                    y += breathe * 0.1;
                }

                if (alpha <= 0.02 || size <= 0.3) return;

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = TITLE_CONFIG.effects.shadowBlur * 0.8;
                ctx.shadowColor = particle.color;

                ctx.beginPath();
                ctx.arc(x, y, Math.max(size, TITLE_CONFIG.particle.sizeMinDraw), 0, Math.PI * 2);
                ctx.fillStyle = particle.color;
                ctx.fill();

                ctx.restore();
            });

            userNameAnimationRef.current = requestAnimationFrame(animate);
        };

        userNameAnimationRef.current = requestAnimationFrame(animate);

        return () => {
            if (userNameAnimationRef.current) cancelAnimationFrame(userNameAnimationRef.current);
        };
    }, [userNameParticles, landingPhase, responsive, userName, userNameCanvasWidth]);

    if (landingPhase === 'input' || landingPhase === 'tree') {
        return null;
    }

    return (
        <AnimatePresence>
            {/* Title Canvas - Merry Christmas */}
            <motion.div
                key="landing-title-canvas"
                className="fixed inset-0 flex pointer-events-none z-20"
                style={{
                    justifyContent: responsive.alignment === 'left' ? 'flex-start' : 'center',
                    alignItems: 'center',
                    paddingLeft: responsive.alignment === 'left' ? LANDING_CONFIG.title.padding.leftPadding : undefined,
                    transform: `translate(${responsive.fontSize * TITLE_CONFIG.text.lineSpacing * responsive.horizontalOffset / (typeof window !== 'undefined' ? window.innerWidth : 1920) * 100}%, ${responsive.verticalOffset}%)`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: LANDING_CONFIG.title.animation.fadeTransitionDuration }}
            >
                <canvas
                    ref={titleCanvasRef}
                    style={{
                        width: titleCanvasWidth || responsive.canvasWidth,
                        height: responsive.canvasHeight,
                    }}
                />
            </motion.div>

            {/* Username Canvas - positioned below title */}
            {userName && userNameParticles.length > 0 && (
                <motion.div
                    key="landing-username-canvas"
                    className="fixed inset-0 flex pointer-events-none z-20"
                    style={{
                        justifyContent: responsive.alignment === 'left' ? 'flex-start' : 'center',
                        alignItems: 'center',
                        paddingLeft: responsive.alignment === 'left' ? LANDING_CONFIG.title.padding.leftPadding : undefined,
                        transform: `translate(${responsive.fontSize * TITLE_CONFIG.text.lineSpacing * responsive.userNameXOffset / (typeof window !== 'undefined' ? window.innerWidth : 1920) * 100}%, ${responsive.verticalOffset + (responsive.fontSize * TITLE_CONFIG.text.lineSpacing * responsive.userNameYOffset / (typeof window !== 'undefined' ? window.innerHeight : LANDING_CONFIG.title.animation.defaultScreenHeight) * 100)}%)`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: LANDING_CONFIG.title.animation.fadeTransitionDuration }}
                >
                    <canvas
                        ref={userNameCanvasRef}
                        style={{
                            width: userNameCanvasWidth,
                            height: responsive.userNameFontSize * LANDING_CONFIG.userName.canvasHeightMultiplier,
                        }}
                    />
                </motion.div>
            )}
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
