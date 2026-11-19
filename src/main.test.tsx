import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VIEW, viewFromLatLon } from './lib/constants';
import { getResponsiveStartupGeoView } from './lib/camera';
import { serializeHeadwayViewState, serializeViewState } from './lib/viewState';

vi.mock('react-dom/client', () => ({
  default: { createRoot: () => ({ render: vi.fn() }) },
}));
vi.mock('./app/App', () => ({ default: () => null }));
vi.mock('./lib/theme', () => ({ initializeTheme: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('MODE', 'local-dev');
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState({}, '', '/');
  document.body.replaceChildren();
});

async function boot(query: string) {
  window.history.replaceState({}, '', `/Geo/${query}`);
  const { useViewerStore } = await import('./state/viewerStore');
  await import('./main');
  return useViewerStore.getState();
}

describe('entrypoint view restoration', () => {
  it('restores an explicit Geo pose/zoom without applying either startup fit', async () => {
    const view = viewFromLatLon(-10, -54, 2.4);
    const state = await boot(`?view=${serializeViewState(view)}&mode=geo`);
    expect(state.view.distance).toBeCloseTo(2.4, 4);
    expect(state.view.rotation).toEqual(state.targetView.rotation);
    view.rotation.forEach((value, index) =>
      expect(state.view.rotation[index]).toBeCloseTo(value, 5),
    );
    expect(state.hasInteracted).toBe(true);
    expect(window.location.pathname).toBe('/');
  });

  it.each([
    '',
    '?view=invalid',
    `?view=${btoa('{}')}`,
    `?view=${btoa('{"r":[0,0,0,0]}')}`,
  ])('keeps responsive default fitting for launch %s', async (query) => {
    const state = await boot(query);
    const expected = getResponsiveStartupGeoView(
      DEFAULT_VIEW,
      innerWidth,
      innerHeight,
    );
    expect(state.view).toEqual(expected);
    expect(state.targetView).toEqual(expected);
    expect(state.hasInteracted).toBe(false);
  });

  it('keeps an explicit Headway map frame authoritative', async () => {
    const map = {
      center: [18, 44] as [number, number],
      zoom: 3,
      bearing: 17,
      pitch: 12,
    };
    const state = await boot(
      `?mode=headway&map=${serializeHeadwayViewState(map)}`,
    );
    expect(state.viewerMode).toBe('headway');
    expect(state.headwayView).toEqual(map);
  });
});
