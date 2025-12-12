import React from 'react';
import { useStore } from '../../store/useStore';
import { SCENE_CONFIG } from '../../config';

export const Floor: React.FC = () => {
    const activePhoto = useStore((state) => state.activePhoto);
    const setActivePhoto = useStore((state) => state.setActivePhoto);
    const setHoveredPhoto = useStore((state) => state.setHoveredPhoto);

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={SCENE_CONFIG.floor.position as [number, number, number]}
            receiveShadow
            onClick={(e) => {
                e.stopPropagation();
                // Close active photo if open
                if (activePhoto) {
                    setActivePhoto(null);
                }
                // Clear hover preview (for mobile tap-to-preview)
                setHoveredPhoto(null);
            }}
        >
            <circleGeometry args={[SCENE_CONFIG.floor.radius, SCENE_CONFIG.floor.segments]} />
            <meshStandardMaterial
                color={SCENE_CONFIG.floor.material.color}
                metalness={SCENE_CONFIG.floor.material.metalness}
                roughness={SCENE_CONFIG.floor.material.roughness}
                envMapIntensity={SCENE_CONFIG.floor.material.envMapIntensity}
            />
        </mesh>
    );
};
