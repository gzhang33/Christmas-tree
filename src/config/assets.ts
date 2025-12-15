/**
 * Asset Configuration
 * 
 * Centralized asset path management for the application.
 * Follows architecture pattern: no hardcoded paths in components.
 */

/**
 * Memory type definition
 * Represents a memory item with both image and optional video
 */
export type Memory = {
  id: string;
  image: string;
  video: string | null;
};

export const ASSET_CONFIG = {
  /**
   * Audio assets
   */
  audio: {
    jingleBells: '/audio/All I Want for Christmas Is You.flac',
  },

  /**
   * Placeholder images
   */
  placeholders: {
    photoSeed: 'https://picsum.photos/seed/{seed}/300/360',
  },

  /**
   * Memories array
   * Contains all photo/video pairs from public/photos directory
   */
  memories: [
    {
      id: 'IMG_1483',
      image: '/photos/IMG_1483.webp',
      video: null,
    },
    {
      id: 'IMG_1735',
      image: '/photos/IMG_1735.webp',
      video: '/photos/IMG_1735.mp4',
    },
    {
      id: 'IMG_1815',
      image: '/photos/IMG_1815.webp',
      video: '/photos/IMG_1815.mp4',
    },
    {
      id: 'IMG_1850',
      image: '/photos/IMG_1850.webp',
      video: '/photos/IMG_1850.mp4',
    },
    {
      id: 'IMG_2311',
      image: '/photos/IMG_2311.webp',
      video: '/photos/IMG_2311.mp4',
    },
    {
      id: 'IMG_5600',
      image: '/photos/IMG_5600.webp',
      video: '/photos/IMG_5600.mp4',
    },
    {
      id: 'IMG_5708',
      image: '/photos/IMG_5708.webp',
      video: '/photos/IMG_5708.mp4',
    },
    {
      id: 'IMG_5764',
      image: '/photos/IMG_5764.webp',
      video: '/photos/IMG_5764.mp4',
    },
    {
      id: 'IMG_5851',
      image: '/photos/IMG_5851.webp',
      video: '/photos/IMG_5851.mp4',
    },
    {
      id: 'IMG_5939',
      image: '/photos/IMG_5939.webp',
      video: '/photos/IMG_5939.mp4',
    },
    {
      id: 'IMG_5977',
      image: '/photos/IMG_5977.webp',
      video: '/photos/IMG_5977.mp4',
    },
    {
      id: 'IMG_6242',
      image: '/photos/IMG_6242.webp',
      video: '/photos/IMG_6242.mp4',
    },
  ] as readonly Memory[]
} as const;








