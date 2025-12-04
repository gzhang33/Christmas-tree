export interface AppConfig {
  treeColor: string;
  particleCount: number;
  snowDensity: number;
  rotationSpeed: number;
  photoSize: number;
  explosionRadius: number;
  snowSpeed: number;
  windStrength: number;
}

export interface PhotoData {
  id: string;
  url: string;
}

export interface UIState {
  isExploded: boolean;
  toggleExplosion: () => void;
  photos: PhotoData[];
  addPhotos: (files: FileList) => void;
  config: AppConfig;
  updateConfig: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

// Base asset properties shared by all asset types
interface BaseAsset {
  id: string;
  url: string;
  label?: string;
}

// Image asset type
interface ImageAsset extends BaseAsset {
  type: 'image';
  videoUrl?: never;
}

// Video asset type - videoUrl is required
interface VideoAsset extends BaseAsset {
  type: 'video';
  videoUrl: string;
}

// Audio asset type
interface AudioAsset extends BaseAsset {
  type: 'audio';
  videoUrl?: never;
}

// Union type ensures videoUrl is required only for video assets
export type Asset = ImageAsset | VideoAsset | AudioAsset;