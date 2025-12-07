/**
 * Optimizes a Cloudinary image URL with transformation parameters.
 * 
 * @param url The original image URL
 * @param width The desired width (defaults to 800)
 * @param format The desired format (defaults to 'auto' for WebP/AVIF selection)
 * @returns The optimized URL with transformation params inserted
 */
export const getOptimizedCloudinaryUrl = (
    url: string,
    width: number = 600,
    quality: string = 'auto',
    format: string = 'auto'
): string => {
    // If not a cloudinary url, return original
    if (!url || !url.includes('cloudinary.com')) {
        return url;
    }

    // Check if distinct upload param already exists to avoid double optimization
    if (url.includes('/q_') || url.includes('/f_')) {
        return url;
    }

    // Typical Cloudinary URL format: 
    // https://res.cloudinary.com/<cloud_name>/image/upload/<version>/<public_id>
    // We want to insert transformations after "/upload/"

    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return url;

    const transformation = `w_${width},q_${quality},f_${format}`;
    const before = url.slice(0, uploadIndex + 8); // include "/upload/"
    const after = url.slice(uploadIndex + 8);

    return `${before}${transformation}/${after}`;
};
