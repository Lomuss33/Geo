import { Quaternion, Vector2, Vector3 } from 'three';
import type { GlobeViewState } from '../state/viewerStore';

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const damp = (
  current: number,
  target: number,
  smoothing: number,
  delta: number,
) => current + (target - current) * (1 - Math.exp(-smoothing * delta));

export const quaternionFromArray = (rotation: GlobeViewState['rotation']) =>
  new Quaternion(
    rotation[0],
    rotation[1],
    rotation[2],
    rotation[3],
  ).normalize();

export const quaternionToArray = (
  quaternion: Quaternion,
): GlobeViewState['rotation'] => [
  quaternion.x,
  quaternion.y,
  quaternion.z,
  quaternion.w,
];

export const cloneView = (view: GlobeViewState): GlobeViewState => ({
  rotation: [...view.rotation] as GlobeViewState['rotation'],
  distance: view.distance,
  fov: view.fov,
});

export const viewsEqual = (
  left: GlobeViewState,
  right: GlobeViewState,
  epsilon = 1e-4,
) =>
  Math.abs(left.distance - right.distance) < epsilon &&
  Math.abs(left.fov - right.fov) < epsilon &&
  left.rotation.every(
    (value, index) => Math.abs(value - (right.rotation[index] ?? 0)) < epsilon,
  );

export const mapPointerToArcball = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
) => {
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const point = new Vector2(x, y);
  const length = point.lengthSq();

  if (length <= 1) {
    return new Vector3(point.x, point.y, Math.sqrt(1 - length)).normalize();
  }

  return new Vector3(point.x, point.y, 0).normalize();
};

export const angleFromViewportCenter = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
) => {
  const x = clientX - (rect.left + rect.width / 2);
  const y = clientY - (rect.top + rect.height / 2);
  return Math.atan2(y, x);
};

export const shortestAngleDelta = (from: number, to: number) => {
  let delta = to - from;

  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  return delta;
};
