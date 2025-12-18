import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { AUDIO_CONFIG } from '../../config/audio';
import { PARTICLE_CONFIG } from '../../config/particles';

interface BackgroundMusicPlayerProps {
    isMuted?: boolean;
    onAudioReady?: (audioElement: HTMLAudioElement) => void;
}

// 移除硬编码常量，改用 AUDIO_CONFIG

/**
 * 背景音乐播放器组件
 * 根据 store 中选中的音频 ID 自动播放对应音乐
 * 支持静音控制和音频就绪回调
 * 处理浏览器自动播放限制，等待用户首次交互
 */
export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({
    isMuted = false,
    onAudioReady
}) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const selectedAudioId = useStore((state) => state.selectedAudioId);
    const [hasUserInteracted, setHasUserInteracted] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const fadeTimerRef = useRef<number | null>(null);

    // 停止淡入动画
    const stopFadeIn = useCallback(() => {
        if (fadeTimerRef.current) {
            cancelAnimationFrame(fadeTimerRef.current);
            fadeTimerRef.current = null;
        }
    }, []);

    // 音量淡入效果
    const fadeInVolume = useCallback((audio: HTMLAudioElement) => {
        stopFadeIn();

        const startTime = performance.now();
        const startVolume = 0;
        const targetVolume = AUDIO_CONFIG.defaultVolume;

        audio.volume = startVolume;

        const animate = (currentTime: number) => {
            const duration = AUDIO_CONFIG.fadeInDuration;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // 使用线性上升，使淡入效果更明显
            const easedProgress = progress;
            audio.volume = startVolume + (targetVolume - startVolume) * easedProgress;

            if (progress < 1) {
                fadeTimerRef.current = requestAnimationFrame(animate);
            } else {
                fadeTimerRef.current = null;
            }
        };

        fadeTimerRef.current = requestAnimationFrame(animate);
    }, [stopFadeIn]);

    // 组件销毁时停止动画
    useEffect(() => {
        return () => stopFadeIn();
    }, [stopFadeIn]);

    // 辅助函数：规范化 URL 以便比较
    const normalizeUrl = useCallback((url: string): string => {
        try {
            // 如果是相对路径，转换为绝对路径
            return new URL(url, window.location.href).href;
        } catch {
            return url;
        }
    }, []);

    // 辅助函数：确保音量设置
    const ensureVolume = useCallback((audio: HTMLAudioElement) => {
        // 如果正在淡入，不强制设置音量
        if (fadeTimerRef.current) return;

        if (audio.volume !== AUDIO_CONFIG.defaultVolume) {
            audio.volume = AUDIO_CONFIG.defaultVolume;
        }
    }, []);

    // 辅助函数：尝试播放音频
    const attemptPlay = useCallback(async () => {
        if (!audioRef.current) return;

        const audio = audioRef.current;
        // 尝试播放时先将音量设为 0，准备淡入
        audio.volume = 0;

        try {
            await audio.play();
            fadeInVolume(audio);
            setAutoplayBlocked(false);
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[BackgroundMusicPlayer] Playing music with fade-in');
        } catch (error) {
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[BackgroundMusicPlayer] Autoplay prevented, waiting for user interaction');
            setAutoplayBlocked(true);
        }
    }, [fadeInVolume]);

    // 音频元素初始化
    useEffect(() => {
        if (audioRef.current) {
            // 设置初始音量
            ensureVolume(audioRef.current);

            if (onAudioReady) {
                onAudioReady(audioRef.current);
            }
        }
    }, [onAudioReady, ensureVolume]);

    // 用户交互处理
    useEffect(() => {
        if (hasUserInteracted || !autoplayBlocked) return;

        const handleInteraction = () => {
            setHasUserInteracted(true);
            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[BackgroundMusicPlayer] User interaction detected');

            if (audioRef.current && !isMuted) {
                const audio = audioRef.current;
                audio.volume = 0;
                audio.play().then(() => {
                    fadeInVolume(audio);
                }).catch((error) => {
                    console.warn('[BackgroundMusicPlayer] Play after interaction failed:', error);
                });
            }
        };

        // 监听点击和键盘事件
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };
    }, [hasUserInteracted, autoplayBlocked, isMuted, ensureVolume]);

    // 处理音乐切换
    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;
        const selectedOption = AUDIO_CONFIG.options.find(option => option.id === selectedAudioId);

        // 如果选择了"No Music"或找不到对应选项，停止播放
        if (!selectedOption || !selectedOption.path) {
            audio.pause();
            audio.src = '';
            return;
        }

        // 获取完整路径并规范化
        const fullPath = normalizeUrl(selectedOption.path);
        const currentSrc = audio.src ? normalizeUrl(audio.src) : '';

        // 精确比较：如果音频源已经是当前选择的音乐，不需要重新加载
        if (currentSrc === fullPath) {
            // 如果暂停了且未静音且用户已交互，则播放
            if (audio.paused && !isMuted && (hasUserInteracted || !autoplayBlocked)) {
                audio.volume = 0;
                audio.play().then(() => {
                    fadeInVolume(audio);
                }).catch((error) => {
                    if (error.name !== 'NotAllowedError') {
                        console.warn('[BackgroundMusicPlayer] Resume play failed:', error);
                    }
                });
            } else {
                // 确保音量正确（如果正在播放）
                ensureVolume(audio);
            }
            return;
        }

        // 停止当前播放
        audio.pause();

        // 更新音频源（使用标准化后的路径）
        audio.src = fullPath;
        ensureVolume(audio);
        audio.load();

        // 尝试播放（如果未静音）
        if (!isMuted) {
            const handleCanPlay = () => {
                attemptPlay();
                audio.removeEventListener('canplaythrough', handleCanPlay);
            };
            audio.addEventListener('canplaythrough', handleCanPlay);
        }
    }, [selectedAudioId, isMuted, hasUserInteracted, autoplayBlocked, attemptPlay, normalizeUrl, ensureVolume]);
    // 静音控制（统一机制）
    // 使用 pause()/play() 而非 muted 属性来控制静音，节省资源
    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        if (!isMuted && audio.paused && audio.src && (hasUserInteracted || !autoplayBlocked)) {
            // 取消静音时，如果音频已暂停且有音源，尝试播放
            audio.volume = 0;
            audio.play().then(() => {
                fadeInVolume(audio);
            }).catch((error) => {
                if (error.name !== 'NotAllowedError') {
                    console.warn('[BackgroundMusicPlayer] Play on unmute failed:', error);
                }
            });
        } else if (isMuted && !audio.paused) {
            // 静音时暂停播放
            stopFadeIn();
            audio.pause();
        }
    }, [isMuted, hasUserInteracted, autoplayBlocked, ensureVolume]);

    // 处理页面可见性变化
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!audioRef.current || isMuted) return;

            const audio = audioRef.current;
            if (document.hidden) {
                // 页面隐藏时暂停
                if (!audio.paused) {
                    stopFadeIn();
                    audio.pause();
                    if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[BackgroundMusicPlayer] Page hidden, music paused');
                }
            } else {
                // 页面可见时，如果之前在播放且有音频源且用户已交互，则恢复
                if (audio.paused && audio.src && (hasUserInteracted || !autoplayBlocked)) {
                    // 恢复时也使用淡入效果
                    audio.volume = 0;
                    audio.play().then(() => {
                        fadeInVolume(audio);
                        if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log('[BackgroundMusicPlayer] Page visible, music resumed with fade-in');
                    }).catch((error) => {
                        // 忽略因自动播放限制导致的恢复失败
                        if (error.name !== 'NotAllowedError') {
                            console.warn('[BackgroundMusicPlayer] Resume on visible failed:', error);
                        }
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isMuted, hasUserInteracted, autoplayBlocked, stopFadeIn, fadeInVolume]);

    return (
        <audio
            ref={audioRef}
            loop
            crossOrigin="anonymous"
            preload="auto"
            style={{ display: 'none' }}
        />
    );
};
