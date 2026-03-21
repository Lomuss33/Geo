import {
  DEFAULT_DISTANCE,
  DEFAULT_FOV,
  MAX_DISTANCE,
  MIN_DISTANCE,
} from './constants';
import {
  getViewCenterLocal,
  quaternionFromCenteredLatLon,
  vector3ToLatLon,
} from './geo';
import { clamp, quaternionFromArray, quaternionToArray } from './math';
import type { GlobeViewState, HeadwayViewState } from '../state/viewerStore';

const DISTANCE_TO_ZOOM_ANCHORS = [
  { distance: MAX_DISTANCE, zoom: 0.8 },
  { distance: DEFAULT_DISTANCE, zoom: 1.8 },
  { distance: MIN_DISTANCE, zoom: 3.2 },
] as const;

const MIN_HEADWAY_ZOOM = 0.6;
const MAX_HEADWAY_ZOOM = 5.5;

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

export const distanceToHeadwayZoom = (distance: number) =>
  clamp(
    interpolateAnchors(distance, 'distance', 'zoom'),
    MIN_HEADWAY_ZOOM,
    MAX_HEADWAY_ZOOM,
  );

export const headwayZoomToDistance = (zoom: number) =>
  clamp(
    interpolateAnchors(
      clamp(zoom, MIN_HEADWAY_ZOOM, MAX_HEADWAY_ZOOM),
      'zoom',
      'distance',
    ),
    MIN_DISTANCE,
    MAX_DISTANCE,
  );

export const cloneHeadwayView = (
  view: HeadwayViewState,
): HeadwayViewState => ({
  center: [...view.center] as HeadwayViewState['center'],
  zoom: view.zoom,
  bearing: view.bearing,
  pitch: view.pitch,
});

export const headwayViewsEqual = (
  left: HeadwayViewState,
  right: HeadwayViewState,
  epsilon = 1e-3,
) =>
  Math.abs(left.center[0] - right.center[0]) < epsilon &&
  Math.abs(left.center[1] - right.center[1]) < epsilon &&
  Math.abs(left.zoom - right.zoom) < epsilon &&
  Math.abs(left.bearing - right.bearing) < epsilon &&
  Math.abs(left.pitch - right.pitch) < epsilon;

export const normalizeHeadwayView = (
  candidate: Partial<HeadwayViewState> | null | undefined,
): HeadwayViewState => {
  const center =
    Array.isArray(candidate?.center) &&
    candidate.center.length === 2 &&
    candidate.center.every((entry) => Number.isFinite(entry))
      ? ([candidate.center[0], candidate.center[1]] as HeadwayViewState['center'])
      : ([-28, 19.5] as HeadwayViewState['center']);

  return {
    center,
    zoom: clamp(candidate?.zoom ?? 1.8, MIN_HEADWAY_ZOOM, MAX_HEADWAY_ZOOM),
    bearing: clamp(candidate?.bearing ?? 0, -180, 180),
    pitch: clamp(candidate?.pitch ?? 0, 0, 60),
  };
};

export const headwayFromGeo = (view: GlobeViewState): HeadwayViewState => {
  const centerLocal = getViewCenterLocal(quaternionFromArray(view.rotation));
  const { lat, lon } = vector3ToLatLon(centerLocal);

  return normalizeHeadwayView({
    center: [lon, lat],
    zoom: distanceToHeadwayZoom(view.distance),
    bearing: 0,
    pitch: 0,
  });
};

export const geoFromHeadway = (view: HeadwayViewState): GlobeViewState => {
  const normalized = normalizeHeadwayView(view);
  const [lon, lat] = normalized.center;
  const centered = quaternionFromCenteredLatLon(lat, lon);

  return {
    rotation: quaternionToArray(centered),
    distance: headwayZoomToDistance(normalized.zoom),
    fov: DEFAULT_FOV,
  };
};
