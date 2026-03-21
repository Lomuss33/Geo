import { Quaternion, Vector3 } from 'three';
import { MAX_DISTANCE, MIN_DISTANCE, viewFromLatLon } from './constants';
import {
  getRollDegrees,
  getViewCenterLocal,
  vector3ToLatLon,
} from './geo';
import { clamp, quaternionFromArray, quaternionToArray } from './math';
import { normalizeHeadwayView } from './modeBridge';
import type { GlobeViewState, HeadwayViewState } from '../state/viewerStore';

type Direction = 'left' | 'right' | 'up' | 'down';
type GeoRotationKind = 'yaw' | 'pitch' | 'roll';
export type GeoPoseFields = {
  lat: number;
  lon: number;
  distance: number;
  rollDeg: number;
  fov: number;
};

const SCREEN_X_AXIS = new Vector3(1, 0, 0);
const SCREEN_Y_AXIS = new Vector3(0, 1, 0);
const SCREEN_Z_AXIS = new Vector3(0, 0, 1);

const wrapLongitude = (lon: number) => {
  let normalized = lon;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return normalized;
};

const normalizeRollDegrees = (rollDeg: number) => {
  let normalized = rollDeg;

  while (normalized > 180) {
    normalized -= 360;
  }

  while (normalized < -180) {
    normalized += 360;
  }

  return clamp(normalized, -180, 180);
};

const deriveGeoCenterAndRoll = (view: GlobeViewState) => {
  const rotation = quaternionFromArray(view.rotation);
  const center = vector3ToLatLon(getViewCenterLocal(rotation));

  return {
    lat: center.lat,
    lon: center.lon,
    rollDeg: getRollDegrees(rotation),
  };
};

export const deriveGeoPoseFields = (view: GlobeViewState): GeoPoseFields => {
  const { lat, lon, rollDeg } = deriveGeoCenterAndRoll(view);

  return {
    lat,
    lon,
    distance: clamp(view.distance, MIN_DISTANCE, MAX_DISTANCE),
    rollDeg: normalizeRollDegrees(rollDeg),
    fov: clamp(view.fov, 20, 45),
  };
};

export const buildGeoViewFromPoseFields = (
  fields: GeoPoseFields,
): GlobeViewState => ({
  ...viewFromLatLon(
    clamp(fields.lat, -89.5, 89.5),
    wrapLongitude(fields.lon),
    clamp(fields.distance, MIN_DISTANCE, MAX_DISTANCE),
    normalizeRollDegrees(fields.rollDeg),
  ),
  fov: clamp(fields.fov, 20, 45),
});

export const resetGeoAxes = (view: GlobeViewState): GlobeViewState => {
  const rotation = quaternionFromArray(view.rotation);
  const rollDeg = getRollDegrees(rotation);

  if (Math.abs(rollDeg) < 1e-4) {
    return {
      ...view,
      rotation: [...view.rotation] as GlobeViewState['rotation'],
    };
  }

  const correction = new Quaternion().setFromAxisAngle(
    SCREEN_Z_AXIS,
    (rollDeg * Math.PI) / 180,
  );
  const corrected = correction.multiply(rotation).normalize();

  return {
    ...view,
    rotation: quaternionToArray(corrected),
  };
};

export const nudgeGeoCenter = (
  view: GlobeViewState,
  direction: Direction,
  stepDeg: number,
) => {
  const { lat, lon, rollDeg } = deriveGeoCenterAndRoll(view);
  const nextLat =
    direction === 'up'
      ? clamp(lat + stepDeg, -89.5, 89.5)
      : direction === 'down'
        ? clamp(lat - stepDeg, -89.5, 89.5)
        : lat;
  const nextLon =
    direction === 'left'
      ? wrapLongitude(lon - stepDeg)
      : direction === 'right'
        ? wrapLongitude(lon + stepDeg)
        : lon;

  return {
    ...viewFromLatLon(nextLat, nextLon, view.distance, rollDeg),
    fov: view.fov,
  };
};

export const stepGeoRoll = (view: GlobeViewState, deltaDeg: number) => {
  const { lat, lon, rollDeg } = deriveGeoCenterAndRoll(view);

  return {
    ...viewFromLatLon(lat, lon, view.distance, rollDeg + deltaDeg),
    fov: view.fov,
  };
};

const stepGeoRotation = (
  view: GlobeViewState,
  kind: GeoRotationKind,
  deltaDeg: number,
) => {
  const axis =
    kind === 'pitch'
      ? SCREEN_X_AXIS
      : kind === 'yaw'
        ? SCREEN_Y_AXIS
        : SCREEN_Z_AXIS;
  const delta = new Quaternion().setFromAxisAngle(
    axis,
    (deltaDeg * Math.PI) / 180,
  );
  const nextRotation = delta
    .multiply(quaternionFromArray(view.rotation))
    .normalize();

  return {
    ...view,
    rotation: quaternionToArray(nextRotation),
  };
};

export const stepGeoYaw = (view: GlobeViewState, deltaDeg: number) =>
  stepGeoRotation(view, 'yaw', deltaDeg);

export const stepGeoPitch = (view: GlobeViewState, deltaDeg: number) =>
  stepGeoRotation(view, 'pitch', deltaDeg);

export const stepGeoTrimRoll = (view: GlobeViewState, deltaDeg: number) =>
  stepGeoRotation(view, 'roll', deltaDeg);

export const stepGeoDistance = (view: GlobeViewState, delta: number) => ({
  ...view,
  distance: clamp(view.distance + delta, MIN_DISTANCE, MAX_DISTANCE),
});

export const resetHeadwayAxes = (
  view: HeadwayViewState,
): HeadwayViewState => {
  const normalized = normalizeHeadwayView(view);

  return {
    ...normalized,
    bearing: 0,
    pitch: 0,
  };
};

export const nudgeHeadwayCenter = (
  view: HeadwayViewState,
  direction: Direction,
  stepDeg: number,
) => {
  const normalized = normalizeHeadwayView(view);
  const [lon, lat] = normalized.center;
  const nextLat =
    direction === 'up'
      ? clamp(lat + stepDeg, -89.5, 89.5)
      : direction === 'down'
        ? clamp(lat - stepDeg, -89.5, 89.5)
        : lat;
  const nextLon =
    direction === 'left'
      ? wrapLongitude(lon - stepDeg)
      : direction === 'right'
        ? wrapLongitude(lon + stepDeg)
        : lon;

  return normalizeHeadwayView({
    ...normalized,
    center: [nextLon, nextLat],
  });
};

export const stepHeadwayBearing = (
  view: HeadwayViewState,
  deltaDeg: number,
) => {
  const normalized = normalizeHeadwayView(view);

  return normalizeHeadwayView({
    ...normalized,
    bearing: normalized.bearing + deltaDeg,
  });
};

export const stepHeadwayPitch = (
  view: HeadwayViewState,
  deltaDeg: number,
) => {
  const normalized = normalizeHeadwayView(view);

  return normalizeHeadwayView({
    ...normalized,
    pitch: normalized.pitch + deltaDeg,
  });
};

export const stepHeadwayZoom = (view: HeadwayViewState, delta: number) => {
  const normalized = normalizeHeadwayView(view);

  return normalizeHeadwayView({
    ...normalized,
    zoom: normalized.zoom + delta,
  });
};
