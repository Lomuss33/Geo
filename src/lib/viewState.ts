import type {
  BordersProfileId,
  BordersViewState,
  GlobeViewState,
  HeadwayViewState,
  ViewerMode,
} from '../state/viewerStore';
import {
  bordersFromGeo,
  normalizeBordersView,
} from './bordersBridge';
import {
  DEFAULT_DISTANCE,
  DEFAULT_FOV,
  DEFAULT_VIEW,
  MAX_DISTANCE,
  MIN_DISTANCE,
} from './constants';
import { headwayFromGeo, normalizeHeadwayView } from './modeBridge';
import { clamp } from './math';

export type RuntimeUrlMode = 'local-dev' | 'pages';

type ViewerUrlOptions = {
  viewerMode?: ViewerMode;
  headwayView?: HeadwayViewState | null;
  bordersView?: BordersViewState | null;
  bordersProfileId?: BordersProfileId | null;
  bordersFocusedCountryIso?: string | null;
};

type UrlState = {
  mode: ViewerMode;
  view: GlobeViewState;
  headwayView: HeadwayViewState;
  bordersView: BordersViewState;
  bordersProfileId: BordersProfileId;
  bordersFocusedCountryIso: string | null;
};

const isFiniteTuple = (
  value: unknown,
): value is [number, number, number, number] =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));

const encodePayload = (payload: object) =>
  btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const decodePayload = <T>(encoded: string | null): T | null => {
  if (!encoded) {
    return null;
  }

  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as T;
  } catch {
    return null;
  }
};

export const resolveRuntimeUrlMode = (mode: string): RuntimeUrlMode =>
  mode === 'local-dev' ? 'local-dev' : 'pages';

export const getRuntimeUrlMode = () =>
  resolveRuntimeUrlMode(import.meta.env.MODE);

export const shouldLiveSyncViewUrl = (
  mode: RuntimeUrlMode = getRuntimeUrlMode(),
) => mode === 'pages';

export const normalizeRuntimeUrl = (
  currentHref: string,
  mode: RuntimeUrlMode,
) => {
  const url = new URL(currentHref);

  if (
    mode === 'local-dev' &&
    (url.pathname === '/Geo' ||
      url.pathname === '/Geo/' ||
      url.pathname === '/Geo/index.html')
  ) {
    url.pathname = '/';
  }

  return url.toString();
};

export const normalizeViewState = (
  candidate: Partial<GlobeViewState> | null | undefined,
): GlobeViewState => {
  if (!candidate || !isFiniteTuple(candidate.rotation)) {
    return DEFAULT_VIEW;
  }

  return {
    rotation: candidate.rotation,
    distance: clamp(
      candidate.distance ?? DEFAULT_DISTANCE,
      MIN_DISTANCE,
      MAX_DISTANCE,
    ),
    fov: clamp(candidate.fov ?? DEFAULT_FOV, 20, 45),
  };
};

export const serializeViewState = (view: GlobeViewState) =>
  encodePayload({
    r: view.rotation.map((value) => Number(value.toFixed(6))),
    d: Number(view.distance.toFixed(4)),
    f: Number(view.fov.toFixed(2)),
  });

export const deserializeViewState = (
  encoded: string | null,
): GlobeViewState | null => {
  const parsed = decodePayload<{
    d?: number;
    f?: number;
    r?: [number, number, number, number];
  }>(encoded);

  if (!parsed) {
    return null;
  }

  return normalizeViewState({
    rotation: parsed.r,
    distance: parsed.d,
    fov: parsed.f,
  });
};

export const serializeHeadwayViewState = (view: HeadwayViewState) => {
  const normalized = normalizeHeadwayView(view);

  return encodePayload({
    c: normalized.center.map((value) => Number(value.toFixed(6))),
    z: Number(normalized.zoom.toFixed(3)),
    b: Number(normalized.bearing.toFixed(2)),
    p: Number(normalized.pitch.toFixed(2)),
  });
};

export const deserializeHeadwayViewState = (
  encoded: string | null,
): HeadwayViewState | null => {
  const parsed = decodePayload<{
    b?: number;
    c?: [number, number];
    p?: number;
    z?: number;
  }>(encoded);

  if (!parsed) {
    return null;
  }

  return normalizeHeadwayView({
    center: parsed.c,
    zoom: parsed.z,
    bearing: parsed.b,
    pitch: parsed.p,
  });
};

