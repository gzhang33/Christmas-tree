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
                id: crypto.randomUUID(),
                url,
            };
        });
        setPhotos((prev) => [...prev, ...newPhotos]);
    }, []);

    // Remove a single photo and cleanup its object URL
    const removePhoto = useCallback((id: string) => {
        setPhotos((prev) => {
            const photo = prev.find((p) => p.id === id);
            if (photo && photoUrlsRef.current.has(photo.url)) {
                URL.revokeObjectURL(photo.url);
                photoUrlsRef.current.delete(photo.url);
            }
            return prev.filter((p) => p.id !== id);
        });
    }, []);

    // Clear all photos and cleanup all object URLs
    const clearPhotos = useCallback(() => {
        photoUrlsRef.current.forEach((url) => {
            URL.revokeObjectURL(url);
        });
        photoUrlsRef.current.clear();
        setPhotos([]);
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

    return { photos, addPhotos, removePhoto, clearPhotos };
};
