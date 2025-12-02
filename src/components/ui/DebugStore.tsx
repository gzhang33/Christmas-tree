import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';

/**
 * Debug Store Panel
 * 
 * Displays current global state and allows testing state mutations.
 * Toggle with F4 key.
 * 
 * This component helps verify:
 * - Store state updates correctly
 * - LocalStorage persistence works
 * - State changes trigger re-renders
 */
export const DebugStore: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    // Subscribe to all store state
    const treeColor = useStore((state) => state.treeColor);
    const particleCount = useStore((state) => state.particleCount);
    const isExploded = useStore((state) => state.isExploded);
    const activePhotoId = useStore((state) => state.activePhotoId);

    // Subscribe to actions
    const setTreeColor = useStore((state) => state.setTreeColor);
    const setParticleCount = useStore((state) => state.setParticleCount);
    const triggerExplosion = useStore((state) => state.triggerExplosion);
    const resetExplosion = useStore((state) => state.resetExplosion);
    const setActivePhoto = useStore((state) => state.setActivePhoto);

    // Toggle visibility with F4
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setIsVisible((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-md text-white p-4 rounded-lg border border-white/20 shadow-2xl max-w-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider">Debug Store</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/60 hover:text-white text-xs"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                    <span className="text-white/60">treeColor:</span>
                    <span className="text-cyan-400">{treeColor}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-white/60">particleCount:</span>
                    <span className="text-cyan-400">{particleCount}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-white/60">isExploded:</span>
                    <span className={isExploded ? 'text-green-400' : 'text-red-400'}>
                        {isExploded.toString()}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-white/60">activePhotoId:</span>
                    <span className="text-cyan-400">{activePhotoId || 'null'}</span>
                </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Actions</div>

                <button
                    onClick={() => setTreeColor(treeColor === '#FFC0CB' ? '#00FF00' : '#FFC0CB')}
                    className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                >
                    Toggle Tree Color
                </button>

                <button
                    onClick={() => setParticleCount(particleCount === 18000 ? 5000 : 18000)}
                    className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                >
                    Toggle Particle Count
                </button>

                <button
                    onClick={() => isExploded ? resetExplosion() : triggerExplosion()}
                    className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                >
                    {isExploded ? 'Reset' : 'Trigger'} Explosion
                </button>

                <button
                    onClick={() => setActivePhoto(activePhotoId ? null : 'test-photo-1')}
                    className="w-full px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
                >
                    Toggle Active Photo
                </button>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-white/40 text-center">
                Press F4 to toggle • Check LocalStorage
            </div>
        </div>
    );
};
