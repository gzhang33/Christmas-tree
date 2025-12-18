/**
 * TextureWarmup - Intelligent GPU Texture Pre-upload Component
 * 
 * Performance Optimization:
 * - Uses frame-budgeting to prevent blocking the main thread
 * - Only processes textures during IDLE time (after tree morphing)
 * - Spreads texture uploads across multiple frames (max 2 per frame)
 * - Yields to animations by checking frame time budget
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCachedTexture } from '../../utils/texturePreloader';
import { PARTICLE_CONFIG } from '../../config/particles';

interface TextureWarmupProps {
    /** Array of texture URLs to pre-warm on GPU */
    textureUrls: string[];
    /** Callback when all textures are warmed up */
    onWarmupComplete?: () => void;
    /** Enable warmup (set to false to disable) */
    enabled?: boolean;
    /** Start warmup delay (ms) - allows animations to settle first */
    startDelay?: number;
}

// Frame budget: if a frame takes longer than this, skip warmup this frame
const FRAME_BUDGET_MS = 12; // Leave 4ms buffer for 60fps (16.67ms total)

// Maximum textures to upload per frame
// Adaptive for mobile: 1 per frame to avoid stutter, 2 for desktop
const getBatchSize = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 1;
    return 2;
};
const MAX_TEXTURES_PER_FRAME = getBatchSize();

/**
 * TextureWarmup Component
 * 
 * Intelligently pre-warms textures on GPU during idle periods.
 * Uses frame-budgeting and delayed start to avoid interfering with animations.
 */
export const TextureWarmup: React.FC<TextureWarmupProps> = ({
    textureUrls,
    onWarmupComplete,
    enabled = true,
    startDelay = 800, // Default: wait 800ms after mount
}) => {
    const [warmupStarted, setWarmupStarted] = useState(false);
    const [warmupComplete, setWarmupComplete] = useState(false);

    // Track which textures have been warmed
    const warmupQueueRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);

    // Warmup geometries and materials (reused)
    const microGeometryRef = useRef<THREE.PlaneGeometry | null>(null);
    const activeMeshesRef = useRef<THREE.Mesh[]>([]);

    // Frame timing
    const lastFrameTimeRef = useRef(performance.now());
    const startTimeRef = useRef<number | null>(null);

    // Initialize warmup queue after delay
    useEffect(() => {
        if (!enabled || warmupStarted) return;

        const timer = setTimeout(() => {
            warmupQueueRef.current = [...textureUrls];
            currentIndexRef.current = 0;
            setWarmupStarted(true);
            startTimeRef.current = performance.now();

            // Create shared micro-geometry
            microGeometryRef.current = new THREE.PlaneGeometry(0.001, 0.001);

            if (PARTICLE_CONFIG.performance.enableDebugLogs) console.log(`[TextureWarmup] Starting delayed warmup for ${textureUrls.length} textures`);
        }, startDelay);

        return () => clearTimeout(timer);
    }, [enabled, warmupStarted, textureUrls, startDelay]);

    // Frame-budgeted warmup loop
    useFrame(() => {
        if (!enabled || !warmupStarted || warmupComplete) return;

        const now = performance.now();
        const frameDelta = now - lastFrameTimeRef.current;
        lastFrameTimeRef.current = now;

        // FRAME BUDGET CHECK: If last frame was slow, skip this frame
        if (frameDelta > FRAME_BUDGET_MS) {
            return; // Yield to animations
        }

        const queue = warmupQueueRef.current;
        let uploadedThisFrame = 0;

        // Process up to MAX_TEXTURES_PER_FRAME textures
        while (
            currentIndexRef.current < queue.length &&
            uploadedThisFrame < MAX_TEXTURES_PER_FRAME
        ) {
            const url = queue[currentIndexRef.current];
            const texture = getCachedTexture(url);

            if (texture) {
                // Create temporary mesh with texture to force GPU upload
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.001,
                    depthWrite: false,
                    depthTest: false,
                });

                const mesh = new THREE.Mesh(microGeometryRef.current!, material);
                mesh.position.set(0, -1000, 0); // Far below scene
                mesh.visible = true;
                mesh.frustumCulled = false;

                activeMeshesRef.current.push(mesh);
                uploadedThisFrame++;
            }

            currentIndexRef.current++;
        }

        // Check if warmup is complete
        if (currentIndexRef.current >= queue.length) {
            const duration = performance.now() - (startTimeRef.current || 0);
            if (PARTICLE_CONFIG.performance.enableDebugLogs) {
                console.log(
                    `[TextureWarmup] Completed: ${queue.length} textures in ${duration.toFixed(1)}ms ` +
                    `(avg ${(duration / queue.length).toFixed(1)}ms per texture)`
                );
            }

            setWarmupComplete(true);
            onWarmupComplete?.();

            // Schedule cleanup after a few frames (textures are now in GPU cache)
            setTimeout(() => {
                activeMeshesRef.current.forEach(mesh => {
                    mesh.geometry.dispose();
                    (mesh.material as THREE.Material).dispose();
                });
                activeMeshesRef.current = [];
                microGeometryRef.current?.dispose();
                microGeometryRef.current = null;
            }, 100);
        }
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            activeMeshesRef.current.forEach(mesh => {
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            });
            microGeometryRef.current?.dispose();
        };
    }, []);

    // Render active warmup meshes
    if (!warmupStarted || warmupComplete || !enabled) return null;

    return (
        <group position={[0, -1000, 0]}>
            {activeMeshesRef.current.map((mesh, i) => (
                <primitive key={i} object={mesh} />
            ))}
        </group>
    );
};

export default TextureWarmup;
