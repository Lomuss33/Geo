import { Euler, Quaternion, Vector3 } from 'three';
import type { GlobeViewState, ViewerPreset } from '../state/viewerStore';

export const EARTH_RADIUS_KM = 6_371;
export const FRONT_VECTOR = new Vector3(0, 0, 1);
export const SCREEN_UP = new Vector3(0, 1, 0);

const latLonToVector = (lat: number, lon: number) => {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  const cosPhi = Math.cos(phi);

  return new Vector3(
    cosPhi * Math.cos(theta),
    Math.sin(phi),
    -cosPhi * Math.sin(theta),
  );
};

const quaternionFromLatLon = (lat: number, lon: number) =>
  new Quaternion()
    .setFromUnitVectors(latLonToVector(lat, lon), FRONT_VECTOR)
    .normalize();

export const LOCAL_SUN_DIRECTION = latLonToVector(18, -22).normalize();
export const DEFAULT_FOV = 28;
export const DEFAULT_DISTANCE = 3.15;
export const MIN_DISTANCE = 0.78;
export const MAX_DISTANCE = 6.2;
export const STORAGE_KEYS = {
  onboarding: 'geo:onboarding-dismissed',
  quality: 'geo:quality-mode',
  rotationMode: 'geo:rotation-mode',
  animationDraftGeo: 'geo:animation-draft:geo',
  animationDraftHeadway: 'geo:animation-draft:headway',
} as const;

export const viewFromLatLon = (
  lat: number,
  lon: number,
  distance: number,
  rollDeg = 0,
): GlobeViewState => {
  const centered = quaternionFromLatLon(lat, lon);
  const roll = new Quaternion().setFromEuler(
    new Euler(0, 0, (rollDeg * Math.PI) / 180),
  );
  centered.premultiply(roll);

  return {
    rotation: centered.toArray() as GlobeViewState['rotation'],
    distance,
    fov: DEFAULT_FOV,
  };
};

export const DEFAULT_VIEW = viewFromLatLon(19.5, -28, DEFAULT_DISTANCE);

export const VIEWER_PRESETS: ViewerPreset[] = [
  {
    id: 'atlantic',
    label: 'Atlantic Drift',
    description: 'Balanced mission-control framing over the Atlantic corridor.',
    state: DEFAULT_VIEW,
  },
  {
    id: 'europe-africa',
    label: 'Europe / Africa',
    description: 'Dense city-light belt with a bright atmospheric rim.',
    state: viewFromLatLon(22, 13, 2.9),
  },
  {
    id: 'pacific',
    label: 'Pacific Span',
    description: 'Wide ocean framing with calmer cloud structure.',
    state: viewFromLatLon(5, -155, 3.75, -10),
  },
  {
    id: 'south-pole',
    label: 'Polar Dive',
    description: 'Steeper angle for a more dramatic ice-cap composition.',
    state: viewFromLatLon(-74, 30, 2.65, 24),
  },
  {
    id: 'americas-arc',
    label: 'Americas Arc',
    description:
      'North and South America corridor with balanced Atlantic and Pacific framing.',
    state: viewFromLatLon(24, -98, 3.05),
  },
  {
    id: 'asia-oceania',
    label: 'Asia / Oceania',
    description:
      'East Asia to Oceania span with dense coastline and island framing.',
    state: viewFromLatLon(16, 118, 3.1),
  },
];
