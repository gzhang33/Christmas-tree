import React, { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { SCENE_CONFIG } from '../../config';
import { MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const Floor: React.FC = () => {
    const activePhoto = useStore((state) => state.activePhoto);
    const setActivePhoto = useStore((state) => state.setActivePhoto);
    const setHoveredPhoto = useStore((state) => state.setHoveredPhoto);
    const playingVideoInHover = useStore((state) => state.playingVideoInHover); // NEW
    const setPlayingVideoInHover = useStore((state) => state.setPlayingVideoInHover); // NEW
    const landingPhase = useStore((state) => state.landingPhase);

    const materialRef = useRef<any>(null);
    const currentOpacityRef = useRef(0); // Start at 0

    // Animate opacity based on landing phase
    useFrame((state, delta) => {
        if (!materialRef.current) return;

        // Target opacity based on phase:
        // - input/entrance: 0% (invisible during loading)
        // - text: 30% (subtle background)
        // - morphing/tree: 50% (standard state)
        let targetOpacity = 0.5; // Default for morphing/tree
        if (landingPhase === 'input' || landingPhase === 'entrance') {
            targetOpacity = 0;
        } else if (landingPhase === 'text') {
            targetOpacity = 0.3;
        }

        // Smooth lerp to target
        currentOpacityRef.current = THREE.MathUtils.lerp(
            currentOpacityRef.current,
            targetOpacity,
            delta * 2 // Transition speed
        );

        materialRef.current.opacity = currentOpacityRef.current;
    });

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={SCENE_CONFIG.floor.position as [number, number, number]}
            receiveShadow
            onClick={(e) => {
                e.stopPropagation();

                // Clear all interaction states when clicking the floor
                const { setActivePhoto, setHoveredPhoto, setPlayingVideoInHover } = useStore.getState();
                setActivePhoto(null);
                setHoveredPhoto(null);
                setPlayingVideoInHover(null);
            }}
        >
            <circleGeometry args={[SCENE_CONFIG.floor.radius, SCENE_CONFIG.floor.segments]} />
            {/* 
                Premium Reflective Floor
                Replaces primitive gray disc with a high-quality reflective surface 
                that blends into the dark environment using MeshReflectorMaterial
            */}
            <MeshReflectorMaterial
                ref={materialRef}
                color="#000000"      // Pure black base for best contrast with transparency
                transparent={true}   // Enable transparency
                // opacity controlled by useFrame animation (starts at 0.3 in text phase, 0.5 in morphing/tree)
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

