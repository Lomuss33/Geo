import { describe, expect, it } from 'vitest';
import {
  AXIS_LOCK_THRESHOLD_PX,
  resolveRotationAxis,
  rotationAngleFromDrag,
} from './controls';
import { mapPointerToArcball } from './math';

describe('control helpers', () => {
  it('locks mostly horizontal motion to globe y rotation', () => {
    expect(resolveRotationAxis(24, 7)).toBe('y');
  });

  it('locks mostly vertical motion to globe x rotation', () => {
    expect(resolveRotationAxis(6, -26)).toBe('x');
  });

  it('does not lock until the gesture exceeds the threshold', () => {
    expect(resolveRotationAxis(AXIS_LOCK_THRESHOLD_PX - 1, 0)).toBeNull();
  });

  it('maps drag distance to a stable angular delta', () => {
    expect(rotationAngleFromDrag(250, 1_000)).toBeCloseTo(Math.PI * 0.3375, 5);
  });

  it('maps arcball pointers to normalized vectors', () => {
    const rect = new DOMRect(0, 0, 1_000, 800);
    const point = mapPointerToArcball(500, 400, rect);

    expect(point.length()).toBeCloseTo(1, 5);
  });

  it('supports diagonal arcball motion for free orbit drags', () => {
    const rect = new DOMRect(0, 0, 1_000, 800);
    const startPoint = mapPointerToArcball(500, 400, rect);
    const nextPoint = mapPointerToArcball(650, 250, rect);

    expect(startPoint.x).not.toBeCloseTo(nextPoint.x, 5);
    expect(startPoint.y).not.toBeCloseTo(nextPoint.y, 5);
  });
});
