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

// Soft Glow for Flocked Needles & Lights
const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if(!ctx) return null;
  
  // Soft radial glow
  const grad = ctx.createRadialGradient(16,16,0,16,16,16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,32,32);
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Galaxy Helper
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

  // --- PARTICLE GENERATION LOGIC ---
  const { positions, targetTree, targetGalaxy, colors, sizes } = useMemo(() => {
    const total = Math.max(config.particleCount, 5000); 
    
    // Budget Allocation
    const countGifts = 4000; // Increased density for gifts
    const countRibbon = 1500;
    const countCrown = 800;
    const countTree = Math.max(0, total - countGifts - countRibbon - countCrown);

    const pos = new Float32Array(total * 3);
    const tTree = new Float32Array(total * 3);
    const tGalaxy = new Float32Array(total * 3);
    const col = new Float32Array(total * 3);
    const siz = new Float32Array(total);

    let idx = 0;

    // --- Colors ---
    const cPinkBase = new THREE.Color('#FFC0CB'); // Pink
    const cPinkDark = new THREE.Color('#DB7093'); // PaleVioletRed
    const cGold = new THREE.Color('#FFD700');
    const cSilver = new THREE.Color('#E0E0E0');
    const cRed = new THREE.Color('#C8102E');
    const cWhite = new THREE.Color('#FFFFFF');
    const cBlue = new THREE.Color('#012169');
    
    // --- 1. GIFT BOXES (Base Filler) ---
    // Generate a ring of boxes to hide the trunk connection
    const giftDefinitions = [
        // Inner circle (covering the trunk base)
        { r: 2.2, ang: 0, w: 2.5, h: 2.2, c: cPinkBase, rib: cWhite },
        { r: 2.5, ang: 1.5, w: 2.0, h: 1.8, c: cSilver, rib: cPinkDark },
        { r: 2.3, ang: 3.0, w: 2.8, h: 2.0, c: cPinkDark, rib: cGold },
        { r: 2.4, ang: 4.5, w: 2.2, h: 2.5, c: cWhite, rib: cRed },
        // Outer circle (scattered)
        { r: 3.5, ang: 0.8, w: 1.5, h: 1.2, c: cPinkBase, rib: cSilver },
        { r: 3.8, ang: 2.5, w: 1.8, h: 1.5, c: cWhite, rib: cPinkBase },
        { r: 4.0, ang: 4.0, w: 2.0, h: 1.0, c: cSilver, rib: cBlue },
        { r: 3.6, ang: 5.5, w: 1.6, h: 1.6, c: cPinkDark, rib: cWhite },
    ];

    const particlesPerBox = Math.floor(countGifts / giftDefinitions.length);

    giftDefinitions.forEach(box => {
        const cx = Math.cos(box.ang) * box.r;
        const cz = Math.sin(box.ang) * box.r;
        // Place on floor. Floor is at -6.6. Box center y = -6.6 + h/2.
        const cy = -6.6 + (box.h / 2);

        // Rotation
        const rot = Math.random() * Math.PI;

        for(let i=0; i < particlesPerBox; i++) {
            if(idx >= total) break;

            // Point in unit cube
            let ux = (Math.random() - 0.5);
            let uy = (Math.random() - 0.5);
            let uz = (Math.random() - 0.5);

            // Bias towards surface for solidity
            if (Math.random() > 0.3) {
                const axis = Math.floor(Math.random() * 3);
                if(axis === 0) ux = ux > 0 ? 0.5 : -0.5;
                if(axis === 1) uy = uy > 0 ? 0.5 : -0.5;
                if(axis === 2) uz = uz > 0 ? 0.5 : -0.5;
            }

            // Scale to dimensions
            let px = ux * box.w;
            let py = uy * box.h;
            let pz = uz * box.w; // Square base usually

            // Rotate
            const rpx = px * Math.cos(rot) - pz * Math.sin(rot);
            const rpz = px * Math.sin(rot) + pz * Math.cos(rot);
            px = rpx; pz = rpz;

            // Translate
            px += cx;
            py += cy;
            pz += cz;

            // Visuals
            tTree[idx*3] = px; tTree[idx*3+1] = py; tTree[idx*3+2] = pz;
            pos[idx*3] = px; pos[idx*3+1] = py; pos[idx*3+2] = pz;

            const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
            tGalaxy[idx*3] = gx; tGalaxy[idx*3+1] = gy; tGalaxy[idx*3+2] = gz;

            // Color Logic (Box vs Ribbon)
            // Ribbon is usually a cross on the box
            const ribbonWidth = 0.15;
            // Check relative position to rotated center
            // We need original ux, uy, uz logic essentially
            const isRibbonX = Math.abs(ux) < ribbonWidth;
            const isRibbonZ = Math.abs(uz) < ribbonWidth;
            
            const isRibbon = isRibbonX || isRibbonZ;
            const c = isRibbon ? box.rib : box.c;

            col[idx*3] = c.r; col[idx*3+1] = c.g; col[idx*3+2] = c.b;
            siz[idx] = 0.6; // Solid box look
            idx++;
        }
    });

    // --- 2. CROWN TOPPER ---
    const crownY = 8.5; // Top of tree
    for(let i=0; i<countCrown; i++) {
        if(idx >= total) break;
        let x=0, y=0, z=0;
        const r = Math.random();
        
        if (r < 0.5) {
            // Base Ring
            const theta = Math.random() * Math.PI * 2;
            const radius = 0.6;
            const height = Math.random() * 0.4;
            x = Math.cos(theta) * radius;
            y = crownY + height;
            z = Math.sin(theta) * radius;
        } else if (r < 0.8) {
            // Arches
            const theta = (Math.floor(Math.random() * 8) / 8) * Math.PI * 2; 
            const archPrg = Math.random(); 
            const radius = Math.sin(archPrg * Math.PI) * 0.6;
            const h = archPrg * 0.8;
            x = Math.cos(theta) * radius;
            y = crownY + 0.4 + h;
            z = Math.sin(theta) * radius;
        } else {
            // Top Jewel
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const rad = Math.random() * 0.25;
            x = Math.sin(phi) * Math.cos(theta) * rad;
            y = crownY + 1.2 + Math.cos(phi) * rad;
            z = Math.sin(phi) * Math.sin(theta) * rad;
        }

        tTree[idx*3] = x; tTree[idx*3+1] = y; tTree[idx*3+2] = z;
        pos[idx*3] = x; pos[idx*3+1] = y; pos[idx*3+2] = z;
        
        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        tGalaxy[idx*3] = gx; tGalaxy[idx*3+1] = gy; tGalaxy[idx*3+2] = gz;

        const c = Math.random() > 0.3 ? cGold : cWhite;
        col[idx*3] = c.r * 2; col[idx*3+1] = c.g * 2; col[idx*3+2] = c.b * 2; 
        siz[idx] = 0.6;
        idx++;
    }

    // --- 3. PINK SHIMMER RIBBON ---
    for(let i=0; i<countRibbon; i++) {
        if(idx >= total) break;
        const t = i / countRibbon;
        const y = 8 - (t * 14); 
        
        const r = (1 - (y+6)/14) * 5 + 0.5; 
        const theta = t * Math.PI * 12; 
        
        const drape = Math.sin(theta * 5) * 0.1;

        const x = Math.cos(theta) * (r + 0.2);
        const z = Math.sin(theta) * (r + 0.2);
        
        tTree[idx*3] = x; tTree[idx*3+1] = y + drape; tTree[idx*3+2] = z;
        pos[idx*3] = x; pos[idx*3+1] = y + drape; pos[idx*3+2] = z;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        tGalaxy[idx*3] = gx; tGalaxy[idx*3+1] = gy; tGalaxy[idx*3+2] = gz;

        // Elegant Pink Gradient with White Highlights
        const phase = (t * 40) % 1; 
        let c = cPinkBase;
        if (phase > 0.75) c = cWhite;
        else if (phase < 0.2) c = cPinkDark;
        
        col[idx*3] = c.r; col[idx*3+1] = c.g; col[idx*3+2] = c.b;
        siz[idx] = 0.6;
        idx++;
    }

    // --- 4. FLOCKED PINE TREE BODY ---
    while(idx < total) {
        const t = Math.pow(Math.random(), 0.8); 
        const y = -6.0 + (t * 14); 
        
        const coneR = (1 - t) * 6;
        
        const branchAngle = (Math.random() * Math.PI * 2);
        const distFromTrunk = Math.random(); 
        
        const droop = distFromTrunk * distFromTrunk * 1.5; 
        
        const r = distFromTrunk * coneR;
        const finalY = y - droop;

        const x = Math.cos(branchAngle) * r;
        const z = Math.sin(branchAngle) * r;

        // Flocking noise
        const noiseScale = 0.3;
        const nx = (Math.random() - 0.5) * noiseScale;
        const ny = (Math.random() - 0.5) * noiseScale;
        const nz = (Math.random() - 0.5) * noiseScale;

        tTree[idx*3] = x + nx; tTree[idx*3+1] = finalY + ny; tTree[idx*3+2] = z + nz;
        pos[idx*3] = x; pos[idx*3+1] = finalY; pos[idx*3+2] = z;

        const [gx, gy, gz] = getGalaxyPos(config.explosionRadius);
        tGalaxy[idx*3] = gx; tGalaxy[idx*3+1] = gy; tGalaxy[idx*3+2] = gz;

        const isTip = distFromTrunk > 0.8;
        const isInner = distFromTrunk < 0.3;
        
        let c = cPinkBase;
        if (isInner) c = cPinkDark; 
        if (isTip && Math.random() > 0.5) c = cWhite; 
        
        if (Math.random() < 0.05 && distFromTrunk > 0.5) {
            c = cGold;
            siz[idx] = 1.0; 
        } else {
            siz[idx] = 0.4 + Math.random() * 0.4;
        }

        col[idx*3] = c.r; col[idx*3+1] = c.g; col[idx*3+2] = c.b;
        idx++;
    }

    return {
        positions: pos,
        targetTree: tTree,
        targetGalaxy: tGalaxy,
        colors: col,
        sizes: siz
    };
  }, [config.particleCount, config.explosionRadius]);


  // --- ANIMATION LOOP ---
  useFrame((state) => {
    if (!pointsRef.current) return;

    const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const target = isExploded ? targetGalaxy : targetTree;
    const lerpSpeed = isExploded ? 0.02 : 0.04; 

    // Dynamic resize safety
    const loopLen = Math.min(currentPos.length, target.length);

    for (let i = 0; i < loopLen; i++) {
        currentPos[i] += (target[i] - currentPos[i]) * lerpSpeed;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotation
    const r = isExploded ? 0.0005 : config.rotationSpeed * 0.001;
    pointsRef.current.rotation.y += r;
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onParticlesClick(); }}>
      <points ref={pointsRef} key={config.particleCount}>
        <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={positions.length/3} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={colors.length/3} array={colors} itemSize={3} />
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