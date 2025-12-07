/**
 * Text Title Component - Dreamy Edition
 * 
 * Renders "Merry Christmas" with ethereal, dreamy visual effects.
 * Features:
 * - Multi-layer glow with breathing animation
 * - Gradient text with aurora-like shimmer
 * - Soft blur backdrop layer
 * - Twinkling particle accents
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextTitleProps {
    isExploded: boolean;
    isCompact?: boolean;
}

// Dreamy color palette
const COLORS = {
    primary: '#FFFFFF',
    glow1: 'rgba(255, 182, 193, 0.9)',   // Soft pink
    glow2: 'rgba(173, 216, 230, 0.7)',   // Light blue
    glow3: 'rgba(255, 215, 0, 0.5)',     // Gold
    glow4: 'rgba(147, 112, 219, 0.4)',   // Purple
    glow5: 'rgba(64, 224, 208, 0.3)',    // Turquoise
};

export const TextTitle: React.FC<TextTitleProps> = ({
    isExploded,
    isCompact = false,
}) => {
    const fontSize = isCompact ? 60 : 80;

    // Animation variants for fade out on explosion
    const containerVariants = {
        visible: {
            opacity: 1,
            transition: { duration: 0.8 }
        },
        hidden: {
            opacity: 0,
            transition: { duration: 2.5 }
        }
    };

    // Dreamy text shadow with multiple ethereal layers
    const dreamyTextShadow = `
        0 0 5px ${COLORS.primary},
        0 0 10px ${COLORS.glow1},
        0 0 20px ${COLORS.glow1},
        0 0 30px ${COLORS.glow2},
        0 0 40px ${COLORS.glow2},
        0 0 50px ${COLORS.glow3},
        0 0 60px ${COLORS.glow4},
        0 0 80px ${COLORS.glow5}
    `;

    // Blur layer shadow (softer, more spread)
    const blurLayerShadow = `
        0 0 30px ${COLORS.glow1},
        0 0 60px ${COLORS.glow2},
        0 0 90px ${COLORS.glow3}
    `;

    // Shared text line style
    const lineStyle = (indent: number) => ({
        fontSize: `${fontSize}px`,
        marginLeft: `${indent}px`,
    });

    // Text content for each line
    const lines = [
        { text: 'Merry', indent: 0 },
        { text: '1', indent: isCompact ? 32 : 64 },
        { text: 'Christmas6', indent: isCompact ? 64 : 128 },
    ];

    return (
        <AnimatePresence>
            {!isExploded && (
                <motion.div
                    className="absolute pointer-events-none z-10"
                    style={{
                        top: 'clamp(1rem, 4vh, 2rem)',
                        left: 'clamp(1rem, 3vw, 2.5rem)',
                        fontFamily: '"Merry Christmas Flake", "Mountains of Christmas", cursive',
                        lineHeight: 1.1,
                    }}
                    initial="visible"
                    animate="visible"
                    exit="hidden"
                    variants={containerVariants}
                >
                    {/* Blur backdrop layer - creates depth and ethereal glow */}
                    <motion.div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            color: 'rgba(255, 255, 255, 0.15)',
                            textShadow: blurLayerShadow,
                            filter: 'blur(8px)',
                            transform: 'scale(1.02)',
                            zIndex: 0,
                        }}
                        animate={{
                            opacity: [0.4, 0.7, 0.4],
                            scale: [1.02, 1.05, 1.02],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {lines.map((line, i) => (
                            <div key={`blur-${i}`} style={lineStyle(line.indent)}>
                                {line.text}
                            </div>
                        ))}
                    </motion.div>

                    {/* Main text layer with dreamy glow */}
                    <motion.div
                        style={{
                            position: 'relative',
                            color: COLORS.primary,
                            textShadow: dreamyTextShadow,
                            zIndex: 1,
                        }}
                        animate={{
                            textShadow: [
                                dreamyTextShadow,
                                `
                                    0 0 8px ${COLORS.primary},
                                    0 0 15px ${COLORS.glow2},
                                    0 0 25px ${COLORS.glow2},
                                    0 0 35px ${COLORS.glow1},
                                    0 0 45px ${COLORS.glow1},
                                    0 0 55px ${COLORS.glow4},
                                    0 0 65px ${COLORS.glow3},
                                    0 0 85px ${COLORS.glow5}
                                `,
                                dreamyTextShadow,
                            ],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        {lines.map((line, i) => (
                            <div key={`main-${i}`} style={lineStyle(line.indent)}>
                                {line.text}
                            </div>
                        ))}
                    </motion.div>

                    {/* Sparkle particles around text */}
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={`sparkle-${i}`}
                            style={{
                                position: 'absolute',
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: 'white',
                                boxShadow: `0 0 6px 2px ${COLORS.glow1}, 0 0 12px 4px ${COLORS.glow2}`,
                                top: `${15 + (i * 25) % 85}%`,
                                left: `${5 + (i * 37) % 90}%`,
                                zIndex: 2,
                            }}
                            animate={{
                                opacity: [0, 1, 0],
                                scale: [0.5, 1.2, 0.5],
                            }}
                            transition={{
                                duration: 2 + (i * 0.3),
                                repeat: Infinity,
                                delay: i * 0.4,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
