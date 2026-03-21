import { describe, expect, it } from 'vitest';
import { viewFromLatLon } from './constants';
import { getRollDegrees, getViewCenterLocal, vector3ToLatLon } from './geo';
import { quaternionFromArray, viewsEqual } from './math';
import {
  buildGeoViewFromPoseFields,
  deriveGeoPoseFields,
  nudgeGeoCenter,
  nudgeHeadwayCenter,
  resetGeoAxes,
  resetHeadwayAxes,
  stepGeoDistance,
  stepGeoPitch,
  stepGeoRoll,
  stepGeoTrimRoll,
  stepGeoYaw,
  stepHeadwayBearing,
  stepHeadwayPitch,
  stepHeadwayZoom,
} from './navigation';

describe('navigation helpers', () => {
  it('resets Geo axes to north-up while preserving center and distance', () => {
    const source = viewFromLatLon(20, 15, 3.4, 24);
    const reset = resetGeoAxes(source);
    const center = vector3ToLatLon(
      getViewCenterLocal(quaternionFromArray(reset.rotation)),
    );

    expect(center.lat).toBeCloseTo(20, 2);
    expect(center.lon).toBeCloseTo(15, 2);
    expect(reset.distance).toBeCloseTo(3.4, 4);
    expect(reset.fov).toBeCloseTo(source.fov, 4);
    expect(getRollDegrees(quaternionFromArray(reset.rotation))).toBeCloseTo(0, 3);
    expect(viewsEqual(reset, source)).toBe(false);
  });

  it('nudges Geo center in the requested direction', () => {
    const next = nudgeGeoCenter(viewFromLatLon(0, 0, 3.15), 'right', 6);
    const center = vector3ToLatLon(
      getViewCenterLocal(quaternionFromArray(next.rotation)),
    );

    expect(center.lon).toBeGreaterThan(5);
  });

  it('steps Geo roll and distance incrementally', () => {
    const source = viewFromLatLon(10, 10, 3.15);
    const rolled = stepGeoRoll(source, 12);
    const zoomed = stepGeoDistance(rolled, -0.2);

    expect(viewsEqual(rolled, source)).toBe(false);
    expect(zoomed.distance).toBeCloseTo(2.95, 3);
  });

  it('derives and rebuilds a Geo start pose from pose fields', () => {
    const source = viewFromLatLon(22, 13, 2.9, 18);
    const pose = deriveGeoPoseFields({
      ...source,
      fov: 31,
    });
    const rebuilt = buildGeoViewFromPoseFields(pose);
    const center = vector3ToLatLon(
      getViewCenterLocal(quaternionFromArray(rebuilt.rotation)),
    );

    expect(center.lat).toBeCloseTo(22, 2);
    expect(center.lon).toBeCloseTo(13, 2);
    expect(rebuilt.distance).toBeCloseTo(2.9, 3);
    expect(rebuilt.fov).toBeCloseTo(31, 3);
    expect(getRollDegrees(quaternionFromArray(rebuilt.rotation))).toBeCloseTo(18, 2);
  });

  it('applies Geo yaw, pitch, and trim roll rotations', () => {
    const source = viewFromLatLon(10, 10, 3.15);
    const yawed = stepGeoYaw(source, 3.5);
    const pitched = stepGeoPitch(source, -3.5);
    const rolled = stepGeoTrimRoll(source, 3.5);

    expect(viewsEqual(yawed, source)).toBe(false);
    expect(viewsEqual(pitched, source)).toBe(false);
    expect(viewsEqual(rolled, source)).toBe(false);
  });

  it('resets Headway axes while preserving center and zoom', () => {
    const reset = resetHeadwayAxes({
      center: [13, 52],
      zoom: 2.4,
      bearing: 22,
      pitch: 18,
    });

    expect(reset).toMatchObject({
      center: [13, 52],
      zoom: 2.4,
      bearing: 0,
      pitch: 0,
    });
  });

  it('nudges Headway center and steps bearing and zoom', () => {
    const moved = nudgeHeadwayCenter(
      {
        center: [13, 52],
        zoom: 2.4,
        bearing: 0,
        pitch: 0,
      },
      'up',
      6,
    );
    const turned = stepHeadwayBearing(moved, 12);
    const zoomed = stepHeadwayZoom(turned, 0.3);

    expect(moved.center[1]).toBeCloseTo(58, 3);
    expect(turned.bearing).toBeCloseTo(12, 3);
    expect(zoomed.zoom).toBeCloseTo(2.7, 3);
  });

  it('steps Headway pitch independently from bearing and zoom', () => {
    const pitched = stepHeadwayPitch(
      {
        center: [13, 52],
        zoom: 2.4,
        bearing: 0,
        pitch: 8,
      },
      3,
    );

    expect(pitched.pitch).toBeCloseTo(11, 3);
    expect(pitched.bearing).toBe(0);
  });
});