export const serializeBordersViewState = (view: BordersViewState) => {
  const normalized = normalizeBordersView(view);

  return encodePayload({
    c: normalized.center.map((value) => Number(value.toFixed(6))),
    z: Number(normalized.zoom.toFixed(3)),
    b: Number(normalized.bearing.toFixed(2)),
    p: Number(normalized.pitch.toFixed(2)),
  });
};

export const deserializeBordersViewState = (
  encoded: string | null,
): BordersViewState | null => {
  const parsed = decodePayload<{
    b?: number;
    c?: [number, number];
    p?: number;
    z?: number;
  }>(encoded);

  if (!parsed) {
    return null;
  }

  return normalizeBordersView({
    center: parsed.c,
    zoom: parsed.z,
    bearing: parsed.b,
    pitch: parsed.p,
  });
};

export const readViewerModeFromUrl = () => {
  const url = new URL(window.location.href);
  const mode = url.searchParams.get('mode');
  return mode === 'headway' || mode === 'borders' ? mode : 'geo';
};

export const readViewFromUrl = () => {
  const url = new URL(window.location.href);
  return deserializeViewState(url.searchParams.get('view')) ?? DEFAULT_VIEW;
};

export const readHeadwayViewFromUrl = () => {
  const url = new URL(window.location.href);
  return deserializeHeadwayViewState(url.searchParams.get('map'));
};

export const readBordersViewFromUrl = () => {
  const url = new URL(window.location.href);
  return deserializeBordersViewState(url.searchParams.get('map'));
};

export const readBordersProfileFromUrl = (): BordersProfileId => {
  const url = new URL(window.location.href);
  const profile = url.searchParams.get('profile');
  return profile === 'population' || profile === 'hierarchy' ? profile : 'gdp';
};

export const readBordersFocusedCountryIsoFromUrl = () => {
  const url = new URL(window.location.href);
  const focusedCountryIso = url.searchParams.get('focus');
  return focusedCountryIso ? focusedCountryIso.toUpperCase() : null;
};

export const readUrlState = (): UrlState => {
  const view = readViewFromUrl();
  const mode = readViewerModeFromUrl();
  return {
    mode,
    view,
    headwayView: readHeadwayViewFromUrl() ?? headwayFromGeo(view),
    bordersView: readBordersViewFromUrl() ?? bordersFromGeo(view),
    bordersProfileId: readBordersProfileFromUrl(),
    bordersFocusedCountryIso: readBordersFocusedCountryIsoFromUrl(),
  };
};

export const buildViewUrlForMode = (
  view: GlobeViewState,
  mode: RuntimeUrlMode,
  currentHref: string,
  options: ViewerUrlOptions = {},
) => {
  const url = new URL(normalizeRuntimeUrl(currentHref, mode));
  const viewerMode = options.viewerMode ?? 'geo';

  url.pathname = mode === 'local-dev' ? '/' : '/Geo/';
  url.searchParams.set('view', serializeViewState(view));
  url.searchParams.set('mode', viewerMode);

  if (viewerMode === 'headway' && options.headwayView) {
    url.searchParams.set('map', serializeHeadwayViewState(options.headwayView));
    url.searchParams.delete('profile');
    url.searchParams.delete('focus');
  } else if (viewerMode === 'borders' && options.bordersView) {
    url.searchParams.set('map', serializeBordersViewState(options.bordersView));
    url.searchParams.set('profile', options.bordersProfileId ?? 'gdp');
    if (options.bordersFocusedCountryIso) {
      url.searchParams.set('focus', options.bordersFocusedCountryIso);
    } else {
      url.searchParams.delete('focus');
    }
  } else {
    url.searchParams.delete('map');
    url.searchParams.delete('profile');
    url.searchParams.delete('focus');
  }

  return url.toString();
};

export const buildViewUrl = (
  view: GlobeViewState,
  currentHref = window.location.href,
  options: ViewerUrlOptions = {},
) => buildViewUrlForMode(view, getRuntimeUrlMode(), currentHref, options);

export const normalizeInitialRuntimeUrl = () => {
  const normalizedUrl = normalizeRuntimeUrl(
    window.location.href,
    getRuntimeUrlMode(),
  );

  if (normalizedUrl !== window.location.href) {
    window.history.replaceState({}, '', normalizedUrl);
  }
};

export const updateUrlWithView = (
  view: GlobeViewState,
  options: ViewerUrlOptions = {},
) => {
  window.history.replaceState({}, '', buildViewUrl(view, window.location.href, options));
};
