/**
 * ActionHint Component
 *
 * Minimalist user guidance hint with breathing animation.
 * Positioned at the corner to avoid obstructing main content.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INTERACTION_CONFIG } from '../../config';

interface ActionHintProps {
    isVisible: boolean;
    text: string;
    subText?: string;
    position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
}

export const ActionHint: React.FC<ActionHintProps> = ({
    isVisible,
    text,
    subText,
    position = 'bottom-center'
}) => {
    const { animation, breathe } = INTERACTION_CONFIG.clickPrompt;

    // Position classes based on position prop
    const positionClasses = {
        'bottom-left': 'left-6',
        'bottom-right': 'right-6',
        'bottom-center': 'left-1/2 -translate-x-1/2'
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`fixed bottom-8 z-40 pointer-events-none select-none ${positionClasses[position]}`}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{
                        duration: animation.fadeDuration,
                        ease: 'easeOut'
                    }}
                >
                    <motion.div
                        animate={{
                            opacity: breathe.opacity,
                            scale: breathe.scale,
                        }}
                        transition={{
                            duration: animation.breatheDuration,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {/* Main text container with both English and Chinese */}
                        <div className="px-5 py-2.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
                            <div className="flex flex-col items-center gap-0.5">
                                {/* English text */}
                                <p className="text-sm md:text-base text-white/90 font-medium text-center whitespace-nowrap tracking-wide">
                                    {text}
                                </p>
                                {/* Chinese text - if provided */}
                                {subText && (
                                    <p className="text-xs text-white/50 text-center">
                                        {subText}
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ActionHint;
