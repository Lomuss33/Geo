import { DEFAULT_FOV, MAX_DISTANCE, MIN_DISTANCE } from './constants';
import {
  getViewCenterLocal,
  quaternionFromCenteredLatLon,
  vector3ToLatLon,
} from './geo';
import { clamp, quaternionFromArray, quaternionToArray } from './math';
import type { BordersViewState, GlobeViewState } from '../state/viewerStore';

const DISTANCE_TO_ZOOM_ANCHORS = [
  { distance: MAX_DISTANCE, zoom: 0.8 },
  { distance: 3.15, zoom: 1.8 },
  { distance: MIN_DISTANCE, zoom: 3.2 },
] as const;

const DEFAULT_BORDERS_CENTER = [-28, 19.5] as const;
const MIN_BORDERS_ZOOM = 0.6;
const MAX_BORDERS_ZOOM = 5.5;

const interpolateAnchors = (
  value: number,
  inputKey: 'distance' | 'zoom',
  outputKey: 'distance' | 'zoom',
) => {
  const anchors = [...DISTANCE_TO_ZOOM_ANCHORS].sort(
    (left, right) => left[inputKey] - right[inputKey],
  );

  if (value <= anchors[0]![inputKey]) {
    return anchors[0]![outputKey];
  }

  if (value >= anchors.at(-1)![inputKey]) {
    return anchors.at(-1)![outputKey];
  }

  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1]!;
    const current = anchors[index]!;

    if (value <= current[inputKey]) {
      const span = current[inputKey] - previous[inputKey];
      const progress = span === 0 ? 0 : (value - previous[inputKey]) / span;
      return previous[outputKey] + (current[outputKey] - previous[outputKey]) * progress;
    }
  }

  return anchors.at(-1)![outputKey];
};

export const distanceToBordersZoom = (distance: number) =>
  clamp(
    interpolateAnchors(distance, 'distance', 'zoom'),
    MIN_BORDERS_ZOOM,
    MAX_BORDERS_ZOOM,
  );

export const bordersZoomToDistance = (zoom: number) =>
  clamp(
    interpolateAnchors(
      clamp(zoom, MIN_BORDERS_ZOOM, MAX_BORDERS_ZOOM),
      'zoom',
      'distance',
    ),
    MIN_DISTANCE,
    MAX_DISTANCE,
  );

export const cloneBordersView = (
  view: BordersViewState,
): BordersViewState => ({
  center: [...view.center] as BordersViewState['center'],
  zoom: view.zoom,
  bearing: view.bearing,
  pitch: view.pitch,
});

export const bordersViewsEqual = (
  left: BordersViewState,
  right: BordersViewState,
  epsilon = 1e-3,
) =>
  Math.abs(left.center[0] - right.center[0]) < epsilon &&
  Math.abs(left.center[1] - right.center[1]) < epsilon &&
  Math.abs(left.zoom - right.zoom) < epsilon &&
  Math.abs(left.bearing - right.bearing) < epsilon &&
  Math.abs(left.pitch - right.pitch) < epsilon;

export const normalizeBordersView = (
  candidate: Partial<BordersViewState> | null | undefined,
): BordersViewState => {
  const center =
    Array.isArray(candidate?.center) &&
    candidate.center.length === 2 &&
    candidate.center.every((entry) => Number.isFinite(entry))
      ? ([candidate.center[0], candidate.center[1]] as BordersViewState['center'])
      : ([...DEFAULT_BORDERS_CENTER] as BordersViewState['center']);

  return {
    center,
    zoom: clamp(candidate?.zoom ?? 1.8, MIN_BORDERS_ZOOM, MAX_BORDERS_ZOOM),
    bearing: clamp(candidate?.bearing ?? 0, -180, 180),
    pitch: clamp(candidate?.pitch ?? 0, 0, 60),
  };
};

export const bordersFromGeo = (view: GlobeViewState): BordersViewState => {
  const centerLocal = getViewCenterLocal(quaternionFromArray(view.rotation));
  const { lat, lon } = vector3ToLatLon(centerLocal);

  return normalizeBordersView({
    center: [lon, lat],
    zoom: distanceToBordersZoom(view.distance),
    bearing: 0,
    pitch: 0,
  });
};

export const geoFromBorders = (view: BordersViewState): GlobeViewState => {
  const normalized = normalizeBordersView(view);
  const [lon, lat] = normalized.center;
  const centered = quaternionFromCenteredLatLon(lat, lon);

  return {
    rotation: quaternionToArray(centered),
    distance: bordersZoomToDistance(normalized.zoom),
    fov: DEFAULT_FOV,
  };
};
