/**
 * ClickPrompt Component
 *
 * Interactive guidance prompt with breathing animation.
 * Displays at bottom of screen to guide user to click and trigger tree morphing.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INTERACTION_CONFIG } from '../../config';

interface ClickPromptProps {
    onClick: () => void;
    isVisible: boolean;
    mainText?: React.ReactNode;
    subText?: string;
    showArrow?: boolean;
}

export const ClickPrompt: React.FC<ClickPromptProps> = ({
    onClick,
    isVisible,
    mainText = <><span className="text-amber-300">Click</span> to light up the Christmas tree</>,
    subText = "点击屏幕点亮圣诞树 ✨",
    showArrow = true
}) => {
    // Safe destructure with defaults to prevent crashes if config is missing
    const {
        animation = {
            fadeDuration: 0.5,
            breatheDuration: 2,
            pulseDuration: 1.5,
            arrowBounceDuration: 1
        },
        breathe = {
            opacity: [0.7, 1, 0.7],
            scale: [1, 1.05, 1]
        },
        pulse = {
            scale: [1, 1.2, 1],
            opacity: [0.3, 0, 0.3]
        },
        arrow = {
            bounce: [0, 5, 0]
        }
    } = INTERACTION_CONFIG?.clickPrompt ?? {};

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: animation.fadeDuration }}
                    onClick={onClick}
                    aria-label="Click to light up the Christmas tree - 点击屏幕点亮圣诞树"
                >                    <motion.div animate={{
                    opacity: breathe.opacity,
                    scale: breathe.scale,
                }}
                    transition={{
                        duration: animation.breatheDuration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="relative flex flex-col items-center gap-2"
                >
                        {/* Content Container (Ring + Text) */}
                        <div className="relative">
                            {/* Pulsing ring effect - Now scoped to text box */}
                            <motion.div
                                className="absolute inset-0 -m-1 md:-m-2 rounded-full border-2 border-amber-400/30"
                                animate={{
                                    scale: pulse.scale,
                                    opacity: pulse.opacity,
                                }}
                                transition={{
                                    duration: animation.pulseDuration,
                                    repeat: Infinity,
                                    ease: 'easeOut',
                                }}
                            />

                            {/* Text content */}
                            <div className="px-5 py-3 md:px-8 md:py-4 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 whitespace-nowrap">
                                <p className="text-base sm:text-lg md:text-xl text-white font-medium text-center leading-none">
                                    {mainText}
                                </p>
                                <p className="text-xs sm:text-sm md:text-base text-white/70 text-center mt-1.5 leading-none">
                                    {subText}
                                </p>
                            </div>
                        </div>

                        {/* Decorative arrow */}
                        {showArrow && (
                            <motion.div
                                animate={{ y: arrow.bounce }}
                                transition={{ duration: animation.arrowBounceDuration, repeat: Infinity }}
                                className="text-amber-400 text-xl md:text-2xl"
                            >
                                ↓
                            </motion.div>
                        )}
                    </motion.div>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default ClickPrompt;
