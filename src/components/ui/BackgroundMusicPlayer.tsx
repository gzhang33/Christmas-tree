import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { AUDIO_OPTIONS } from '../../config/audio';

interface BackgroundMusicPlayerProps {
    isMuted?: boolean;
    onAudioReady?: (audioElement: HTMLAudioElement) => void;
}

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

    // 音频元素创建后的回调
    useEffect(() => {
        if (audioRef.current && onAudioReady) {
            onAudioReady(audioRef.current);
        }
    }, [onAudioReady]);

    // 处理静音状态
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // 尝试播放音乐
    const attemptPlay = useCallback(async () => {
        if (!audioRef.current) return;

        try {
            await audioRef.current.play();
            setAutoplayBlocked(false);
            console.log('[BackgroundMusicPlayer] Playing music');
        } catch (error) {
            console.log('[BackgroundMusicPlayer] Autoplay prevented, waiting for user interaction');
            setAutoplayBlocked(true);
        }
    }, []);

    // 用户交互处理
    useEffect(() => {
        if (hasUserInteracted || !autoplayBlocked) return;

        const handleInteraction = () => {
            setHasUserInteracted(true);
            console.log('[BackgroundMusicPlayer] User interaction detected');

            if (audioRef.current && !isMuted) {
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
    }, [hasUserInteracted, autoplayBlocked, isMuted]);

    // 处理音乐切换
    useEffect(() => {
        if (!audioRef.current) return;

        const selectedOption = AUDIO_OPTIONS.find(option => option.id === selectedAudioId);
        const audio = audioRef.current;

        // 如果选择了"No Music"或找不到对应选项，停止播放
        if (!selectedOption || !selectedOption.path) {
            audio.pause();
            audio.src = '';
            return;
        }

        // 构建完整路径
        const fullPath = selectedOption.path;

        // 如果音频源已经是当前选择的音乐，不需要重新加载
        if (audio.src.endsWith(selectedOption.path)) {
            // 如果暂停了且未静音且用户已交互，则播放
            if (audio.paused && !isMuted && (hasUserInteracted || !autoplayBlocked)) {
                audio.play().catch((error) => {
                    console.warn('[BackgroundMusicPlayer] Resume play failed:', error);
                });
            }
            return;
        }

        // 停止当前播放
        audio.pause();

        // 更新音频源
        audio.src = fullPath;
        audio.volume = 0.35; // 设置音量为 35%
        audio.load();

        // 尝试播放（如果未静音）
        if (!isMuted) {
            // 如果用户还未交互，尝试自动播放（可能会被阻止）
            attemptPlay();
        }
    }, [selectedAudioId, isMuted, hasUserInteracted, autoplayBlocked, attemptPlay]);

    // 当用户切换静音状态时
    useEffect(() => {
        if (!audioRef.current) return;

        const audio = audioRef.current;

        if (!isMuted && audio.paused && audio.src && (hasUserInteracted || !autoplayBlocked)) {
            // 取消静音时，如果音频已暂停且有音源，尝试播放
            audio.play().catch((error) => {
                console.warn('[BackgroundMusicPlayer] Play on unmute failed:', error);
            });
        } else if (isMuted && !audio.paused) {
            // 静音时暂停
            audio.pause();
        }
    }, [isMuted, hasUserInteracted, autoplayBlocked]);

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
