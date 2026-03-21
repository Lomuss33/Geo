import { SRGBColorSpace, TextureLoader } from 'three';
import type { Texture } from 'three';
import type { QualityMode, RendererTier } from '../state/viewerStore';

export const EARTH_TEXTURE_FILES = {
  performance: 'earth-day-1024.jpg',
  balanced: 'earth-day-2048.jpg',
  high: 'earth-day-5400.jpg',
} as const;

const assetPath = (file: string) =>
  `${import.meta.env.BASE_URL}assets/earth/${file}`;

const textureCache = new Map<string, Promise<Texture>>();

export const getBaseTextureCandidates = (quality: QualityMode) =>
  quality === 'performance'
    ? [EARTH_TEXTURE_FILES.performance]
    : [EARTH_TEXTURE_FILES.balanced, EARTH_TEXTURE_FILES.performance];

export const shouldUseHighDetailTexture = (
  quality: QualityMode,
  rendererTier: RendererTier | null,
) => quality === 'high' && rendererTier === 'standard';

const loadCachedTexture = (file: string) => {
  const cached = textureCache.get(file);

  if (cached) {
    return cached;
  }

  const loader = new TextureLoader();
  const promise = new Promise<Texture>((resolve, reject) => {
    loader.load(
      assetPath(file),
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });

  textureCache.set(file, promise);
  return promise;
};

export const loadFirstAvailableEarthTexture = async (files: string[]) => {
  let lastError: unknown = null;

  for (const file of files) {
    try {
      const texture = await loadCachedTexture(file);
      return { texture, file };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to load Earth texture.');
};

export const loadHighDetailEarthTexture = () =>
  loadCachedTexture(EARTH_TEXTURE_FILES.high);
