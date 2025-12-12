/**
 * NameInputModal Component
 * 
 * Full-screen modal for collecting user name on first visit.
 * Features:
 * - localStorage check for existing user_name
 * - Input validation (1-20 chars, alphanumeric + Chinese)
 * - Enter key / button submit
 * - Triggers audio context resume on submit
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { INTERACTION_CONFIG } from '../../config';

interface NameInputModalProps {
    onSubmit: (name: string) => Promise<void>;
    isVisible: boolean;
}
// Get validation config
const { validation, errorMessages } = INTERACTION_CONFIG.nameInput;

/**
 * Validates user name input
 * @returns Object with valid boolean and optional error message
 */
function validateUserName(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();

    if (trimmed.length < validation.minLength) {
        return { valid: false, error: errorMessages.empty };
    }

    if (trimmed.length > validation.maxLength) {
        return { valid: false, error: errorMessages.tooLong(validation.maxLength) };
    }

    if (!validation.pattern.test(trimmed)) {
        return { valid: false, error: errorMessages.invalidChars };
    }
    return { valid: true };
}

export const NameInputModal: React.FC<NameInputModalProps> = ({
    onSubmit,
    isVisible,
}) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input on mount
    useEffect(() => {
        if (isVisible && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isVisible]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        // Clear error when user types
        if (error) setError(null);
    }, [error]);

    const handleSubmit = useCallback(async () => {
        const validation = validateUserName(inputValue);

        if (!validation.valid) {
            setError(validation.error || 'Invalid input');
            return;
        }

        setIsSubmitting(true);
        const trimmedName = inputValue.trim();

        try {
            await onSubmit(trimmedName);
            // Don't reset submitting here as component will likely unmount or transition
        } catch (err) {
            setError(errorMessages.submitFailed);
            setIsSubmitting(false);
        }
    }, [inputValue, onSubmit]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
        },
        [handleSubmit]
    );

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: INTERACTION_CONFIG.nameInput.animation.modalFadeDuration }}
                >
                    {/* Backdrop with blur - below snow */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />

                    {/* Modal Content - above snow */}
                    <motion.div
                        className="relative z-50 flex flex-col items-center gap-8 px-8 py-12 max-w-md w-full mx-4"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -30, opacity: 0 }}
                        transition={{ delay: INTERACTION_CONFIG.nameInput.animation.contentDelay, duration: INTERACTION_CONFIG.nameInput.animation.contentDuration, ease: 'easeOut' }}
                    >
                        {/* Title */}
                        <div className="text-center">
                            <h1 id="modal-title" className="text-4xl md:text-5xl font-bold text-white mb-3"
                                style={{ fontFamily: "'Merry Christmas Flake', 'Great Vibes', serif" }}>
                                Welcome
                            </h1>
                            <p className="text-white/70 text-lg">
                                请输入您的名称 / Enter your name
                            </p>
                        </div>

                        {/* Input Field */}
                        <div className="w-full">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Your name..."
                                maxLength={validation.maxLength}
                                aria-invalid={!!error}
                                aria-describedby={error ? "name-error" : undefined}
                                className="w-full px-6 py-4 text-xl text-center text-white bg-white/10 
                                         border-2 border-white/30 rounded-xl
                                         placeholder-white/40 outline-none
                                         focus:border-amber-400/70 focus:bg-white/15
                                         transition-all duration-300"
                                disabled={isSubmitting}
                            />

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        id="name-error"
                                        role="alert"
                                        className="mt-3 text-center text-red-400 text-sm"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Submit Button - Christmas Themed */}
                        <motion.button
                            onClick={handleSubmit}
                            aria-busy={isSubmitting}
                            disabled={isSubmitting || inputValue.trim().length === 0}
                            className="group relative px-12 py-5 text-lg font-bold text-white overflow-hidden
                                     rounded-full z-[999]
                                     disabled:cursor-not-allowed
                                     transition-all duration-500"
                            style={{
                                background: isSubmitting || inputValue.trim().length === 0
                                    ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.3) 0%, rgba(185, 28, 28, 0.3) 100%)'
                                    : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                                border: '3px solid #fbbf24',
                                boxShadow: isSubmitting || inputValue.trim().length === 0
                                    ? 'none'
                                    : '0 0 30px rgba(220, 38, 38, 0.6), 0 0 60px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                            whileHover={!(isSubmitting || inputValue.trim().length === 0) ? {
                                scale: 1.08,
                                boxShadow: '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)'
                            } : {}}
                            whileTap={!(isSubmitting || inputValue.trim().length === 0) ? { scale: 0.95 } : {}}
                        >
                            {/* Shimmer effect */}
                            {!(isSubmitting || inputValue.trim().length === 0) && (
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                    animate={{
                                        x: ['-200%', '200%']
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        repeatDelay: 1,
                                        ease: 'linear'
                                    }}
                                />
                            )}

                            {/* Sparkle decorations */}
                            {!(isSubmitting || inputValue.trim().length === 0) && (
                                <>
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse">✨</span>
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>✨</span>
                                </>
                            )}

                            {/* Button text */}
                            <span className="relative z-10 flex items-center gap-2">
                                {isSubmitting ? (
                                    <>
                                        <motion.span
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        >
                                            🎄
                                        </motion.span>
                                        <span>Loading...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>开始圣诞之旅</span>
                                        <motion.span
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            →
                                        </motion.span>
                                    </>
                                )}
                            </span>
                        </motion.button>

                        {/* Decorative snowflakes */}
                        <div className="absolute -top-10 left-1/4 text-4xl opacity-30 animate-pulse">❄️</div>
                        <div className="absolute -bottom-8 right-1/4 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>❄️</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default NameInputModal;
