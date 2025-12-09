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
}

export const ClickPrompt: React.FC<ClickPromptProps> = ({ onClick, isVisible }) => {
    const { animation, breathe, pulse, arrow } = INTERACTION_CONFIG.clickPrompt;

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
                    aria-label="点击点亮圣诞树"
                >                    <motion.div
                    animate={{
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
                        {/* Pulsing ring effect */}
                        <motion.div
                            className="absolute inset-0 -m-4 rounded-full border-2 border-amber-400/30"
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
                        <div className="px-8 py-4 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                            <p className="text-lg md:text-xl text-white font-medium text-center">
                                <span className="text-amber-300">Click</span> to light up the Christmas tree
                            </p>
                            <p className="text-sm md:text-base text-white/70 text-center mt-1">
                                点击屏幕点亮圣诞树 ✨
                            </p>
                        </div>

                        {/* Decorative arrow */}
                        <motion.div
                            animate={{ y: arrow.bounce }}
                            transition={{ duration: animation.arrowBounceDuration, repeat: Infinity }}
                            className="text-amber-400 text-2xl"
                        >
                            ↓
                        </motion.div>
                    </motion.div>
                </motion.button>
            )}
        </AnimatePresence>
    );
};

export default ClickPrompt;
