/**
 * UsernameTransition Component
 * 
 * Handles the smooth transition of username from Input phase to Text phase.
 * Creates a flying animation effect from the input center position to the final display position.
 * Signals completion to allow LandingTitle to show the username at the right time.
 */
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';

export const UsernameTransition: React.FC = () => {
    const landingPhase = useStore((state) => state.landingPhase);
    const userName = useStore((state) => state.userName);
    const setUsernameTransitionComplete = useStore((state) => state.setUsernameTransitionComplete);

    const [showTransition, setShowTransition] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'flying' | 'arrived'>('idle');
    const containerRef = useRef<HTMLDivElement>(null);

    // Calculate target position - matches LandingTitle layout:
    // paddingTop: 30vh, title container ~200px, username container starts after title
    // Title section is flex with h-[400px], title takes first 200px, username at ~200px offset from title top
    const targetY = -100; // Move up from center toward the text phase position

    useEffect(() => {
        // Start transition animation when moving from input to entrance
        if (landingPhase === 'entrance' && userName && animationPhase === 'idle') {
            setShowTransition(true);
            setAnimationPhase('flying');
        }

        // Continue showing during text phase until animation completes
        if (landingPhase === 'text' && animationPhase === 'flying') {
            // Animation is ongoing, keep showing
        }

        // Reset when going to other phases
        if (landingPhase === 'input' || landingPhase === 'morphing' || landingPhase === 'tree') {
            setShowTransition(false);
            setAnimationPhase('idle');
        }
    }, [landingPhase, userName, animationPhase]);

    // Handle animation completion
    const handleAnimationComplete = () => {
        if (animationPhase === 'flying') {
            setAnimationPhase('arrived');
            // Signal to LandingTitle that username transition is complete
            setUsernameTransitionComplete(true);

            // Fade out this overlay after a brief moment
            setTimeout(() => {
                setShowTransition(false);
            }, 300);
        }
    };

    if (!userName) return null;

    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

    return (
        <AnimatePresence>
            {showTransition && (
                <motion.div
                    ref={containerRef}
                    className="fixed inset-0 z-45 pointer-events-none flex items-center justify-center"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Flying username text */}
                    <motion.div
                        className="text-4xl md:text-5xl text-white"
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontWeight: 400,
                            textShadow: '0 0 20px rgba(244, 227, 178, 0.6)',
                            color: 'rgb(244, 227, 178)' // Light Gold #F4E3B2
                        }}
                        initial={{
                            y: 0,
                            scale: 1,
                            opacity: 1
                        }}
                        animate={{
                            y: targetY,
                            scale: 0.72, // Scale down to match text phase font size (36px vs ~50px)
                            opacity: 1
                        }}
                        onAnimationComplete={handleAnimationComplete}
                        transition={{
                            duration: 1.8,
                            ease: [0.43, 0.13, 0.23, 0.96] // Custom easing for smooth deceleration
                        }}
                    >
                        {displayName}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UsernameTransition;

