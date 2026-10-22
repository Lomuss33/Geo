import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VIEW } from './constants';
import {
  buildViewUrlForMode,
  deserializeBordersViewState,
  deserializeHeadwayViewState,
  deserializeViewState,
  normalizeInitialRuntimeUrl,
  normalizeRuntimeUrl,
  readUrlState,
  serializeBordersViewState,
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

  it('round-trips a Borders map payload', () => {
    const encoded = serializeBordersViewState({
      center: [-74, 40.7],
      zoom: 3.1,
      bearing: 18,
      pitch: 24,
    });
    const decoded = deserializeBordersViewState(encoded);

    expect(decoded?.center[0]).toBeCloseTo(-74, 4);
    expect(decoded?.center[1]).toBeCloseTo(40.7, 4);
    expect(decoded?.zoom).toBeCloseTo(3.1, 2);
    expect(decoded?.bearing).toBeCloseTo(18, 2);
    expect(decoded?.pitch).toBeCloseTo(24, 2);
  });

  it('returns null for malformed payloads', () => {
    expect(deserializeViewState('not-valid')).toBeNull();
    expect(deserializeHeadwayViewState('still-not-valid')).toBeNull();
  });

  it('normalizes stale local dev Geo paths while preserving params', () => {
    expect(
      normalizeRuntimeUrl(
        'http://localhost:6000/Geo/?view=abc123&mode=headway#hud',
        'local-dev',
      ),
    ).toBe('http://localhost:6000/?view=abc123&mode=headway#hud');
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
        'http://localhost:6000/Geo/?view=stale',
      ),
    ).toMatch(/^http:\/\/localhost:6000\/\?view=/);
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

  it('builds Borders Pages URLs with mode, map state, profile, and focus', () => {
    const url = buildViewUrlForMode(
      DEFAULT_VIEW,
      'pages',
      'https://example.com/',
      {
        viewerMode: 'borders',
        bordersView: {
          center: [-96, 37.8],
          zoom: 2.7,
          bearing: 16,
          pitch: 22,
        },
        bordersProfileId: 'population',
        bordersFocusedCountryIso: 'USA',
      },
    );

    const parsed = new URL(url);

    expect(parsed.searchParams.get('mode')).toBe('borders');
    expect(parsed.searchParams.get('map')).toMatch(/\S+/);
    expect(parsed.searchParams.get('profile')).toBe('population');
    expect(parsed.searchParams.get('focus')).toBe('USA');
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

  it('reads Borders mode state from the URL', () => {
    const map = serializeBordersViewState({
      center: [-96, 37.8],
      zoom: 2.7,
      bearing: 16,
      pitch: 22,
    });
    const view = serializeViewState(DEFAULT_VIEW);
    window.history.replaceState(
      {},
      '',
      `/Geo/?mode=borders&view=${view}&map=${map}&profile=hierarchy&focus=usa`,
    );

    const state = readUrlState();

    expect(state.mode).toBe('borders');
    expect(state.bordersView.center[0]).toBeCloseTo(-96, 3);
    expect(state.bordersView.center[1]).toBeCloseTo(37.8, 3);
    expect(state.bordersProfileId).toBe('hierarchy');
    expect(state.bordersFocusedCountryIso).toBe('USA');
  });

  it('disables live view sync in local-dev mode only', () => {
    expect(shouldLiveSyncViewUrl('local-dev')).toBe(false);
    expect(shouldLiveSyncViewUrl('pages')).toBe(true);
  });
});
