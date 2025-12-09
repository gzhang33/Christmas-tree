import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface PerformanceData {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    particleCount: number;
    lodLevel: string;
    memoryUsage: number;
}

interface DebugStoreProps {
    performanceData?: PerformanceData;
}

/**
 * Debug Store Panel - Enhanced with Scene Monitoring
 * 
 * Displays current global state and performance metrics across different scenes.
 * Toggle with F4 key.
 * 
 * Scenes:
 * - Tree State: Initial display
 * - Explosion: Transition animation
 * - Photo Sea: Photo orbit display
 * - Photo Active: Single photo view
 */
export const DebugStore: React.FC<DebugStoreProps> = ({ performanceData }) => {
    const [isVisible, setIsVisible] = useState(false);

    // Subscribe to all store state
    const treeColor = useStore((state) => state.treeColor);
    const particleCount = useStore((state) => state.particleCount);
    const isExploded = useStore((state) => state.isExploded);
    const hoveredPhotoId = useStore((state) => state.hoveredPhotoId);
    const activePhoto = useStore((state) => state.activePhoto);

    // Subscribe to actions
    const setTreeColor = useStore((state) => state.setTreeColor);
    const setParticleCount = useStore((state) => state.setParticleCount);
    const triggerExplosion = useStore((state) => state.triggerExplosion);
    const resetExplosion = useStore((state) => state.resetExplosion);
    const setActivePhoto = useStore((state) => state.setActivePhoto);

    // Determine current scene
    const getCurrentScene = () => {
        if (activePhoto) return 'Photo Active';
        if (isExploded) return 'Photo Sea';
        return 'Tree State';
    };

    const currentScene = getCurrentScene();

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
        <div className="fixed top-4 left-4 z-50 bg-black/90 backdrop-blur-md text-white p-4 rounded-lg border border-white/30 shadow-2xl max-w-md font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider">Performance Monitor</h3>
                    <div className="text-[10px] text-white/50 mt-0.5">按 F4 切换显示</div>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-white/60 hover:text-white text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                    aria-label="关闭调试面板"
                >
                    ✕
                </button>            </div>
            {/* Current Scene Badge */}
            <div className="mb-3">
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${currentScene === 'Tree State' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    currentScene === 'Photo Sea' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}>
                    <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                    {currentScene}
                </div>
            </div>

            {/* Performance Metrics Section */}
            {performanceData && (
                <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-xs text-white/60 uppercase tracking-wider mb-2 font-semibold">Performance</div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">FPS</span>
                            <span className={`text-lg font-bold ${performanceData.fps >= 55 ? 'text-green-400' :
                                performanceData.fps >= 40 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {performanceData.fps}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">Frame Time</span>
                            <span className="text-lg font-bold text-cyan-400">
                                {performanceData.frameTime.toFixed(1)}ms
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">Draw Calls</span>
                            <span className="text-sm font-semibold text-cyan-400">{performanceData.drawCalls}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">Triangles</span>
                            <span className="text-sm font-semibold text-cyan-400">
                                {performanceData.triangles >= 1000000
                                    ? `${(performanceData.triangles / 1000000).toFixed(1)}M`
                                    : performanceData.triangles >= 1000
                                        ? `${(performanceData.triangles / 1000).toFixed(1)}K`
                                        : performanceData.triangles}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">LOD Level</span>
                            <span className="text-sm font-semibold text-cyan-400">{performanceData.lodLevel}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/50 text-[10px] mb-0.5">VRAM Est.</span>
                            <span className="text-sm font-semibold text-cyan-400">~{performanceData.memoryUsage}MB</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Scene State Section */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-xs text-white/60 uppercase tracking-wider mb-2 font-semibold">Scene State</div>
                <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                        <span className="text-white/50">Particle Count</span>
                        <span className="text-cyan-400 font-semibold">{particleCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white/50">Tree Color</span>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: treeColor }}></div>
                            <span className="text-cyan-400 font-semibold">{treeColor}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white/50">Exploded</span>
                        <span className={`font-semibold ${isExploded ? 'text-green-400' : 'text-red-400'}`}>
                            {isExploded ? '✓ Yes' : '✗ No'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-white/50">Hovered Photo</span>
                        <span className="text-cyan-400 font-semibold">{hoveredPhotoId != null ? `#${hoveredPhotoId}` : 'None'}</span>
                    </div>                    <div className="flex justify-between items-center">
                        <span className="text-white/50">Active Photo</span>
                        <span className="text-cyan-400 font-semibold">{activePhoto ? `ID: ${activePhoto.id}` : 'None'}</span>
                    </div>
                </div>
            </div>

            {/* Performance Comparison - Dynamic */}
            {performanceData && (
                <div className="mb-4 p-3 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                    <div className="text-xs text-green-400 uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
                        <span>📈</span>
                        Performance vs Baseline
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                        {/* FPS Comparison */}
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">FPS Improvement</span>
                            <span className={`font-semibold ${performanceData.fps >= 55 ? 'text-green-400' :
                                performanceData.fps >= 40 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {performanceData.fps >= 55 ? '✓ Excellent' :
                                    performanceData.fps >= 40 ? '~ Good' :
                                        '✗ Needs Work'}
                            </span>
                        </div>

                        {/* Frame Time Comparison */}
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Frame Budget</span>
                            <span className={`font-semibold ${performanceData.frameTime <= 16.7 ? 'text-green-400' :
                                performanceData.frameTime <= 25 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {performanceData.frameTime <= 16.7 ? '✓ 60fps Target' :
                                    performanceData.frameTime <= 25 ? '~ 40fps Target' :
                                        `✗ ${performanceData.frameTime.toFixed(1)}ms`}
                            </span>
                        </div>

                        {/* Draw Calls Efficiency */}
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Draw Call Efficiency</span>
                            <span className={`font-semibold ${performanceData.drawCalls <= 250 ? 'text-green-400' :
                                performanceData.drawCalls <= 400 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {performanceData.drawCalls <= 250 ? '✓ Optimized' :
                                    performanceData.drawCalls <= 400 ? '~ Acceptable' :
                                        '✗ High'}
                            </span>
                        </div>

                        {/* Memory Usage */}
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Memory Usage</span>
                            <span className={`font-semibold ${performanceData.memoryUsage <= 200 ? 'text-green-400' :
                                performanceData.memoryUsage <= 400 ? 'text-yellow-400' :
                                    'text-red-400'
                                }`}>
                                {performanceData.memoryUsage <= 200 ? '✓ Low' :
                                    performanceData.memoryUsage <= 400 ? '~ Moderate' :
                                        '✗ High'}
                            </span>
                        </div>
                    </div>

                    {/* Overall Performance Grade */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                        {(() => {
                            const getPerformanceGrade = (fps: number, frameTime: number) => {
                                if (fps >= 55 && frameTime <= 18) return { text: 'A - Excellent', color: 'text-green-400' };
                                if (fps >= 50 && frameTime <= 20) return { text: 'B - Very Good', color: 'text-green-400' };
                                if (fps >= 40 && frameTime <= 25) return { text: 'C - Good', color: 'text-yellow-400' };
                                if (fps >= 30) return { text: 'D - Fair', color: 'text-orange-400' };
                                return { text: 'F - Poor', color: 'text-red-400' };
                            };

                            const grade = getPerformanceGrade(performanceData.fps, performanceData.frameTime);

                            return (
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-[10px]">Overall Grade</span>
                                    <span className={`font-bold text-sm ${grade.color}`}>
                                        {grade.text}
                                    </span>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="space-y-2">
                <div className="text-xs text-white/60 uppercase tracking-wider mb-2 font-semibold">Quick Actions</div>

                <button
                    onClick={() => isExploded ? resetExplosion() : triggerExplosion()}
                    className="w-full px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded text-xs font-semibold transition-all"
                >
                    {isExploded ? '🔄 Reset Tree' : '💥 Trigger Explosion'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setTreeColor(treeColor === '#FFC0CB' ? '#00FF00' : '#FFC0CB')}
                        className="px-2 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] transition-colors"
                    >
                        🎨 Color
                    </button>
                    <button
                        onClick={() => setParticleCount(particleCount === 18000 ? 5000 : 18000)}
                        className="px-2 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] transition-colors"
                    >
                        ⚡ Particles
                    </button>
                </div>
            </div>

            {/* Footer Note */}
            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-white/40 text-center">
                💡 Tip: Install <span className="text-cyan-400 font-mono">r3f-perf</span> for advanced metrics
            </div>
        </div>
    );
};
