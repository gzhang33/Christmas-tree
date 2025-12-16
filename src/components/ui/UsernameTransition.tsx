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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate target position - matches LandingTitle layout:
    // paddingTop: 30vh, title container ~200px, username container starts after title
    // Title section is flex with h-[400px], title takes first 200px, username at ~200px offset from title top
    const targetY = -100; // Move up from center toward the text phase position

    const textParticlePhase = useStore((state) => state.textParticlePhase);

    useEffect(() => {
        // Start transition animation when title particles are fully visible
        // This ensures the username appears AFTER the "Merry Christmas" title is formed
        if ((landingPhase === 'entrance' || landingPhase === 'text') &&
            textParticlePhase === 'visible' &&
            userName &&
            animationPhase === 'idle') {
            setShowTransition(true);
            setAnimationPhase('flying');
        }


        // Reset when going to other phases
        if (landingPhase === 'input' || landingPhase === 'morphing' || landingPhase === 'tree') {
            setShowTransition(false);
            setAnimationPhase('idle');
        }
    }, [landingPhase, textParticlePhase, userName, animationPhase]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    // Handle animation completion
    const handleAnimationComplete = () => {
        if (animationPhase === 'flying') {
            setAnimationPhase('arrived');
            // Signal to LandingTitle that username transition is complete
            setUsernameTransitionComplete(true);

            // Clear any existing timeout before setting a new one
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Hold this overlay visible longer to allow LandingTitle's VaporizeTextCycle
            // to fully initialize its canvas and render particles (fadeInDuration: 1s)
            timeoutRef.current = setTimeout(() => {
                setShowTransition(false);
                timeoutRef.current = null;
            }, 1000);
        }
    };

    if (!userName) return null;

    const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

    return (
        <AnimatePresence>
            {showTransition && (
                <motion.div
                    ref={containerRef}
                    className="fixed inset-0 z-40 pointer-events-none flex flex-col items-center"
                    style={{ paddingTop: '30vh' }}
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.5 } }}
                >
                    {/* Spacer for Title (200px) + Gap (space-y-4 = 16px) */}
                    <div style={{ height: '200px', flexShrink: 0 }} />
                    <div style={{ height: '16px', flexShrink: 0 }} />

                    {/* Target Container - matches LandingTitle username section */}
                    <div className="w-full h-[100px] flex justify-center items-center">
                        {/* Flying username text - Shared Element Target */}
                        <motion.div
                            layoutId="username-hero"
                            className="text-4xl md:text-5xl text-white"
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontWeight: 400,
                                textShadow: '0 0 20px rgba(244, 227, 178, 0.6)',
                                color: 'rgb(244, 227, 178)', // Light Gold #F4E3B2
                            }}
                            initial={{ opacity: 1, scale: 0.72 }}
                            animate={{
                                opacity: 1,
                                scale: 0.72,
                                transition: {
                                    duration: 1.5,
                                    ease: [0.43, 0.13, 0.23, 0.96]
                                }
                            }}
                            onLayoutAnimationComplete={handleAnimationComplete}
                        >
                            {displayName}
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UsernameTransition;

