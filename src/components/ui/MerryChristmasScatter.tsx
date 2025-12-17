/**
 * MerryChristmasScatter Component
 *
 * Displays "Merry Christmas, {username}" text scattered around the tree area
 * after the explosion animation completes.
 *
 * Features:
 * - Appears immediately after tree explosion animation ends
 * - 9 text instances at random positions
 * - Each text has a floating/drifting animation that disperses outward
 * - Uses 2D CSS/Framer Motion (not particle system)
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';

// Configuration for the scatter effect
const SCATTER_CONFIG = {
    instanceCount: 9,
    // Random position range (percentage of viewport)
    positionRange: {
        xMin: 10,
        xMax: 90,
        yMin: 15,
        yMax: 85,
    },
    // Animation timing
    animation: {
        staggerDelay: 0.15,      // Delay between each text appearing
        fadeInDuration: 0.6,     // Duration of fade in
        floatDuration: 4.0,      // Duration of floating animation
    },
    // Drift distance (pixels)
    drift: {
        xRange: [-80, 80],
        yRange: [-60, 60],
    },
    // Font settings
    font: {
        family: "'Merry Christmas Flake', 'Great Vibes', serif",
        sizeRange: [16, 28],
    },
    // Colors (gold/warm tones)
    colors: [
        'rgba(255, 215, 0, 0.9)',   // Gold
        'rgba(255, 223, 128, 0.85)', // Light gold
        'rgba(255, 200, 100, 0.8)',  // Warm gold
        'rgba(255, 245, 200, 0.75)', // Cream gold
    ],
} as const;

interface ScatterTextInstance {
    id: number;
    x: number;
    y: number;
    driftX: number;
    driftY: number;
    fontSize: number;
    color: string;
    rotation: number;
    delay: number;
}

/**
 * Generate random scatter positions ensuring good distribution
 */
function generateScatterInstances(count: number): ScatterTextInstance[] {
    const instances: ScatterTextInstance[] = [];
    const { positionRange, drift, font, colors, animation } = SCATTER_CONFIG;

    for (let i = 0; i < count; i++) {
        // Distribute positions in a grid-like pattern with randomness
        const gridX = (i % 3) / 3;
        const gridY = Math.floor(i / 3) / 3;

        // Add randomness to grid positions
        const randomOffsetX = (Math.random() - 0.5) * 0.25;
        const randomOffsetY = (Math.random() - 0.5) * 0.25;

        const x = positionRange.xMin + (gridX + randomOffsetX + 0.15) * (positionRange.xMax - positionRange.xMin);
        const y = positionRange.yMin + (gridY + randomOffsetY + 0.15) * (positionRange.yMax - positionRange.yMin);

        // Random drift direction
        const driftX = drift.xRange[0] + Math.random() * (drift.xRange[1] - drift.xRange[0]);
        const driftY = drift.yRange[0] + Math.random() * (drift.yRange[1] - drift.yRange[0]);

        // Random font size
        const fontSize = font.sizeRange[0] + Math.random() * (font.sizeRange[1] - font.sizeRange[0]);

        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];

        // Random rotation
        const rotation = (Math.random() - 0.5) * 20; // -10 to 10 degrees

        instances.push({
            id: i,
            x: Math.max(positionRange.xMin, Math.min(positionRange.xMax, x)),
            y: Math.max(positionRange.yMin, Math.min(positionRange.yMax, y)),
            driftX,
            driftY,
            fontSize,
            color,
            rotation,
            delay: i * animation.staggerDelay,
        });
    }

    return instances;
}

export const MerryChristmasScatter: React.FC = () => {
    const userName = useStore((state) => state.userName);
    const treeMorphState = useStore((state) => state.treeMorphState);
    const isExploded = useStore((state) => state.isExploded);
    const landingPhase = useStore((state) => state.landingPhase);

    const [isVisible, setIsVisible] = useState(false);
    const prevMorphStateRef = useRef(treeMorphState);

    // Detect when explosion animation completes (morphing-out -> idle while exploded)
    useEffect(() => {
        const prevMorphState = prevMorphStateRef.current;

        // Debug log
        console.log('[MerryChristmasScatter] State:', {
            userName,
            treeMorphState,
            prevMorphState,
            isExploded,
            landingPhase,
            isVisible
        });

        // Trigger visibility when: explosion complete AND in tree phase AND is exploded
        if (
            prevMorphState === 'morphing-out' &&
            treeMorphState === 'idle' &&
            isExploded &&
            landingPhase === 'tree'
        ) {
            console.log('[MerryChristmasScatter] Explosion complete, showing scatter text');
            setIsVisible(true);
        }

        // Also trigger if we're already in the exploded idle state (page refresh case)
        if (
            treeMorphState === 'idle' &&
            isExploded &&
            landingPhase === 'tree' &&
            !isVisible &&
            userName
        ) {
            console.log('[MerryChristmasScatter] Already exploded, showing scatter text');
            setIsVisible(true);
        }

        // Hide when tree is reset (no longer exploded)
        if (!isExploded && isVisible) {
            console.log('[MerryChristmasScatter] Tree reset, hiding scatter text');
            setIsVisible(false);
        }

        prevMorphStateRef.current = treeMorphState;
    }, [treeMorphState, isExploded, landingPhase, userName, isVisible]);

    // Generate scatter instances
    const instances = useMemo(() => {
        if (!isVisible) return [];
        return generateScatterInstances(SCATTER_CONFIG.instanceCount);
    }, [isVisible]);

    // Build the greeting text
    const greetingText = useMemo(() => {
        if (!userName) return 'Merry Christmas!';
        const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
        return `Merry Christmas, ${capitalizedName}!`;
    }, [userName]);

    if (!isVisible || !userName) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
            aria-hidden="true"
        >
            <AnimatePresence>
                {instances.map((instance) => (
                    <motion.div
                        key={instance.id}
                        className="absolute whitespace-nowrap"
                        style={{
                            left: `${instance.x}%`,
                            top: `${instance.y}%`,
                            fontSize: `${instance.fontSize}px`,
                            fontFamily: SCATTER_CONFIG.font.family,
                            color: instance.color,
                            textShadow: `
                                0 0 10px rgba(255, 215, 0, 0.5),
                                0 0 20px rgba(255, 200, 100, 0.3),
                                0 2px 4px rgba(0, 0, 0, 0.3)
                            `,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{
                            opacity: 0,
                            scale: 0.8,
                            rotate: instance.rotation,
                            x: 0,
                            y: 0,
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: instance.driftX,
                            y: instance.driftY,
                            rotate: instance.rotation,
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.8,
                            transition: { duration: 0.5 }
                        }}
                        transition={{
                            // Independent property transitions
                            opacity: { duration: SCATTER_CONFIG.animation.fadeInDuration, delay: instance.delay },
                            scale: { duration: SCATTER_CONFIG.animation.fadeInDuration, delay: instance.delay },
                            // Drift takes longer
                            x: { duration: SCATTER_CONFIG.animation.floatDuration, ease: 'easeOut', delay: instance.delay },
                            y: { duration: SCATTER_CONFIG.animation.floatDuration, ease: 'easeOut', delay: instance.delay },
                            rotate: { duration: SCATTER_CONFIG.animation.floatDuration, ease: 'easeOut', delay: instance.delay },
                        }}
                    >
                        {greetingText}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default MerryChristmasScatter;
