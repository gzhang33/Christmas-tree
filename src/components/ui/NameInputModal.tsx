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
    onSubmit: (name: string) => void;
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
                    {/* Backdrop with blur */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

                    {/* Modal Content */}
                    <motion.div
                        className="relative z-10 flex flex-col items-center gap-8 px-8 py-12 max-w-md w-full mx-4"
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

                        {/* Submit Button */}
                        <motion.button
                            onClick={handleSubmit}
                            aria-busy={isSubmitting}
                            disabled={isSubmitting || inputValue.trim().length === 0}
                            className="px-10 py-4 text-lg font-semibold text-black bg-gradient-to-r 
                                     from-amber-400 to-amber-500 rounded-full
                                     shadow-lg shadow-amber-500/30
                                     disabled:opacity-50 disabled:cursor-not-allowed
                                     hover:from-amber-300 hover:to-amber-400
                                     transition-all duration-300"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSubmitting ? 'Loading...' : 'Continue →'}
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
