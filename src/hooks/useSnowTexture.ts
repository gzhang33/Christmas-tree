import { useMemo } from 'react';
import * as THREE from 'three';
import { SNOW_CONFIG } from '../config/snow';

/**
 * Hook to generate a procedural snowflake texture.
 * Used by both the falling Snow component and the SnowFloor component
 * to ensure visual consistency.
 */
export const useSnowTexture = () => {
    return useMemo(() => {
        const { texture: cfg } = SNOW_CONFIG;
        const canvas = document.createElement('canvas');
        canvas.width = cfg.canvasSize;
        canvas.height = cfg.canvasSize;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.fillStyle = 'rgba(0,0,0,0)';
            ctx.clearRect(0, 0, cfg.canvasSize, cfg.canvasSize);

            ctx.strokeStyle = cfg.strokeColor;
            ctx.lineWidth = cfg.lineWidth;
            ctx.lineCap = cfg.lineCap;
            ctx.shadowBlur = cfg.shadowBlur;
            ctx.shadowColor = cfg.shadowColor;

            // Draw branches
            for (let i = 0; i < cfg.branches; i++) {
                ctx.save();
                ctx.translate(cfg.centerX, cfg.centerY);
                ctx.rotate((i * 2 * Math.PI) / cfg.branches);

                // Main branch
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -cfg.radius);
                ctx.stroke();

                // Inner V-shaped sub-branches
                ctx.beginPath();
                ctx.moveTo(0, -cfg.radius * cfg.innerVBranchPosition);
                ctx.lineTo(-cfg.branchSize, -cfg.radius * cfg.innerVBranchExtend);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -cfg.radius * cfg.innerVBranchPosition);
                ctx.lineTo(cfg.branchSize, -cfg.radius * cfg.innerVBranchExtend);
                ctx.stroke();

                // Outer V-shaped sub-branches
                ctx.beginPath();
                ctx.moveTo(0, -cfg.radius * cfg.outerVBranchPosition);
                ctx.lineTo(-cfg.branchSize * cfg.outerVBranchScale, -cfg.radius * cfg.outerVBranchExtend);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -cfg.radius * cfg.outerVBranchPosition);
                ctx.lineTo(cfg.branchSize * cfg.outerVBranchScale, -cfg.radius * cfg.outerVBranchExtend);
                ctx.stroke();

                ctx.restore();
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }, []);
};
