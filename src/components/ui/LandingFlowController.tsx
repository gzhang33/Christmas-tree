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
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Notify parent of phase changes
    useEffect(() => {
        onPhaseChange?.(landingPhase);
    }, [landingPhase, onPhaseChange]);

    // Handle name submission
    const handleNameSubmit = useCallback(async (name: string) => {
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

    return (
        <>
            {/* Name Input Modal - shown in 'input' phase */}
            <NameInputModal
                isVisible={landingPhase === 'input'}
                onSubmit={handleNameSubmit}
            />

            {/* Click Prompt removed - integrated into LandingTitle */}
        </>
    );
};

export default LandingFlowController;
