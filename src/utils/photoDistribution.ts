import { PhotoPosition } from '../config/photoConfig';

/**
 * Distributes photo URLs among positions to avoid clustering of identical photos.
 * Implements a "Distance-Constrained Random Assignment" algorithm.
 * 
 * Strategy:
 * 1. Fill the pool with source photos evenly.
 * 2. Shuffle the pool globally.
 * 3. Iteratively swap photos that are too close to an identical neighbor.
 * 
 * @param positions The generated 3D positions for the photos
 * @param sourceUrls The list of available unique photo URLs
 * @param minDistance Minimum distance required between identical photos (default: 4.0)
 * @returns Array of URLs mapping 1:1 to the positions array
 */
export const distributePhotos = (
    positions: PhotoPosition[],
    sourceUrls: string[],
    minDistance: number = 4.0
): string[] => {
    const count = positions.length;
    if (count === 0) return [];
    if (sourceUrls.length === 0) return Array(count).fill('');

    // If we have enough unique photos to cover positions, just shuffle and return
    // (Optimization: No need for proximity check if duplicates unlikely)
    if (sourceUrls.length >= count) {
        const pool = sourceUrls.slice(0, count);
        shuffle(pool);
        return pool;
    }

    // 1. Fill the pool with URLs, maintaining even distribution
    let pool: string[] = [];
    const repetitions = Math.ceil(count / sourceUrls.length);

    for (let r = 0; r < repetitions; r++) {
        // Create a batch of source URLs
        // Scaling Idea: If we have few photos, we repeat them.
        const batch = [...sourceUrls];
        // Shuffle the batch before adding to mix it up
        shuffle(batch);
        pool.push(...batch);
    }

    // Trim to exact count
    pool = pool.slice(0, count);

    // 2. Global Shuffle
    shuffle(pool);

    // 3. Distance-Based Optimization (Repulsion)
    // Identify conflicts (identical neighbors) and swap them away
    const maxPasses = 5;
    const minDistanceSq = minDistance * minDistance;

    for (let pass = 0; pass < maxPasses; pass++) {
        let swapsPerformed = 0;

        for (let i = 0; i < count; i++) {
            const currentUrl = pool[i];
            const p1 = positions[i];

            // Check neighbors for conflict
            let conflictFound = false;

            for (let j = 0; j < count; j++) {
                if (i === j) continue;

                // Check if identical photo
                if (pool[j] === currentUrl) {
                    const p2 = positions[j];
                    const distSq = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2;

                    if (distSq < minDistanceSq) {
                        conflictFound = true;
                        break;
                    }
                }
            }

            if (conflictFound) {
                // Try to swap with a random candidate
                // We try a few times to find a swap that resolves the conflict
                let swapped = false;
                for (let attempt = 0; attempt < 10; attempt++) {
                    const k = Math.floor(Math.random() * count);

                    // Don't swap with self or another identical photo
                    if (pool[k] !== currentUrl) {
                        // Perform swap
                        [pool[i], pool[k]] = [pool[k], pool[i]];
                        swapped = true;
                        swapsPerformed++;
                        break;
                    }
                }
            }
        }

        // If no swaps needed, we are done
        if (swapsPerformed === 0) break;
    }

    return pool;
};

/**
 * Fisher-Yates shuffle helper
 */
const shuffle = <T>(array: T[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
};
