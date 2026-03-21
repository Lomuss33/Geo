import { describe, expect, it, vi } from 'vitest';
import {
  createRendererWithTiers,
  formatRendererTier,
  getRendererTierOptions,
  RENDERER_TIER_ORDER,
  RendererInitError,
} from './renderer';

describe('renderer tiers', () => {
  it('keeps the retry order stable', () => {
    expect(RENDERER_TIER_ORDER).toEqual([
      'standard',
      'compatibility',
      'minimal',
    ]);
  });

  it('uses quality-aware settings for the standard tier', () => {
    expect(getRendererTierOptions('standard', 'high')).toMatchObject({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
    });
    expect(getRendererTierOptions('standard', 'balanced')).toMatchObject({
      antialias: false,
    });
    expect(getRendererTierOptions('standard', 'performance')).toMatchObject({
      antialias: false,
    });
  });

  it('uses low-overhead compatibility and minimal tiers', () => {
    expect(getRendererTierOptions('compatibility', 'balanced')).toMatchObject({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'low-power',
      precision: 'mediump',
    });
    expect(getRendererTierOptions('minimal', 'balanced')).toMatchObject({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'low-power',
      precision: 'lowp',
    });
  });

  it('falls through retry tiers until renderer creation succeeds', () => {
    const createRenderer = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('standard failed');
      })
      .mockImplementationOnce(() => {
        throw new Error('compatibility failed');
      })
      .mockImplementationOnce(() => ({ ok: true }));

    const result = createRendererWithTiers(
      { canvas: document.createElement('canvas') },
      'balanced',
      createRenderer,
    );

    expect(result.tier).toBe('minimal');
    expect(result.attemptedTiers).toEqual([
      'standard',
      'compatibility',
      'minimal',
    ]);
  });

  it('throws a typed error after all tiers fail', () => {
    const createRenderer = vi.fn(() => {
      throw new Error('fail');
    });

    expect(() =>
      createRendererWithTiers(
        { canvas: document.createElement('canvas') },
        'balanced',
        createRenderer,
      ),
    ).toThrow(RendererInitError);
  });

  it('formats renderer tier labels for diagnostics', () => {
    expect(formatRendererTier('standard')).toBe('Standard');
    expect(formatRendererTier('compatibility')).toBe('Compatibility');
    expect(formatRendererTier('minimal')).toBe('Minimal');
    expect(formatRendererTier(null)).toBe('Unavailable');
  });
});
