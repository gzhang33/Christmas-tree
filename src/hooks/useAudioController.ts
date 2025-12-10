import { useState, useRef, useEffect, useCallback } from 'react';

export const useAudioController = (initialVolume = 0.35) => {
    // Audio segment configuration: play from 45s to end, then loop
    const LOOP_START_TIME = 45; // Start playback at 45 seconds

    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = initialVolume;



        // Flag to track if we've set the initial time
        let hasSetInitialTime = false;

        // Set initial playback position to 45 seconds when audio can play
        const handleCanPlay = () => {
            if (!hasSetInitialTime && audio.currentTime < LOOP_START_TIME) {
                console.log('[Audio] Setting initial time to 45s');
                audio.currentTime = LOOP_START_TIME;
                hasSetInitialTime = true;
            }
        };

        // Handle loop: when audio ends, restart from 45 seconds
        const handleTimeUpdate = () => {
            // When audio reaches the end, loop back to 45 seconds
            if (!isNaN(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.5) {
                console.log('[Audio] Looping back to 45s');
                audio.currentTime = LOOP_START_TIME;
                audio.play().catch(e => console.warn('Loop play failed:', e));
            }
        };

        // Declare handleInteraction outside attemptPlay to ensure stable reference
        const handleInteraction = async () => {
            try {
                // Ensure we start from 45 seconds
                if (audio.currentTime < LOOP_START_TIME) {
                    console.log('[Audio] User interaction - setting time to 45s');
                    audio.currentTime = LOOP_START_TIME;
                }
                await audio.play();
                if (audioRef.current) audioRef.current.muted = false;
                setIsMuted(false);
            } catch (e) {
                console.warn('Audio playback failed after interaction:', e);
            }
            // Remove listeners after successful interaction
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
        };

        const attemptPlay = async () => {
            try {
                // Wait for audio to be ready, then set time and play
                // Wait for audio to be ready, then play
                // Initial time is handled by handleCanPlay listener

                await audio.play();
                if (audioRef.current) audioRef.current.muted = false;
                setIsMuted(false);
            } catch (err) {
                console.log('Audio autoplay prevented. Waiting for user interaction.');
                if (audioRef.current) audioRef.current.muted = true;
                setIsMuted(true);

                document.addEventListener('click', handleInteraction);
                document.addEventListener('keydown', handleInteraction);
            }
        };

        // Add event listeners
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        attemptPlay();

        // Cleanup function to remove listeners on unmount
        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [initialVolume]);

    const toggleMute = useCallback(() => {
        setIsMuted((prev) => {
            const newState = !prev;
            if (audioRef.current) {
                audioRef.current.muted = newState;
                if (!newState && audioRef.current.paused) {
                    audioRef.current.play().catch((e) => console.warn('Play failed on unmute:', e));
                }
            }
            return newState;
        });
    }, []);

    const unmute = useCallback(async () => {
        if (audioRef.current) {
            try {
                audioRef.current.muted = false;
                // Ensure we start from 45 seconds if audio is at the beginning
                if (audioRef.current.currentTime < LOOP_START_TIME) {
                    audioRef.current.currentTime = LOOP_START_TIME;
                }
                await audioRef.current.play();
                setIsMuted(false);
            } catch (e) {
                console.warn('Unmute failed:', e);
            }
        }
    }, [LOOP_START_TIME]);

    return {
        audioRef,
        isMuted,
        toggleMute,
        unmute
    };
};
