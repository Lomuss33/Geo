import { describe, expect, it } from 'vitest';
import {
  EARTH_TEXTURE_FILES,
  getBaseTextureCandidates,
  shouldUseHighDetailTexture,
} from './earthTextures';

describe('earth texture helpers', () => {
  it('uses the low-resolution base texture in performance mode', () => {
    expect(getBaseTextureCandidates('performance')).toEqual([
      EARTH_TEXTURE_FILES.performance,
    ]);
  });

  it('prefers the mid-resolution base texture in balanced mode', () => {
    expect(getBaseTextureCandidates('balanced')).toEqual([
      EARTH_TEXTURE_FILES.balanced,
      EARTH_TEXTURE_FILES.performance,
    ]);
  });

  it('allows high-detail upgrades only on the standard high-quality renderer', () => {
    expect(shouldUseHighDetailTexture('high', 'standard')).toBe(true);
    expect(shouldUseHighDetailTexture('high', 'compatibility')).toBe(false);
    expect(shouldUseHighDetailTexture('balanced', 'standard')).toBe(false);
  });
});
