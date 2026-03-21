import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VIEW } from './constants';
import {
  buildViewUrlForMode,
  deserializeHeadwayViewState,
  deserializeViewState,
  normalizeInitialRuntimeUrl,
  normalizeRuntimeUrl,
  readUrlState,
  serializeHeadwayViewState,
  serializeViewState,
  shouldLiveSyncViewUrl,
} from './viewState';

describe('view state serialization', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('round-trips a geo view state payload', () => {
    const encoded = serializeViewState(DEFAULT_VIEW);
    const decoded = deserializeViewState(encoded);

    expect(decoded?.distance).toBeCloseTo(DEFAULT_VIEW.distance, 4);
    expect(decoded?.fov).toBeCloseTo(DEFAULT_VIEW.fov, 2);
    decoded?.rotation.forEach((value, index) => {
      expect(value).toBeCloseTo(DEFAULT_VIEW.rotation[index] ?? 0, 5);
    });
  });

  it('round-trips a Headway map payload', () => {
    const encoded = serializeHeadwayViewState({
      center: [13, 52],
      zoom: 2.45,
      bearing: 24,
      pitch: 12,
    });
    const decoded = deserializeHeadwayViewState(encoded);

    expect(decoded?.center[0]).toBeCloseTo(13, 4);
    expect(decoded?.center[1]).toBeCloseTo(52, 4);
    expect(decoded?.zoom).toBeCloseTo(2.45, 2);
    expect(decoded?.bearing).toBeCloseTo(24, 2);
    expect(decoded?.pitch).toBeCloseTo(12, 2);
  });

  it('returns null for malformed payloads', () => {
    expect(deserializeViewState('not-valid')).toBeNull();
    expect(deserializeHeadwayViewState('still-not-valid')).toBeNull();
  });

  it('normalizes stale local dev Geo paths while preserving params', () => {
    expect(
      normalizeRuntimeUrl(
        'http://localhost:5173/Geo/?view=abc123&mode=headway#hud',
        'local-dev',
      ),
    ).toBe('http://localhost:5173/?view=abc123&mode=headway#hud');
  });

  it('normalizes the initial runtime URL in local-dev mode', () => {
    vi.stubEnv('MODE', 'local-dev');
    window.history.replaceState({}, '', '/Geo/?view=abc123');

    normalizeInitialRuntimeUrl();

    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?view=abc123');
  });

  it('builds local-dev view URLs at the root path', () => {
    expect(
      buildViewUrlForMode(
        DEFAULT_VIEW,
        'local-dev',
        'http://localhost:5173/Geo/?view=stale',
      ),
    ).toMatch(/^http:\/\/localhost:5173\/\?view=/);
  });

  it('builds Headway Pages URLs with mode and map state', () => {
    const url = buildViewUrlForMode(
      DEFAULT_VIEW,
      'pages',
      'https://example.com/',
      {
        viewerMode: 'headway',
        headwayView: {
          center: [13, 52],
          zoom: 2.4,
          bearing: 20,
          pitch: 12,
        },
      },
    );

    expect(url).toMatch(/^https:\/\/example\.com\/Geo\/\?view=/);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('mode')).toBe('headway');
    expect(parsed.searchParams.get('map')).toMatch(/\S+/);
  });

  it('reads Headway mode state from the URL', () => {
    const map = serializeHeadwayViewState({
      center: [13, 52],
      zoom: 2.4,
      bearing: 20,
      pitch: 12,
    });
    const view = serializeViewState(DEFAULT_VIEW);
    window.history.replaceState(
      {},
      '',
      `/Geo/?mode=headway&view=${view}&map=${map}`,
    );

    const state = readUrlState();

    expect(state.mode).toBe('headway');
    expect(state.headwayView.center[0]).toBeCloseTo(13, 3);
    expect(state.headwayView.center[1]).toBeCloseTo(52, 3);
  });

  it('disables live view sync in local-dev mode only', () => {
    expect(shouldLiveSyncViewUrl('local-dev')).toBe(false);
    expect(shouldLiveSyncViewUrl('pages')).toBe(true);
  });
});
