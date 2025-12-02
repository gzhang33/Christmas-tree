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
  updateConfig: (key: keyof AppConfig, value: any) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

export interface Asset {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  videoUrl?: string;
  label?: string;
}