/**
 * Landing Title Component
 *
 * Refactored to coordinate with 3D TextParticles system.
 * The actual text rendering is now done via WebGL particles in the 3D scene.
 * This component handles:
 * - SEO fallback (hidden DOM elements)
 * - Animation timing coordination
 * - Phase transition triggers
 */
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { useLandingFlow } from '../../contexts/LandingFlowContext';
import { LANDING_CONFIG } from '../../config/landing';

interface LandingTitleProps {
    onEntranceComplete?: () => void;
}

export const LandingTitle: React.FC<LandingTitleProps> = ({ onEntranceComplete }) => {
    const context = useLandingFlow();
    const userNameRaw = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);
    const textParticlePhase = useStore((state) => state.textParticlePhase);
    const setTextParticlePhase = useStore((state) => state.setTextParticlePhase);
    const setLandingPhase = useStore((state) => state.setLandingPhase);

    // Derived state
    const userName = userNameRaw
        ? userNameRaw.charAt(0).toUpperCase() + userNameRaw.slice(1)
        : 'Friend';

    // Ref to track transition timer for cleanup
    const transitionTimerRef = useRef<number | null>(null);

    // Auto-trigger entrance complete when forming animation finishes
    useEffect(() => {
        if (landingPhase === 'entrance' && textParticlePhase === 'visible') {
            if (context.onEntranceComplete) {
                context.onEntranceComplete();
            }
        }
    }, [landingPhase, textParticlePhase, context]);

    // Auto-trigger morphing phase after text display duration
    useEffect(() => {
        if (landingPhase === 'text' && textParticlePhase === 'visible') {
            // Clear any existing timer
            if (transitionTimerRef.current !== null) {
                clearTimeout(transitionTimerRef.current);
            }

            const displayDuration = LANDING_CONFIG.textParticle.animation.displayDuration * 1000;
            transitionTimerRef.current = window.setTimeout(() => {
                setLandingPhase('morphing');
            }, displayDuration);

            return () => {
                if (transitionTimerRef.current !== null) {
                    clearTimeout(transitionTimerRef.current);
                }
            };
        }
    }, [landingPhase, textParticlePhase, setLandingPhase]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (transitionTimerRef.current !== null) {
                clearTimeout(transitionTimerRef.current);
                transitionTimerRef.current = null;
            }
        };
    }, []);

    // SEO fallback - render hidden DOM elements for accessibility and search engines
    const shouldShowSEO = landingPhase !== 'input' && landingPhase !== 'tree';

    return (
        <AnimatePresence>
            {shouldShowSEO && (
                <motion.div
                    key="landing-seo"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0 }} // Keep invisible, SEO only
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 pointer-events-none select-none"
                    style={{ visibility: 'hidden' }}
                    aria-hidden="false"
                >
                    {/* SEO Elements - hidden but accessible to search engines */}
                    <h1
                        style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            padding: 0,
                            margin: '-1px',
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                            whiteSpace: 'nowrap',
                            border: 0,
                        }}
                    >
                        Merry Christmas
                    </h1>
                    <h2
                        style={{
                            position: 'absolute',
                            width: '1px',
                            height: '1px',
                            padding: 0,
                            margin: '-1px',
                            overflow: 'hidden',
                            clip: 'rect(0, 0, 0, 0)',
                            whiteSpace: 'nowrap',
                            border: 0,
                        }}
                    >
                        {userName}
                    </h2>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LandingTitle;


