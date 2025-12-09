import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';

interface LandingFlowContextType {
    onEntranceComplete: () => void;
    onMorphingComplete: () => void;
}

const LandingFlowContext = createContext<LandingFlowContextType | null>(null);

export const useLandingFlow = () => {
    const context = useContext(LandingFlowContext);
    if (!context) {
        throw new Error('useLandingFlow must be used within a LandingFlowProvider');
    }
    return context;
};

export const LandingFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const landingPhase = useStore((state) => state.landingPhase);
    const setLandingPhase = useStore((state) => state.setLandingPhase);

    // Auto-transition from entrance to text
    const handleEntranceComplete = useCallback(() => {
        if (landingPhase === 'entrance') {
            setLandingPhase('text');
        }
    }, [landingPhase, setLandingPhase]);

    // Auto-transition from morphing to tree
    const handleMorphingComplete = useCallback(() => {
        if (landingPhase === 'morphing') {
            setLandingPhase('tree');
        }
    }, [landingPhase, setLandingPhase]);

    const value = useMemo(() => ({
        onEntranceComplete: handleEntranceComplete,
        onMorphingComplete: handleMorphingComplete,
    }), [handleEntranceComplete, handleMorphingComplete]);

    return (
        <LandingFlowContext.Provider value={value}>
            {children}
        </LandingFlowContext.Provider>
    );
};
