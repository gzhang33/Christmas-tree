/**
 * Optimizes a Cloudinary image URL with transformation parameters.
 * 
 * @param url The original image URL
 * @param width The desired width (defaults to 600)
 * @param format The desired format (defaults to 'auto' for WebP/AVIF selection)
 * @returns The optimized URL with transformation params inserted
 */
export const getOptimizedCloudinaryUrl = (
    url: string,
    width: number = 600,
    quality: string = 'auto',
    format: string = 'auto'
): string => {    // If not a cloudinary url, return original
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

/**
 * Uploads a file to Cloudinary using unsigned upload preset
 * 
 * @param file The file object to upload
 * @param onProgress Optional callback for upload progress (0-100)
 * @returns Promise resolving to the secure_url of the uploaded image
 */
export const uploadToCloudinary = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary credentials missing. Please check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    // Optional: Add tags or folder parameters here
    formData.append('folder', 'christmas_tree_user_uploads');

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

        xhr.open('POST', url, true);

        // Track progress
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve(response.secure_url);
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Network error occurred during upload'));
        };

        xhr.send(formData);
    });
};
