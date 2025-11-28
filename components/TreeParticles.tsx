import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppConfig } from '../types.ts';

interface TreeParticlesProps {
    isExploded: boolean;
    config: AppConfig;
    onParticlesClick: () => void;
}

// --- Procedural Textures ---
const createGlowTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

const getGalaxyPos = (radius: number) => {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = (Math.random() * radius) + 15;
    return [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
    ];
};

export const TreeParticles: React.FC<TreeParticlesProps> = ({ isExploded, config, onParticlesClick }) => {
    const pointsRef = useRef<THREE.Points>(null);
    const glowTexture = useMemo(() => createGlowTexture(), []);

    const { positions, targetTree, targetGalaxy, colors, sizes } = useMemo(() => {
        const total = Math.max(config.particleCount, 30000); // High count for realism

        // Budget
        const countGifts = 4000;
        const countCrown = 1200;
        const countSwirls = 2500;
        const countOrnaments = 1500;
        const countTree = Math.max(0, total - countGifts - countCrown - countSwirls - countOrnaments);

        const pos = new Float32Array(total * 3);
        const tTree = new Float32Array(total * 3);
        const tGalaxy = new Float32Array(total * 3);
        const col = new Float32Array(total * 3);
        const siz = new Float32Array(total);

        let idx = 0;

        // Colors
        const cPinkBase = new THREE.Color(config.treeColor);

        // Derive variants from the selected color
        const hsl = { h: 0, s: 0, l: 0 };
        cPinkBase.getHSL(hsl);

        const cPinkDark = new THREE.Color().setHSL(hsl.h, hsl.s, Math.max(0, hsl.l - 0.2));
        const cPinkLight = new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + 0.2));

        const cGold = new THREE.Color('#FFD700');
        const cSilver = new THREE.Color('#E0E0E0');
        const cRed = new THREE.Color('#DC143C');
        const cWhite = new THREE.Color('#FFFFFF');
        const cBlue = new THREE.Color('#4169E1');

        // --- 1. REALISTIC TREE BODY ---
        // We simulate layers of branches spiraling up
        const treeHeight = 16;
        const treeBaseY = -7;
        const maxRadius = 7.5;
        const layers = 18; // Number of branch whorls

        // We'll generate particles by "growing" branches
        const particlesPerLayer = Math.floor(countTree / layers);

        for (let l = 0; l < layers; l++) {
            const tLayer = l / (layers - 1); // 0 (bottom) to 1 (top)
            const layerY = treeBaseY + tLayer * treeHeight;

            // Concave taper for elegant shape (not linear cone)
            const taper = Math.pow(1 - tLayer, 1.1);
            const layerRadius = maxRadius * taper;

            // Number of main branches in this layer
            const branchesInLayer = 8 + Math.floor((1 - tLayer) * 10);

            // Distribute particles for this layer
            for (let p = 0; p < particlesPerLayer; p++) {
                if (idx >= total) break;

                // Pick a branch
                const branchIdx = Math.floor(Math.random() * branchesInLayer);
                const branchAngle = (branchIdx / branchesInLayer) * Math.PI * 2 + (l * 0.5); // Twist per layer

                // Distance along branch (0 to 1)
                // Bias towards tips for "fluffy" surface, but keep some internal volume
                const d = Math.pow(Math.random(), 0.6);

                // Add some spread around the branch vector (needles)
                const spread = 0.8 * d; // Tips are wider
                const angleOffset = (Math.random() - 0.5) * spread;
                const theta = branchAngle + angleOffset;

                // Radius for this particle
                const r = layerRadius * d;

                // Gravity Droop: Tips droop more
                const droop = d * d * 1.2;
                const y = layerY - droop + (Math.random() - 0.5) * 0.5; // Slight vertical jitter

                const x = Math.cos(theta) * r;
                const z = Math.sin(theta) * r;

                tTree[idx * 3] = x; tTree[idx * 3 + 1] = y; tTree[idx * 3 + 2] = z;
                pos[idx * 3] = x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = z;

                const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
                tGalaxy[idx * 3] = gx; tGalaxy[idx * 3 + 1] = gy; tGalaxy[idx * 3 + 2] = gz;

                // Coloring: Depth based
                // Inner (d < 0.4) -> Dark
                // Tips (d > 0.8) -> Light/Frosty
                let c = cPinkBase;
                if (d < 0.4) c = cPinkDark;
                else if (d > 0.85) c = cPinkLight;

                if (Math.random() < 0.02) c = cWhite; // Random sparkle

                col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
                siz[idx] = 0.4 + Math.random() * 0.4;
                idx++;
            }
        }

        // --- 2. ORNAMENTS (Hanging from branch tips) ---
        for (let i = 0; i < countOrnaments; i++) {
            if (idx >= total) break;

            // Random layer
            const t = Math.random();
            const taper = Math.pow(1 - t, 1.1);
            const rBase = maxRadius * taper;
            const yBase = treeBaseY + t * treeHeight;

            // Place near tips
            const r = rBase * (0.8 + Math.random() * 0.3); // Can hang slightly outside
            const theta = Math.random() * Math.PI * 2;

            // Droop
            const droop = 1.2;
            const y = yBase - droop;

            tTree[idx * 3] = Math.cos(theta) * r;
            tTree[idx * 3 + 1] = y;
            tTree[idx * 3 + 2] = Math.sin(theta) * r;

            pos[idx * 3] = tTree[idx * 3]; pos[idx * 3 + 1] = tTree[idx * 3 + 1]; pos[idx * 3 + 2] = tTree[idx * 3 + 2];

            const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
            tGalaxy[idx * 3] = gx; tGalaxy[idx * 3 + 1] = gy; tGalaxy[idx * 3 + 2] = gz;

            const rnd = Math.random();
            let c = cGold;
            if (rnd < 0.3) c = cRed;
            else if (rnd < 0.5) c = cSilver;
            else if (rnd < 0.6) c = cBlue;

            col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
            siz[idx] = 0.7;
            idx++;
        }

        // --- 3. GIFT BOXES (Under the tree) ---
        const giftDefinitions = [
            { r: 2.5, ang: 0, w: 2.2, h: 2.0, c: cPinkBase, rib: cWhite },
            { r: 2.8, ang: 1.2, w: 1.8, h: 1.5, c: cSilver, rib: cPinkDark },
            { r: 2.6, ang: 2.5, w: 2.5, h: 1.8, c: cPinkDark, rib: cGold },
            { r: 3.0, ang: 3.8, w: 2.0, h: 2.2, c: cWhite, rib: cRed },
            { r: 3.2, ang: 5.0, w: 1.6, h: 1.4, c: cSilver, rib: cBlue },
            { r: 4.2, ang: 0.5, w: 1.5, h: 1.2, c: cPinkLight, rib: cSilver },
            { r: 4.5, ang: 2.0, w: 1.8, h: 1.0, c: cWhite, rib: cPinkBase },
            { r: 4.0, ang: 4.5, w: 1.4, h: 1.4, c: cPinkDark, rib: cWhite },
        ];

        const particlesPerBox = Math.floor(countGifts / giftDefinitions.length);

        giftDefinitions.forEach(box => {
            const cx = Math.cos(box.ang) * box.r;
            const cz = Math.sin(box.ang) * box.r;
            const cy = -6.6 + (box.h / 2);
            const rot = Math.random() * Math.PI;

            for (let i = 0; i < particlesPerBox; i++) {
                if (idx >= total) break;

                let ux = (Math.random() - 0.5);
                let uy = (Math.random() - 0.5);
                let uz = (Math.random() - 0.5);

                if (Math.random() > 0.1) {
                    const axis = Math.floor(Math.random() * 3);
                    if (axis === 0) ux = ux > 0 ? 0.5 : -0.5;
                    else if (axis === 1) uy = uy > 0 ? 0.5 : -0.5;
                    else uz = uz > 0 ? 0.5 : -0.5;
                }

                let px = ux * box.w;
                let py = uy * box.h;
                let pz = uz * box.w;

                const rpx = px * Math.cos(rot) - pz * Math.sin(rot);
                const rpz = px * Math.sin(rot) + pz * Math.cos(rot);
                px = rpx; pz = rpz;

                px += cx; py += cy; pz += cz;

                tTree[idx * 3] = px; tTree[idx * 3 + 1] = py; tTree[idx * 3 + 2] = pz;
                pos[idx * 3] = px; pos[idx * 3 + 1] = py; pos[idx * 3 + 2] = pz;

                const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
                tGalaxy[idx * 3] = gx; tGalaxy[idx * 3 + 1] = gy; tGalaxy[idx * 3 + 2] = gz;

                const ribbonWidth = 0.12;
                const isRibbon = Math.abs(ux) < ribbonWidth || Math.abs(uz) < ribbonWidth;
                const c = isRibbon ? box.rib : box.c;

                col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
                siz[idx] = 0.4;
                idx++;
            }
        });

        // --- 4. CROWN TOPPER ---
        const crownBaseY = treeBaseY + treeHeight - 0.5;
        for (let i = 0; i < countCrown; i++) {
            if (idx >= total) break;

            let x = 0, y = 0, z = 0;
            const type = Math.random();
            const cRadius = 0.7;

            if (type < 0.4) {
                const theta = Math.random() * Math.PI * 2;
                const h = Math.random() * 0.3;
                x = Math.cos(theta) * cRadius;
                y = crownBaseY + h;
                z = Math.sin(theta) * cRadius;
            } else if (type < 0.8) {
                const points = 5;
                const segment = (Math.floor(Math.random() * points) / points) * Math.PI * 2;
                const arc = (Math.random() - 0.5) * 0.5;
                const theta = segment + arc;
                const spikeH = 0.8 * (1 - Math.abs(arc) * 3);
                x = Math.cos(theta) * cRadius;
                y = crownBaseY + 0.3 + spikeH;
                z = Math.sin(theta) * cRadius;
            } else {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const r = Math.random() * 0.2;
                x = Math.sin(phi) * Math.cos(theta) * r;
                y = crownBaseY + 1.2 + Math.cos(phi) * r;
                z = Math.sin(phi) * Math.sin(theta) * r;
            }

            tTree[idx * 3] = x; tTree[idx * 3 + 1] = y; tTree[idx * 3 + 2] = z;
            pos[idx * 3] = x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = z;

            const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
            tGalaxy[idx * 3] = gx; tGalaxy[idx * 3 + 1] = gy; tGalaxy[idx * 3 + 2] = gz;

            const c = Math.random() > 0.3 ? cGold : cWhite;
            col[idx * 3] = c.r * 1.5; col[idx * 3 + 1] = c.g * 1.5; col[idx * 3 + 2] = c.b * 1.5;
            siz[idx] = 0.5;
            idx++;
        }

        // --- 5. MAGICAL SWIRLS ---
        for (let i = 0; i < countSwirls; i++) {
            if (idx >= total) break;

            const t = i / countSwirls;
            const theta = t * Math.PI * 20;
            const y = treeBaseY + (t * (treeHeight + 2));
            const taper = Math.pow(1 - t, 1.1);
            const r = (maxRadius * taper) + 1.5 + Math.sin(t * 20) * 0.5;

            const x = Math.cos(theta) * r;
            const z = Math.sin(theta) * r;

            tTree[idx * 3] = x; tTree[idx * 3 + 1] = y; tTree[idx * 3 + 2] = z;
            pos[idx * 3] = x; pos[idx * 3 + 1] = y; pos[idx * 3 + 2] = z;

            const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
            tGalaxy[idx * 3] = gx; tGalaxy[idx * 3 + 1] = gy; tGalaxy[idx * 3 + 2] = gz;

            const c = Math.random() > 0.5 ? cWhite : cPinkLight;
            col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
            siz[idx] = 0.3 + Math.random() * 0.4;
            idx++;
        }

        return {
            positions: pos,
            targetTree: tTree,
            targetGalaxy: tGalaxy,
            colors: col,
            sizes: siz
        };
    }, [config.particleCount, config.explosionRadius, config.treeColor]);

    useFrame((state) => {
        if (!pointsRef.current) return;

        const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
        const target = isExploded ? targetGalaxy : targetTree;
        const lerpSpeed = isExploded ? 0.02 : 0.04;

        const loopLen = Math.min(currentPos.length, target.length);

        for (let i = 0; i < loopLen; i++) {
            currentPos[i] += (target[i] - currentPos[i]) * lerpSpeed;
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        const r = isExploded ? 0.0005 : config.rotationSpeed * 0.001;
        pointsRef.current.rotation.y += r;
    });

    return (
        <group onClick={(e) => { e.stopPropagation(); onParticlesClick(); }}>
            <points ref={pointsRef} key={config.particleCount}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
                    <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
                    <bufferAttribute attach="attributes-size" count={sizes.length} array={sizes} itemSize={1} />
                </bufferGeometry>
                <pointsMaterial
                    vertexColors
                    map={glowTexture}
                    alphaMap={glowTexture}
                    transparent
                    opacity={1}
                    depthWrite={false}
                    size={0.5}
                    blending={THREE.NormalBlending}
                />
            </points>
        </group>
    );
};