import React, { useState, useEffect } from 'react';
import { Settings, Upload, Camera, X, Wand2, RefreshCcw, Palette, Share2, Check, AlertCircle, Music } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { UIState } from '../../types.ts';
import { COLOR_CONFIG } from '../../config/colors';
import { INTERACTION_CONFIG } from '../../config';
import { AUDIO_CONFIG } from '../../config/audio';
import { MusicSelect } from './MusicSelect';

interface ControlsProps {
    uiState: UIState; // Keeping for backward compatibility during migration, but will prefer store
}

export const Controls: React.FC<ControlsProps> = ({ uiState }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Global State
    const treeColor = useStore((state) => state.treeColor);
    const particleCount = useStore((state) => state.particleCount);
    const isExploded = useStore((state) => state.isExploded);
    const magicDustColor = useStore((state) => state.magicDustColor);
    const selectedAudioId = useStore((state) => state.selectedAudioId);
    const setTreeColor = useStore((state) => state.setTreeColor);
    const setParticleCount = useStore((state) => state.setParticleCount);
    const setMagicDustColor = useStore((state) => state.setMagicDustColor);
    const setSelectedAudioId = useStore((state) => state.setSelectedAudioId);
    const triggerExplosion = useStore((state) => state.triggerExplosion);
    const resetExplosion = useStore((state) => state.resetExplosion);

    // Local state for debounce
    const [localParticleCount, setLocalParticleCount] = useState(particleCount);

    // Sync local state when store changes externally
    useEffect(() => {
        setLocalParticleCount(particleCount);
    }, [particleCount]);

    // Debounce update to store with longer delay for performance (TREE-08)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localParticleCount !== particleCount) {
                // Perform update only after user stops sliding
                setParticleCount(localParticleCount);
            }
        }, INTERACTION_CONFIG.controls.debounce.particleCountDelay); // Debounce delay from config
        return () => clearTimeout(timer);
    }, [localParticleCount, setParticleCount, particleCount]);

    // Local state from props (for things not yet in store or specific to UI interaction)
    const { updateConfig, addPhotos, photos, isMuted, toggleMute } = uiState;

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [failedUploads, setFailedUploads] = useState<string[]>([]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            setUploadProgress(0);
            setFailedUploads([]); // Reset previous errors

            try {
                // Dynamically import utility to avoid bundling if not used
                const { uploadToCloudinary } = await import('../../utils/cloudinaryUtils');

                const files = Array.from(e.target.files);
                const uploadedUrls: string[] = [];
                const currentFailedFiles: string[] = [];
                const totalFiles = files.length;

                const progressMap = new Map<number, number>();
                // Process files sequentially or parallel (parallel for speed)
                // We'll map file objects to simple { id, url } format expected by addPhotos
                // Batch upload, max 8 files per batch
                const batchSize = INTERACTION_CONFIG.controls.upload.batchSize;
                for (let i = 0; i < files.length; i += batchSize) {
                    const batch = files.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (file, batchIndex) => {
                        const index = i + batchIndex;
                        try {
                            const url = await uploadToCloudinary(file, (percent) => {
                                progressMap.set(index, percent);
                                const total = Array.from(progressMap.values()).reduce((a, b) => a + b, 0);
                                setUploadProgress(Math.round(total / totalFiles));
                            });
                            uploadedUrls.push(url);
                        } catch (err) {
                            console.error(`Failed to upload ${file.name}:`, err);
                            currentFailedFiles.push(file.name);
                            // Fallback to local Data URL if cloud upload fails
                            const dataUrl = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = (e) => resolve(e.target?.result as string);
                                reader.onerror = () => resolve(''); // 考虑是否应该 reject 而不是返回空字符串
                                reader.readAsDataURL(file);
                            });
                            if (dataUrl) {
                                uploadedUrls.push(dataUrl);
                            }
                            // Update progress for failed file to ensure total reaches 100%
                            progressMap.set(index, 100);
                            const total = Array.from(progressMap.values()).reduce((a, b) => a + b, 0);
                            setUploadProgress(Math.round(total / totalFiles));
                        }
                    }));
                }

                if (currentFailedFiles.length > 0) {
                    setFailedUploads(currentFailedFiles);
                }

                // Add all successfully processed URLs (cloud or fallback)
                if (uploadedUrls.length > 0) {
                    addPhotos(uploadedUrls);
                }


            } catch (error) {
                // Fallback: Use Data URL if cloud upload completely fails
                const fallbackUrls = await Promise.all(
                    Array.from(e.target.files).map(file =>
                        new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target?.result as string);
                            reader.onerror = () => resolve(''); // 失败时返回空字符串
                            reader.readAsDataURL(file);
                        })
                    )
                );
                addPhotos(fallbackUrls.filter(url => url !== ''));
                setFailedUploads(Array.from(e.target.files).map(f => f.name));
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
                // Clear file input so same file can be selected again if needed
                e.target.value = '';
            }
        }
    };

    const handleToggleExplosion = () => {
        if (isExploded) {
            resetExplosion();
        } else {
            triggerExplosion();
        }
    };



    return (
        <AnimatePresence>
            {!isExploded && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-0 right-0 h-full pointer-events-none flex flex-col items-end z-50 p-4 sm:p-6 gap-4"
                >
                    {/* Toggle Button with pulse animation */}
                    <motion.button
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={isOpen ? 'Close controls panel' : 'Open controls panel'}
                        className="pointer-events-auto bg-deep-gray-blue/80 backdrop-blur-xl p-3 rounded-full border border-electric-purple/50 shadow-[0_0_15px_rgba(128,90,213,0.4)] hover:shadow-[0_0_25px_rgba(213,63,140,0.6)] hover:bg-deep-gray-blue transition-all text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-pink"
                        animate={!isOpen ? {
                            scale: [1, 1.08, 1],
                            boxShadow: [
                                '0 0 15px rgba(128,90,213,0.4)',
                                '0 0 25px rgba(213,63,140,0.6)',
                                '0 0 15px rgba(128,90,213,0.4)'
                            ]
                        } : {}}
                        transition={{ repeat: Infinity, duration: INTERACTION_CONFIG.controls.animation.buttonPulseDuration, ease: 'easeInOut' }}
                    >
                        {isOpen ? <X size={24} /> : <Settings size={24} />}
                    </motion.button>

                    {/* Main Panel */}
                    <motion.div
                        initial={false}
                        animate={{
                            opacity: isOpen ? 1 : 0,
                            scale: isOpen ? 1 : 0.95,
                            y: isOpen ? 0 : 10,
                            pointerEvents: isOpen ? 'auto' : 'none',
                        }}
                        transition={{ duration: INTERACTION_CONFIG.controls.animation.panelTransitionDuration, ease: 'easeOut' }}
                        className="relative rounded-3xl border border-electric-purple/30 bg-deep-gray-blue/90 backdrop-blur-2xl p-6 w-[min(320px,85vw)] text-white shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-y-auto max-h-[90vh]"
                    >
                        {/* Decorative Elements */}
                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,_rgba(213,63,140,0.3),_transparent_60%)]" aria-hidden />
                        <div className="absolute inset-x-8 top-6 h-px bg-gradient-to-r from-transparent via-electric-purple/50 to-transparent" aria-hidden />

                        <div className="relative z-10">
                            <h2 className="text-2xl font-light mb-6 flex items-center gap-2 tracking-[0.2em] uppercase text-white/90 font-sans">
                                <Wand2 className="text-neon-pink drop-shadow-[0_0_8px_rgba(213,63,140,0.8)]" />
                                <span>Controls</span>
                            </h2>

                            {/* Action Section */}
                            <div className="mb-8 space-y-4">
                                <p className="text-[0.65rem] text-teal-accent uppercase tracking-[0.2em] font-bold">Actions</p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleToggleExplosion}
                                        aria-label={isExploded ? "Rebuild the tree" : "Explode the tree"}
                                        className="flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold uppercase tracking-widest text-[0.7rem] transition-all duration-300 shadow-lg bg-gradient-to-r from-electric-purple to-neon-pink hover:shadow-[0_0_20px_rgba(213,63,140,0.5)] text-white border border-white/10"
                                    >
                                        {isExploded ? <RefreshCcw size={18} /> : <Camera size={18} />}
                                        {isExploded ? 'Rebuild' : 'Reveal'}
                                    </button>



                                    <button
                                        onClick={() => {
                                            // Check for local Data URLs which break sharing
                                            const hasLocalPhotos = photos.some(p => p.url.startsWith('data:'));

                                            if (hasLocalPhotos) {
                                                alert("提示：部分照片保存在本地，分享链接可能无法被其他人打开。\n\n建议重新上传照片以获得永久分享链接。");
                                            }

                                            const url = uiState.generateShareUrl();
                                            navigator.clipboard.writeText(url)
                                                .then(() => {
                                                    setIsCopied(true);
                                                    setTimeout(() => setIsCopied(false), INTERACTION_CONFIG.controls.toast.copySuccessDuration);
                                                })
                                                .catch((err) => {
                                                    console.error('Failed to copy:', err);
                                                    alert('链接复制失败，请手动复制');
                                                });
                                        }}
                                        className={`p-2 rounded-full border transition-all duration-300 ${isCopied
                                            ? 'border-green-500 text-green-500 bg-green-500/10'
                                            : 'border-white/20 text-white hover:bg-electric-purple/20 hover:border-electric-purple'}`}
                                        title={isCopied ? "Copied!" : "Share Memory"}
                                        aria-label="Share Memory"
                                    >
                                        <AnimatePresence mode="wait" initial={false}>
                                            {isCopied ? (
                                                <motion.div
                                                    key="check"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                >
                                                    <Check size={18} />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="share"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                >
                                                    <Share2 size={18} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </div>
                            </div>

                            {/* Configuration Section */}
                            <div className="mb-8 space-y-6">
                                <p className="text-[0.65rem] text-teal-accent uppercase tracking-[0.2em] font-bold">Settings</p>

                                {/* Tree Color */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center">
                                        <span>Tree Color</span>
                                        <span className="text-xs font-mono font-bold text-electric-purple">{treeColor.substring(0, 7)}</span>
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLOR_CONFIG.tree.presets.map(({ hex, name }) => (
                                            <button
                                                key={hex}
                                                onClick={() => setTreeColor(hex)}
                                                aria-label={`Select color ${name}`}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${treeColor.toLowerCase().startsWith(hex.toLowerCase())
                                                    ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110'
                                                    : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                                                style={{ backgroundColor: hex }}
                                            />
                                        ))}
                                        <div className="relative group">
                                            <input
                                                type="color"
                                                value={treeColor}
                                                onChange={(e) => setTreeColor(e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                                aria-label="Custom color picker"
                                            />
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white/10 transition-all ${!COLOR_CONFIG.tree.presets.some(c => treeColor.toLowerCase().startsWith(c.hex.toLowerCase()))
                                                ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110'
                                                : 'border-transparent opacity-70 group-hover:opacity-100'}`}>
                                                <Palette size={20} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Magic Dust Color */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center">
                                        <span>Magic Dust Color</span>
                                        <span className="text-xs font-mono font-bold text-electric-purple">{magicDustColor.substring(0, 7)}</span>
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {COLOR_CONFIG.magicDust.presets.map(({ hex, name }) => (
                                            <button
                                                key={hex}
                                                onClick={() => setMagicDustColor(hex)}
                                                aria-label={`Select magic dust color ${name}`}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${magicDustColor.toLowerCase().startsWith(hex.toLowerCase())
                                                    ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110'
                                                    : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                                                style={{ backgroundColor: hex }}
                                            />
                                        ))}
                                        <div className="relative group">
                                            <input
                                                type="color"
                                                value={magicDustColor}
                                                onChange={(e) => setMagicDustColor(e.target.value)}
                                                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                                                aria-label="Custom magic dust color picker"
                                            />
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white/10 transition-all ${!COLOR_CONFIG.magicDust.presets.some(c => magicDustColor.toLowerCase().startsWith(c.hex.toLowerCase()))
                                                ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110'
                                                : 'border-transparent opacity-70 group-hover:opacity-100'}`}>
                                                <Palette size={20} className="text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Particle Count */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center">
                                        <span>Particle Count</span>
                                        <span className="text-xs font-mono font-bold text-electric-purple">{localParticleCount.toLocaleString()}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={INTERACTION_CONFIG.controls.ranges.particleCount.min.toString()}
                                        max={INTERACTION_CONFIG.controls.ranges.particleCount.max.toString()}
                                        step={INTERACTION_CONFIG.controls.ranges.particleCount.step.toString()}
                                        value={localParticleCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setLocalParticleCount(val);
                                        }}
                                        className="w-full h-2 bg-deep-gray-blue rounded-lg appearance-none cursor-pointer accent-neon-pink hover:accent-electric-purple transition-colors border border-white/10"
                                        aria-label="Adjust particle count"
                                    />
                                </div>

                                {/* Rotation Speed */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center">
                                        <span>Rotation Speed</span>
                                        <span className="text-xs font-mono font-bold text-electric-purple">{uiState.config.rotationSpeed.toFixed(1)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={INTERACTION_CONFIG.controls.ranges.rotationSpeed.min.toString()}
                                        max={INTERACTION_CONFIG.controls.ranges.rotationSpeed.max.toString()}
                                        step={INTERACTION_CONFIG.controls.ranges.rotationSpeed.step.toString()}
                                        value={uiState.config.rotationSpeed}
                                        onChange={(e) => updateConfig('rotationSpeed', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-deep-gray-blue rounded-lg appearance-none cursor-pointer accent-neon-pink hover:accent-electric-purple transition-colors border border-white/10"
                                        aria-label="Adjust rotation speed"
                                    />
                                </div>

                                {/* Photo Scale */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center">
                                        <span>Photo Scale</span>
                                        <span className="text-xs font-mono font-bold text-electric-purple">{uiState.config.photoSize.toFixed(1)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={INTERACTION_CONFIG.controls.ranges.photoSize.min.toString()}
                                        max={INTERACTION_CONFIG.controls.ranges.photoSize.max.toString()}
                                        step={INTERACTION_CONFIG.controls.ranges.photoSize.step.toString()}
                                        value={uiState.config.photoSize}
                                        onChange={(e) => updateConfig('photoSize', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-deep-gray-blue rounded-lg appearance-none cursor-pointer accent-neon-pink hover:accent-electric-purple transition-colors border border-white/10"
                                        aria-label="Adjust photo scale"
                                    />
                                </div>

                                {/* Background Music */}
                                <div className="space-y-3">
                                    <label className="text-sm text-white/60 flex justify-between items-center mb-1">
                                        <span className="flex items-center gap-2">
                                            <Music size={16} className="text-teal-accent" />
                                            Background Music
                                        </span>
                                    </label>
                                    <MusicSelect
                                        options={AUDIO_CONFIG.options}
                                        value={selectedAudioId}
                                        onChange={setSelectedAudioId}
                                    />
                                </div>
                            </div>

                            {/* Upload Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[0.65rem] text-teal-accent uppercase tracking-[0.2em] font-bold">
                                        Memories ({photos.length})
                                    </p>
                                    <span className="text-[0.65rem] text-white/40 uppercase tracking-[0.2em]">Starlit Keepsakes</span>
                                </div>

                                <label className="cursor-pointer border border-dashed border-electric-purple/40 bg-deep-gray-blue/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all group hover:border-neon-pink hover:bg-deep-gray-blue hover:shadow-[0_0_20px_rgba(213,63,140,0.2)] relative overflow-hidden">
                                    <div className={`flex flex-col items-center justify-center gap-3 w-full transition-all duration-300 ${isUploading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-[radial-gradient(circle,_rgba(213,63,140,0.4)_0%,_transparent_70%)] transition-opacity" aria-hidden />
                                        <Upload className="text-electric-purple group-hover:text-neon-pink transition-colors relative z-10" />
                                        <span className="text-xs text-white/80 group-hover:text-white text-center uppercase tracking-[0.2em] relative z-10 font-semibold">
                                            Upload Photos
                                        </span>
                                        <p className="text-[0.65rem] text-white/50 text-center relative z-10">Support multiple files</p>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="hidden"
                                        aria-label="Upload photos"
                                    />

                                    {/* Loading Overlay */}
                                    {isUploading && (
                                        <div
                                            className="absolute inset-0 bg-deep-gray-blue/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300"
                                            role="status"
                                            aria-live="polite"
                                            aria-label={`正在上传，${uploadProgress}%`}
                                        >
                                            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-neon-pink animate-spin mb-2" aria-hidden="true" />
                                            <span className="text-[0.6rem] font-mono text-neon-pink animate-pulse" aria-hidden="true">
                                                UPLOADING {uploadProgress}%
                                            </span>
                                        </div>
                                    )}
                                </label>



                                {/* Error Notification */}
                                <AnimatePresence>
                                    {failedUploads.length > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                            exit={{ opacity: 0, y: -10, height: 0 }}
                                            className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 relative overflow-hidden"
                                            role="alert"
                                            aria-live="assertive"
                                        >
                                            <div className="flex gap-3">
                                                <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-red-200 uppercase tracking-wider mb-1">
                                                        Upload Warning
                                                    </h4>
                                                    <p className="text-[0.65rem] text-red-100/80 mb-2 leading-relaxed">
                                                        {failedUploads.length} file{failedUploads.length > 1 ? 's' : ''} failed to upload to cloud (saved locally). Sharing via URL may not work for these images.
                                                    </p>
                                                    <div className="max-h-20 overflow-y-auto custom-scrollbar-thin bg-black/20 rounded p-2 mb-2">
                                                        <ul className="list-disc list-inside space-y-1">
                                                            {failedUploads.map((name, i) => (
                                                                <li key={i} className="text-[0.6rem] text-red-200/70 truncate" title={name}>
                                                                    {name}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <button
                                                        onClick={() => setFailedUploads([])}
                                                        className="text-[0.65rem] bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-1 rounded transition-colors w-full uppercase tracking-wider font-semibold"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {photos.length > 0 && (
                                    <div className="grid grid-cols-4 gap-2 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                                        {photos.map((p) => (
                                            <div key={p.id} className="aspect-square rounded-lg overflow-hidden relative ring-1 ring-white/20 hover:ring-neon-pink transition-all">
                                                <img src={p.url} alt="preview" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
