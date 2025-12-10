import { useCallback, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { PhotoData, AppConfig } from '../types';
import { encodeState, decodeState } from '../utils/shareUtils';

interface UseShareSystemProps {
    photos: PhotoData[];
    config: AppConfig;
    setPhotos: React.Dispatch<React.SetStateAction<PhotoData[]>>;
    setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
}

export const useShareSystem = ({ photos, config, setPhotos, setConfig }: UseShareSystemProps) => {
    // Store actions
    const setTreeColor = useStore((state) => state.setTreeColor);
    const treeColor = useStore((state) => state.treeColor); // Need current color for sharing

    // Generate Share URL
    const generateShareUrl = useCallback(() => {
        const shareCode = encodeState(photos, treeColor, config); // Read directly from store
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?s=${shareCode}`;
    }, [photos, config, treeColor]);

    // Restore from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const shareCode = params.get('s');

        if (shareCode) {
            const data = decodeState(shareCode);
            if (data) {
                // Restore Photos
                if (data.p && Array.isArray(data.p)) {
                    // Verify URL format
                    const validUrls = data.p.filter(url =>
                        typeof url === 'string' &&
                        (url.startsWith('https://') || url.startsWith('http://'))
                    );
                    const restoredPhotos = validUrls.map(url => ({
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        url: url
                    })); setPhotos(restoredPhotos);
                }

                // Restore Config
                if (data.cfg) {
                    // Only restore known config items and verify value ranges
                    const safeConfig: Partial<AppConfig> = {};
                    if (typeof data.cfg.snowDensity === 'number' && data.cfg.snowDensity >= 0 && data.cfg.snowDensity <= 10000) {
                        safeConfig.snowDensity = data.cfg.snowDensity;
                    }
                    if (typeof data.cfg.rotationSpeed === 'number' && data.cfg.rotationSpeed >= 0 && data.cfg.rotationSpeed <= 5) {
                        safeConfig.rotationSpeed = data.cfg.rotationSpeed;
                    }
                    if (typeof data.cfg.photoSize === 'number' && data.cfg.photoSize >= 0.5 && data.cfg.photoSize <= 5) {
                        safeConfig.photoSize = data.cfg.photoSize;
                    }
                    if (typeof data.cfg.explosionRadius === 'number' && data.cfg.explosionRadius >= 0 && data.cfg.explosionRadius <= 100) {
                        safeConfig.explosionRadius = data.cfg.explosionRadius;
                    }
                    if (typeof data.cfg.snowSpeed === 'number' && data.cfg.snowSpeed >= 0 && data.cfg.snowSpeed <= 10) {
                        safeConfig.snowSpeed = data.cfg.snowSpeed;
                    }
                    if (typeof data.cfg.windStrength === 'number' && data.cfg.windStrength >= 0 && data.cfg.windStrength <= 5) {
                        safeConfig.windStrength = data.cfg.windStrength;
                    }
                    setConfig(prev => ({ ...prev, ...safeConfig }));
                }

                // Restore Color
                if (data.c && /^#[0-9A-Fa-f]{6}$/.test(data.c)) {
                    setTreeColor(data.c);
                }

                // Optional: clear URL to keep it clean? 
                // window.history.replaceState({}, '', window.location.pathname);
            }
        }
    }, []); // 只在首次加载时执行

    return { generateShareUrl };
};
