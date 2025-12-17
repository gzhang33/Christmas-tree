import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { AUDIO_CONFIG } from '../../config/audio';

interface BackgroundMusicPlayerProps {
    isMuted?: boolean;
    onAudioReady?: (audioElement: HTMLAudioElement) => void;
}

// 音量常量
const DEFAULT_VOLUME = 0.35;

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
        if (audio.volume !== DEFAULT_VOLUME) {
            audio.volume = DEFAULT_VOLUME;
        }
    }, []);

    // 辅助函数：尝试播放音频
    const attemptPlay = useCallback(async () => {
        if (!audioRef.current) return;

        const audio = audioRef.current;
        ensureVolume(audio);

        try {
            await audio.play();
            setAutoplayBlocked(false);
            console.log('[BackgroundMusicPlayer] Playing music');
        } catch (error) {
            console.log('[BackgroundMusicPlayer] Autoplay prevented, waiting for user interaction');
            setAutoplayBlocked(true);
        }
    }, [ensureVolume]);

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
            console.log('[BackgroundMusicPlayer] User interaction detected');

            if (audioRef.current && !isMuted) {
                ensureVolume(audioRef.current);
                audioRef.current.play().catch((error) => {
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
            // 确保音量正确
            ensureVolume(audio);

            // 如果暂停了且未静音且用户已交互，则播放
            if (audio.paused && !isMuted && (hasUserInteracted || !autoplayBlocked)) {
                audio.play().catch((error) => {
                    if (error.name !== 'NotAllowedError') {
                        console.warn('[BackgroundMusicPlayer] Resume play failed:', error);
                    }
                });
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
            ensureVolume(audio);
            audio.play().catch((error) => {
                if (error.name !== 'NotAllowedError') {
                    console.warn('[BackgroundMusicPlayer] Play on unmute failed:', error);
                }
            });
        } else if (isMuted && !audio.paused) {
            // 静音时暂停播放
            audio.pause();
        }
    }, [isMuted, hasUserInteracted, autoplayBlocked, ensureVolume]);

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
