/**
 * ShaderWarmup Component
 * 
 * Forces GPU shader compilation during scene initialization.
 * This eliminates first-click animation lag by pre-compiling all shaders
 * before user interaction.
 * 
 * IMPORTANT: This component must be placed INSIDE React.Suspense boundaries
 * so it runs AFTER all shader-using components have mounted.
 */
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export const ShaderWarmup: React.FC = () => {
    const { gl, scene, camera } = useThree();
    const hasWarmedUp = useRef(false);

    useEffect(() => {
        // Only warm up once
        if (hasWarmedUp.current) return;

        // Use multiple delays to ensure all components have initialized:
        // 1. First RAF: Wait for current render cycle
        // 2. setTimeout 100ms: Wait for React effects and Suspense resolution
        // 3. Second RAF: Ensure scene graph is updated
        // 4. gl.compile(): Force shader compilation
        // 5. Third RAF + render: Force a full render cycle to compile post-processing shaders

        const frameId1 = requestAnimationFrame(() => {
            const timeoutId = setTimeout(() => {
                const frameId2 = requestAnimationFrame(() => {
                    try {
                        // Force shader compilation for all scene objects
                        gl.compile(scene, camera);
                        console.log('[ShaderWarmup] Phase 1: Scene shaders compiled');

                        // Force a render to compile EffectComposer shaders
                        const frameId3 = requestAnimationFrame(() => {
                            try {
                                gl.render(scene, camera);
                                hasWarmedUp.current = true;
                                console.log('[ShaderWarmup] Phase 2: Full render warmup complete');
                            } catch (error) {
                                console.warn('[ShaderWarmup] Render warmup failed:', error);
                                hasWarmedUp.current = true;
                            }
                        });

                        // Store for cleanup
                        (window as any).__shaderWarmupFrame3 = frameId3;
                    } catch (error) {
                        console.warn('[ShaderWarmup] Compilation failed:', error);
                        hasWarmedUp.current = true;
                    }
                });

                // Store for cleanup
                (window as any).__shaderWarmupFrame2 = frameId2;
            }, 100); // 100ms delay for React effects

            // Store for cleanup
            (window as any).__shaderWarmupTimeout = timeoutId;
        });

        return () => {
            cancelAnimationFrame(frameId1);
            if ((window as any).__shaderWarmupTimeout) {
                clearTimeout((window as any).__shaderWarmupTimeout);
            }
            if ((window as any).__shaderWarmupFrame2) {
                cancelAnimationFrame((window as any).__shaderWarmupFrame2);
            }
            if ((window as any).__shaderWarmupFrame3) {
                cancelAnimationFrame((window as any).__shaderWarmupFrame3);
            }
        };
    }, [gl, scene, camera]);

    // Invisible component
    return null;
};
