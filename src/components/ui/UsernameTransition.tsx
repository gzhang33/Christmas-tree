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
import { LANDING_CONFIG } from '../../config/landing';

export const UsernameTransition: React.FC = () => {
    const landingPhase = useStore((state) => state.landingPhase);
    const userName = useStore((state) => state.userName);
    const setUsernameTransitionComplete = useStore((state) => state.setUsernameTransitionComplete);

    const [showTransition, setShowTransition] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'flying' | 'arrived'>('idle');
    const containerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < LANDING_CONFIG.title.breakpoints.mobile);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get responsive layout config
    const layoutConfig = LANDING_CONFIG.textParticle.layout;
    const currentTitleY = isMobile ? layoutConfig.titleY.compact : layoutConfig.titleY.normal;
    const currentUsernameY = isMobile ? layoutConfig.usernameY.compact : layoutConfig.usernameY.normal;

    // Convert 3D world units (approximate) to relative CSS offsets for the DOM layer
    // base center is roughly 50vh, 1 world unit ~ 20px
    const titleOffsetPx = currentTitleY * 20;
    const usernameOffsetPx = currentUsernameY * 20;

    const targetY = -100; // Animation target (flying up)

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
                    style={{
                        paddingTop: isMobile ? '15vh' : '25vh',
                        transformStyle: 'preserve-3d'
                    }}
                    initial={{ opacity: 1, transform: "perspective(1000px) translateZ(0px)" }}
                    animate={{ opacity: 1, transform: "perspective(1000px) translateZ(0px)" }}
                    exit={{
                        opacity: 0,
                        transform: "perspective(1000px) translateZ(-2000px)", // Pull Z far away to be covered by tree
                        transition: {
                            duration: 2.0, // Synced with tree entrance
                            ease: "easeInOut"
                        }
                    }}
                >
                    {/* Base positioning container: centers content vertically initially */}
                    <div className="flex-1 w-full flex flex-col items-center justify-center relative">
                        {/* 
                            Visual alignment: 
                            - Title particles are centered at TitleY
                            - Username should be at UsernameY
                            Since we use flex-col, we use absolute positioning or calculated margins to match 3D world.
                         */}

                        {/* Username Target position */}
                        <div
                            className="absolute flex flex-col items-center"
                            style={{
                                // Map 3D Y to CSS translateY (inverted Y)
                                transform: `translateY(${-usernameOffsetPx}px)`
                            }}
                        >
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
                                            duration: 1.2,
                                            ease: [0.43, 0.13, 0.23, 0.96]
                                        }
                                    }}
                                    onLayoutAnimationComplete={handleAnimationComplete}
                                >
                                    {displayName}
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default UsernameTransition;

