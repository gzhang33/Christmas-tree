/**
 * LandingFlowController Component
 * 
 * State machine controller for the landing page animation flow.
 * Manages transitions between phases:
 * - input: Name input modal
 * - entrance: Particles falling from top
 * - text: "Merry Christmas" displayed
 * - morphing: Text → Tree transition
 * - tree: Final Christmas tree state
 */
import React, { useEffect, useCallback } from 'react';
import { useStore, LandingPhase } from '../../store/useStore';
import { NameInputModal } from './NameInputModal';
import { ClickPrompt } from './ClickPrompt';

interface LandingFlowControllerProps {
    onPhaseChange?: (phase: LandingPhase) => void;
    onAudioResume?: () => void;
}

export const LandingFlowController: React.FC<LandingFlowControllerProps> = ({
    onPhaseChange,
    onAudioResume,
}) => {
    const userName = useStore((state) => state.userName);
    const landingPhase = useStore((state) => state.landingPhase);
    const setUserName = useStore((state) => state.setUserName);
    const setLandingPhase = useStore((state) => state.setLandingPhase);

    // Check for existing user on mount
    useEffect(() => {
        // If user already has a name (from localStorage via zustand persist)
        // skip input phase and go directly to entrance
        if (userName && landingPhase === 'input') {
            setLandingPhase('entrance');
        }
    }, [userName, landingPhase, setLandingPhase]);

    // Notify parent of phase changes
    useEffect(() => {
        onPhaseChange?.(landingPhase);
    }, [landingPhase, onPhaseChange]);

    // Handle name submission
    const handleNameSubmit = useCallback((name: string) => {
        setUserName(name);
        setLandingPhase('entrance');

        // Trigger audio resume (user interaction occurred)
        onAudioResume?.();
    }, [setUserName, setLandingPhase, onAudioResume]);

    // Handle click to transition from text to morphing
    const handleTreeClick = useCallback(() => {
        if (landingPhase === 'text') {
            setLandingPhase('morphing');
        }
    }, [landingPhase, setLandingPhase]);

    // Auto-transition from entrance to text (after entrance animation completes)
    // This will be triggered by TreeParticles once entrance animation is done
    const handleEntranceComplete = useCallback(() => {
        if (landingPhase === 'entrance') {
            setLandingPhase('text');
        }
    }, [landingPhase, setLandingPhase]);

    // Auto-transition from morphing to tree (after morphing animation completes)
    const handleMorphingComplete = useCallback(() => {
        if (landingPhase === 'morphing') {
            setLandingPhase('tree');
        }
    }, [landingPhase, setLandingPhase]);

    // Expose transition handlers via window for TreeParticles to call
    useEffect(() => {
        (window as any).__landingFlow = {
            onEntranceComplete: handleEntranceComplete,
            onMorphingComplete: handleMorphingComplete,
        };

        return () => {
            delete (window as any).__landingFlow;
        };
    }, [handleEntranceComplete, handleMorphingComplete]);

    return (
        <>
            {/* Name Input Modal - shown in 'input' phase */}
            <NameInputModal
                isVisible={landingPhase === 'input'}
                onSubmit={handleNameSubmit}
            />

            {/* Click Prompt - shown in 'text' phase */}
            <ClickPrompt
                isVisible={landingPhase === 'text'}
                onClick={handleTreeClick}
            />
        </>
    );
};

export default LandingFlowController;
