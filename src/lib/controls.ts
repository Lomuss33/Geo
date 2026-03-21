import type { RotationAxis } from '../state/viewerStore';

export const AXIS_LOCK_THRESHOLD_PX = 8;
export const DRAG_ROTATION_MULTIPLIER = 1.35;

export const resolveRotationAxis = (
  deltaX: number,
  deltaY: number,
  threshold = AXIS_LOCK_THRESHOLD_PX,
): RotationAxis => {
  if (Math.hypot(deltaX, deltaY) < threshold) {
    return null;
  }

  return Math.abs(deltaX) >= Math.abs(deltaY) ? 'y' : 'x';
};

export const rotationAngleFromDrag = (delta: number, viewportSpan: number) => {
  if (viewportSpan <= 0) {
    return 0;
  }

  return (delta / viewportSpan) * Math.PI * DRAG_ROTATION_MULTIPLIER;
};
