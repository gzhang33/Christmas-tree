import { useState, useCallback, useRef, useEffect } from 'react';
import { PhotoData } from '../types';

export const usePhotos = () => {
    const [photos, setPhotos] = useState<PhotoData[]>([]);
    const photoUrlsRef = useRef<Set<string>>(new Set());

    const addPhotos = useCallback((files: FileList) => {
        const newPhotos: PhotoData[] = Array.from(files).map((file) => {
            const url = URL.createObjectURL(file);
            photoUrlsRef.current.add(url);
            return {
                id: Math.random().toString(36).substring(2, 9),
                url,
            };
        });
        setPhotos((prev) => [...prev, ...newPhotos]);
    }, []);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            photoUrlsRef.current.forEach((url) => {
                URL.revokeObjectURL(url);
            });
            photoUrlsRef.current.clear();
        };
    }, []);

    return { photos, addPhotos };
};
