import React from 'react';
import { useStore } from '../../store/useStore';
import { SCENE_CONFIG } from '../../config';
import { MeshReflectorMaterial } from '@react-three/drei';

export const Floor: React.FC = () => {
    const activePhoto = useStore((state) => state.activePhoto);
    const setActivePhoto = useStore((state) => state.setActivePhoto);
    const setHoveredPhoto = useStore((state) => state.setHoveredPhoto);
    const playingVideoInHover = useStore((state) => state.playingVideoInHover); // NEW
    const setPlayingVideoInHover = useStore((state) => state.setPlayingVideoInHover); // NEW

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={SCENE_CONFIG.floor.position as [number, number, number]}
            receiveShadow
            onClick={(e) => {
                e.stopPropagation();

                // NEW: Exit hover video playback mode
                if (playingVideoInHover) {
                    setPlayingVideoInHover(null);
                    setHoveredPhoto(null);
                    return;
                }

                // Close active photo if open
                if (activePhoto) {
                    setActivePhoto(null);
                }
                // Clear hover preview (for mobile tap-to-preview)
                setHoveredPhoto(null);
            }}
        >
            <circleGeometry args={[SCENE_CONFIG.floor.radius, SCENE_CONFIG.floor.segments]} />
            {/* 
                Premium Reflective Floor
                Replaces primitive gray disc with a high-quality reflective surface 
                that blends into the dark environment using MeshReflectorMaterial
            */}
            <MeshReflectorMaterial
                color="#000000"      // Pure black base for best contrast with transparency
                transparent={true}   // NEW: Enable transparency
                opacity={0.5}        // NEW: 50% opacity (Glass/Ice effect) - allows stars to show through
                blur={[300, 100]}    // Soft blur for realistic ground reflections
                mixBlur={1}          // Mix blur with surface color
                mixStrength={30}     // Reflection strength
                mixContrast={1}      // Reflection contrast
                resolution={1024}    // High quality reflections
                mirror={0.95}        // High mirror capability (0-1)
                depthScale={1.2}     // Depth falloff for realism
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                depthToBlurRatioBias={0.25}
                roughness={1}        // Base roughness
                metalness={0.6}      // Metallic feel
            />
        </mesh>
    );
};

