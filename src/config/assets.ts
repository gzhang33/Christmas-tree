/**
 * Asset Configuration
 * 
 * Centralized asset path management for the application.
 * Follows architecture pattern: no hardcoded paths in components.
 */

/**
 * Audio assets
 */
export const AUDIO = {
  jingleBells: '/child-Jingle Bells.mp3',
} as const;

/**
 * Placeholder images
 */
export const PLACEHOLDERS = {
  photoSeed: 'https://picsum.photos/seed/{seed}/300/360',
} as const;

/**
 * Memory type definition
 * Represents a memory item with both image and optional video
 */
export type Memory = {
  id: string;
  image: string;
  video: string | null;
};

/**
 * Memories array
 * Contains all photo/video pairs from public/photos directory
 */
export const MEMORIES: readonly Memory[] = [
  {
    id: 'IMG_1483',
    image: '/photos/IMG_1483.JPG',
    video: null,
  },
  {
    id: 'IMG_1735',
    image: '/photos/IMG_1735.jpg',
    video: '/photos/IMG_1735.mp4',
  },
  {
    id: 'IMG_1815',
    image: '/photos/IMG_1815.jpg',
    video: '/photos/IMG_1815.mp4',
  },
  {
    id: 'IMG_1850',
    image: '/photos/IMG_1850.jpg',
    video: '/photos/IMG_1850.mp4',
  },
  {
    id: 'IMG_2311',
    image: '/photos/IMG_2311.jpg',
    video: '/photos/IMG_2311.mp4',
  },
  {
    id: 'IMG_5600',
    image: '/photos/IMG_5600.jpg',
    video: '/photos/IMG_5600.mp4',
  },
  {
    id: 'IMG_5708',
    image: '/photos/IMG_5708.jpg',
    video: '/photos/IMG_5708.mp4',
  },
  {
    id: 'IMG_5764',
    image: '/photos/IMG_5764.jpg',
    video: '/photos/IMG_5764.mp4',
  },
  {
    id: 'IMG_5851',
    image: '/photos/IMG_5851.jpg',
    video: '/photos/IMG_5851.mp4',
  },
  {
    id: 'IMG_5939',
    image: '/photos/IMG_5939.jpg',
    video: '/photos/IMG_5939.mp4',
  },
  {
    id: 'IMG_5977',
    image: '/photos/IMG_5977.jpg',
    video: '/photos/IMG_5977.mp4',
  },
  {
    id: 'IMG_6242',
    image: '/photos/IMG_6242.jpg',
    video: '/photos/IMG_6242.mp4',
  },
] as const;
