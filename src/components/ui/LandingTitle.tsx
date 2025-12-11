/**
 * Landing Title Component
 *
 * Refactored to use high-quality 2D typography overlay with HTML/CSS
 * replacing the previous particle-based implementation.
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

    // Derived state
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : 'Friend';

    const setLandingPhase = useStore((state) => state.setLandingPhase);

    // Internal state for "fading out" logic unique to this UI layer
    const [isExiting, setIsExiting] = useState(false);

    // Trigger next sequence when fade out completes
    const handleExitComplete = () => {
        console.log('[LandingTitle] handleExitComplete called, setting phase to morphing');
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
        if (landingPhase === 'entrance' || landingPhase === 'text') {
            if (context.onEntranceComplete) {
                const timer = setTimeout(() => context.onEntranceComplete(), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [landingPhase, context.onEntranceComplete]);

    // Hide during input, tree, and morphing phases
    if (landingPhase === 'input' || landingPhase === 'tree' || landingPhase === 'morphing') {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                key="landing-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="fixed inset-0 z-30 flex flex-col items-center justify-between pointer-events-none select-none"
                style={{
                    background: 'transparent',
                    paddingTop: '30vh',
                    paddingBottom: '15vh'
                }}
            >
                {/* Title & Username Section */}
                <div className="flex flex-col items-center text-center space-y-4 pointer-events-auto relative w-full h-[400px]">
                    {/* Merry Christmas Title */}
                    <div className="w-full h-[200px] flex justify-center items-center">
                        <VaporizeTextCycle
                            texts={["Merry Christmas"]}
                            font={{
                                fontFamily: "'Mountains of Christmas', cursive",
                                fontSize: "96px", // MD/LG sizes roughly
                                fontWeight: 700
                            }}
                            color="rgb(212, 175, 55)" // Gold #D4AF37
                            spread={3}
                            density={5}
                            animation={{
                                vaporizeDuration: 2.0,
                                fadeInDuration: 1,
                                waitDuration: 0.5
                            }}
                            direction="right-to-left"
                            alignment="center"
                            tag={Tag.H1}
                            manualTrigger={isExiting}
                            loop={false}
                            onComplete={handleExitComplete}
                        />
                    </div>

                    {/* Username */}
                    <div className="w-full h-[100px] flex justify-center items-center">
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
                    </div>
                </div>

                {/* Interaction Button */}
                {!isExiting && (
                    <motion.button
                        className="pointer-events-auto px-8 py-3 rounded-full border border-[#D4AF37] text-[#D4AF37] bg-black/20 backdrop-blur-sm hover:bg-[#D4AF37]/10 transition-colors duration-300"
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '1rem',
                            letterSpacing: '1px',
                            boxShadow: '0 0 15px rgba(212, 175, 55, 0.2)'
                        }}
                        onClick={handleClick}
                        whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(212, 175, 55, 0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                            opacity: [0.8, 1, 0.8],
                            boxShadow: [
                                '0 0 15px rgba(212, 175, 55, 0.2)',
                                '0 0 25px rgba(212, 175, 55, 0.4)',
                                '0 0 15px rgba(212, 175, 55, 0.2)'
                            ]
                        }}
                        transition={{
                            opacity: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                            boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" }
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.5 } }}
                    >
                        Click to light up the tree
                    </motion.button>
                )}

            </motion.div>
        </AnimatePresence>
    );
};

export default LandingTitle;
