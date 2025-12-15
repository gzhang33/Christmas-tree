/**
 * Landing Title Component
 *
 * Refactored to use high-quality 2D typography overlay with HTML/CSS
 * replacing the previous particle-based implementation.
 * 
 * Features:
 * - Christmas Star font for title
 * - Festive entrance animation with scale, blur, and glow effects
 * - Username visibility coordination with UsernameTransition component
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { useLandingFlow } from '../../contexts/LandingFlowContext';
import { LANDING_CONFIG } from '../../config/landing';
import VaporizeTextCycle, { Tag } from './vapour-text-effect';

interface LandingTitleProps {
    onEntranceComplete?: () => void; // Kept for compatibility, though flow is now driven by internal state
}

export const LandingTitle: React.FC<LandingTitleProps> = () => {
    const context = useLandingFlow();
    const userNameRaw = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);
    const usernameTransitionComplete = useStore((state) => state.usernameTransitionComplete);

    // Derived state
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : 'Friend';

    const setLandingPhase = useStore((state) => state.setLandingPhase);

    // Internal state for "fading out" logic unique to this UI layer
    const [isExiting, setIsExiting] = useState(false);

    // Track if title entrance animation has completed
    const [titleEntranceComplete, setTitleEntranceComplete] = useState(false);

    // Trigger next sequence when fade out completes
    const handleExitComplete = () => {
        // Transition to morphing phase (which triggers 3D particles)
        // We add a slight delay to ensure particles have cleared screen visually if needed, 
        // though the callback is called when all vaporized.
        setLandingPhase('morphing');
    };

    // User interaction handler
    const handleClick = () => {
        setIsExiting(true);
    };

    // Auto-trigger entrance complete when fully visible
    useEffect(() => {
        if (landingPhase === 'entrance') {
            if (context.onEntranceComplete) {
                const timer = setTimeout(() => context.onEntranceComplete(), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [landingPhase, context.onEntranceComplete]);

    // Auto-trigger exit after 2 seconds in text phase
    useEffect(() => {
        if (landingPhase === 'text' && !isExiting) {
            const timer = setTimeout(() => {
                setIsExiting(true);
            }, 2000); // 2 seconds auto-trigger
            return () => clearTimeout(timer);
        }
    }, [landingPhase, isExiting]);

    // Reset states when entering entrance phase
    useEffect(() => {
        if (landingPhase === 'entrance') {
            setTitleEntranceComplete(false);
            setIsExiting(false);
        }
    }, [landingPhase]);

    // Render AnimatePresence always, but conditionally render motion.div inside
    // This allows exit animations to run properly
    const shouldShow = landingPhase !== 'input' && landingPhase !== 'tree' && landingPhase !== 'morphing';

    return (
        <AnimatePresence>
            {shouldShow && (
                <motion.div
                    key="landing-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-between pointer-events-none select-none"
                    style={{
                        background: 'transparent',
                        paddingTop: '30vh',
                        paddingBottom: '15vh'
                    }}
                >
                    {/* Title & Username Section */}
                    <div className="flex flex-col items-center text-center space-y-4 pointer-events-auto relative w-full h-[400px]">
                        {/* Merry Christmas Title with stroke-like particle fade-in animation */}
                        <motion.div
                            className="w-full h-[200px] flex justify-center items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <VaporizeTextCycle
                                texts={["Merry Christmas"]}
                                font={{
                                    fontFamily: "'Merry Christmas Star', 'Mountains of Christmas', cursive",
                                    fontSize: "96px",
                                    fontWeight: 700
                                }}
                                color="rgb(212, 175, 55)" // Gold #D4AF37
                                spread={3}
                                density={5}
                                animation={{
                                    vaporizeDuration: 2.0,
                                    fadeInDuration: 1.5, // 延长淡入时间以模拟渐进stroke效果
                                    waitDuration: 1.0 // 等待1秒后触发退场
                                }}
                                direction="right-to-left" // 退场：从右到左消散
                                entranceDirection="left-to-right" // 入场：从左到右渐进显现
                                alignment="center"
                                tag={Tag.H1}
                                manualTrigger={isExiting}
                                loop={false}
                                onComplete={handleExitComplete}
                            />
                        </motion.div>

                        {/* Username - show after transition completes (entrance) or always (text phase) */}
                        <motion.div
                            className="w-full h-[100px] flex justify-center items-center"
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: (landingPhase === 'text' || usernameTransitionComplete) ? 1 : 0
                            }}
                            transition={{ duration: 0, ease: "easeOut" }}
                        >
                            <VaporizeTextCycle
                                texts={[userName]}
                                font={{
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: "36px",
                                    fontWeight: 400
                                }}
                                color="rgb(244, 227, 178)" // Light Gold #F4E3B2
                                spread={2}
                                density={5}
                                animation={{
                                    vaporizeDuration: 2.0,
                                    fadeInDuration: 1,
                                    waitDuration: 0.5
                                }}
                                direction="left-to-right"
                                alignment="center"
                                tag={Tag.H3}
                                manualTrigger={isExiting}
                                loop={false}
                            />
                        </motion.div>
                    </div>

                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LandingTitle;

