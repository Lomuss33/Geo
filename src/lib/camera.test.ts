import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOV,
  DEFAULT_DISTANCE,
  FRONT_VECTOR,
  MAX_DISTANCE,
  MIN_DISTANCE,
  viewFromLatLon,
} from './constants';
import {
  applyHumanViewConstraint,
  deriveGeoOverviewHeading,
  deriveSurfaceAnchor,
  getCloseZoomInfluence,
  getGeoAnchorScreenY,
  getGeoApparentScale,
  getGeoCameraPose,
  getGeoControlMode,
  getGeoEffectiveFov,
  getGeoViewportCoverage,
  getGeoTargetApparentScale,
  getResponsiveStartupGeoView,
  getOverviewPinnedSurfaceDebug,
  getPinnedSurfaceLocal,
  stepGeoOverviewAnchor,
  stepGeoOverviewHeading,
  surfaceAnchoredGeoView,
} from './camera';
import { quaternionFromArray } from './math';

describe('camera helpers', () => {
  it('keeps the far and default view centered on the globe', () => {
    expect(getGeoCameraPose(viewFromLatLon(10, 20, MAX_DISTANCE))).toEqual({
      position: [0, 0, MAX_DISTANCE],
      target: [0, 0, 0],
      effectiveFov: DEFAULT_FOV,
    });

    expect(
      getGeoCameraPose(viewFromLatLon(-10, 20, DEFAULT_DISTANCE)),
    ).toEqual({
      position: [0, 0, DEFAULT_DISTANCE],
      target: [0, 0, 0],
      effectiveFov: DEFAULT_FOV,
    });
  });

  it('uses the retuned overview rig at minimum distance', () => {
    const pose = getGeoCameraPose(viewFromLatLon(0, 0, MIN_DISTANCE));

    expect(pose.position[0]).toBeCloseTo(0, 6);
    expect(pose.position[1]).toBeCloseTo(1.58, 3);
    expect(pose.position[2]).toBeCloseTo(MIN_DISTANCE + 0.1, 3);
    expect(pose.target[0]).toBeCloseTo(0, 6);
    expect(pose.target[1]).toBeCloseTo(1.04, 3);
    expect(pose.target[2]).toBeCloseTo(0, 6);
    expect(pose.effectiveFov).toBeGreaterThan(30);
    expect(pose.effectiveFov).toBeLessThan(31);
  });

  it('keeps the anchor centered far out and pushes it to the bottom fifth up close', () => {
    expect(getGeoAnchorScreenY(DEFAULT_DISTANCE)).toBeCloseTo(0.5, 6);
    expect(getGeoAnchorScreenY(MIN_DISTANCE)).toBeCloseTo(0.88, 6);
  });

  it('widens the render FOV only as the view moves into overview mode', () => {
    expect(
      getGeoEffectiveFov(viewFromLatLon(0, 0, DEFAULT_DISTANCE)),
    ).toBeCloseTo(DEFAULT_FOV, 6);
    expect(getGeoEffectiveFov(viewFromLatLon(0, 0, MIN_DISTANCE))).toBeCloseTo(
      30.637653,
      5,
    );
  });

  it('adapts the startup globe distance for narrower viewports', () => {
    const desktop = getResponsiveStartupGeoView(
      viewFromLatLon(19.5, -28, DEFAULT_DISTANCE),
      1600,
      900,
    );
    const tablet = getResponsiveStartupGeoView(
      viewFromLatLon(19.5, -28, DEFAULT_DISTANCE),
      1024,
      768,
    );
    const mobile = getResponsiveStartupGeoView(
      viewFromLatLon(19.5, -28, DEFAULT_DISTANCE),
      390,
      844,
    );

    expect(desktop.distance).toBeGreaterThanOrEqual(DEFAULT_DISTANCE);
    expect(tablet.distance).toBeGreaterThanOrEqual(desktop.distance);
    expect(mobile.distance).toBeGreaterThanOrEqual(tablet.distance);
    expect(mobile.distance).toBeLessThanOrEqual(MAX_DISTANCE);
  });

  it('preserves rotation and fov while refitting startup zoom distance', () => {
    const source = {
      ...viewFromLatLon(41, 12, DEFAULT_DISTANCE),
      fov: 33,
    };
    const responsive = getResponsiveStartupGeoView(source, 390, 844);

    expect(responsive.rotation).toEqual(source.rotation);
    expect(responsive.fov).toBe(source.fov);
    expect(responsive.distance).toBeGreaterThan(source.distance);
  });

  it('fits the startup globe inside both viewport dimensions', () => {
    const source = {
      ...viewFromLatLon(37, -15, MIN_DISTANCE),
      fov: DEFAULT_FOV,
    };
    const fitted = getResponsiveStartupGeoView(source, 390, 844);
    const coverage = getGeoViewportCoverage(fitted, 390, 844);

    expect(coverage.widthFraction).toBeLessThanOrEqual(0.985);
    expect(coverage.heightFraction).toBeLessThanOrEqual(0.985);
    expect(fitted.distance).toBeGreaterThan(source.distance);
  });

  it('switches control modes across the three zoom stages', () => {
    expect(getGeoControlMode(DEFAULT_DISTANCE)).toBe('orbit');
    expect(getGeoControlMode((DEFAULT_DISTANCE + MIN_DISTANCE) / 2)).toBe(
      'surface-pan',
    );
    expect(getGeoControlMode(MIN_DISTANCE)).toBe('heading-spin');
    expect(
      getGeoControlMode(MIN_DISTANCE + (DEFAULT_DISTANCE - MIN_DISTANCE) * 0.05),
    ).toBe('heading-spin');
    expect(
      getGeoControlMode(MIN_DISTANCE + (DEFAULT_DISTANCE - MIN_DISTANCE) * 0.45),
    ).toBe('surface-pan');
  });

  it('keeps the horizon transition smooth near the final zoom range', () => {
    const nearCloseDistance =
      DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * 0.9;
    const almostMinDistance =
      DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * 0.97;
    const finalShift =
      getGeoAnchorScreenY(MIN_DISTANCE) - getGeoAnchorScreenY(almostMinDistance);
    const priorShift =
      getGeoAnchorScreenY(almostMinDistance) -
      getGeoAnchorScreenY(nearCloseDistance);

    expect(getCloseZoomInfluence(almostMinDistance)).toBeGreaterThan(0.98);
    expect(finalShift).toBeLessThan(0.02);
    expect(finalShift).toBeLessThan(priorShift);
  });

  it('transitions continuously from satellite framing toward a tangent view while zooming', () => {
    const samples = 24;
    let previous = viewFromLatLon(18, 25, DEFAULT_DISTANCE);
    let largestStepDeg = 0;
    let firstCloseStepDeg = 0;

    for (let index = 1; index <= samples; index += 1) {
      const t = index / samples;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const next = applyHumanViewConstraint(
        {
          ...previous,
          distance,
        },
        {
          sourceDistance: previous.distance,
        },
      );
      const delta = quaternionFromArray(previous.rotation)
        .angleTo(quaternionFromArray(next.rotation));
      const deltaDeg = (delta * 180) / Math.PI;

      if (index === 1) {
        firstCloseStepDeg = deltaDeg;
      }

      largestStepDeg = Math.max(largestStepDeg, deltaDeg);
      previous = next;
    }

    expect(firstCloseStepDeg).toBeGreaterThan(0.01);
    expect(largestStepDeg).toBeLessThan(12);
  });

  it('uses an off-center pinned surface ray at maximum zoom', () => {
    const pinned = getPinnedSurfaceLocal({
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    });

    expect(pinned.distanceTo(FRONT_VECTOR)).toBeGreaterThan(0.05);
    expect(pinned.length()).toBeCloseTo(1, 6);
    expect(
      getOverviewPinnedSurfaceDebug({
        distance: MIN_DISTANCE,
        fov: DEFAULT_FOV,
      }).rayFallbackUsed,
    ).toBe(false);
  });

  it('falls back toward center when an extreme bottom anchor ray would miss', () => {
    const view = {
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    };
    const pinned = getPinnedSurfaceLocal(view, -8);
    const debug = getOverviewPinnedSurfaceDebug(view, -8);

    expect(debug.rayFallbackUsed).toBe(true);
    expect(debug.anchorNdcY).toBeGreaterThan(-8);
    expect(debug.anchorNdcY).toBeLessThan(0);
    expect(pinned.length()).toBeCloseTo(1, 6);
    expect(pinned.distanceTo(FRONT_VECTOR)).toBeGreaterThan(0.05);
  });

  it('round-trips anchor and heading through the overview solve', () => {
    const anchored = surfaceAnchoredGeoView({
      lat: 24,
      lon: 38,
      headingDeg: 33,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const derivedAnchor = deriveSurfaceAnchor(anchored);
    const derivedHeading = deriveGeoOverviewHeading(anchored, {
      lat: derivedAnchor.anchorLat,
      lon: derivedAnchor.anchorLon,
    });

    expect(derivedAnchor.anchorLat).toBeCloseTo(24, 1);
    expect(derivedAnchor.anchorLon).toBeCloseTo(38, 1);
    expect(derivedHeading).toBeCloseTo(33, 1);
  });

  it('preserves the captured anchor through constrained zoom changes', () => {
    const anchor = { lat: 24, lon: 38 };
    const headingDeg = 18;
    const closeView = surfaceAnchoredGeoView({
      lat: anchor.lat,
      lon: anchor.lon,
      headingDeg,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const midView = applyHumanViewConstraint(
      {
        ...closeView,
        distance: (DEFAULT_DISTANCE + MIN_DISTANCE) / 2,
      },
      {
        sourceDistance: closeView.distance,
        anchor,
        headingDeg,
      },
    );
    const returned = applyHumanViewConstraint(
      {
        ...midView,
        distance: MIN_DISTANCE,
      },
      {
        sourceDistance: midView.distance,
        anchor,
        headingDeg,
      },
    );
    const derivedAnchor = deriveSurfaceAnchor(returned);

    expect(derivedAnchor.anchorLat).toBeCloseTo(anchor.lat, 1);
    expect(derivedAnchor.anchorLon).toBeCloseTo(anchor.lon, 1);
  });

  it('changes heading without moving the pinned anchor', () => {
    const anchor = { lat: 20, lon: 10 };
    const headingDeg = 12;
    const nextHeading = stepGeoOverviewHeading(headingDeg, 35);
    const spun = surfaceAnchoredGeoView({
      lat: anchor.lat,
      lon: anchor.lon,
      headingDeg: nextHeading,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const derivedAnchor = deriveSurfaceAnchor(spun);
    const derivedHeading = deriveGeoOverviewHeading(spun, anchor);

    expect(derivedAnchor.anchorLat).toBeCloseTo(anchor.lat, 1);
    expect(derivedAnchor.anchorLon).toBeCloseTo(anchor.lon, 1);
    expect(derivedHeading).toBeCloseTo(nextHeading, 1);
  });

  it('moves the anchor without changing heading in surface-pan mode', () => {
    const anchor = { lat: 20, lon: 10 };
    const headingDeg = 27;
    const nextAnchor = stepGeoOverviewAnchor(anchor, 14, -6);
    const panned = surfaceAnchoredGeoView({
      lat: nextAnchor.lat,
      lon: nextAnchor.lon,
      headingDeg,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const derivedAnchor = deriveSurfaceAnchor(panned);
    const derivedHeading = deriveGeoOverviewHeading(panned, nextAnchor);

    expect(derivedAnchor.anchorLat).toBeCloseTo(nextAnchor.lat, 1);
    expect(derivedAnchor.anchorLon).toBeCloseTo(nextAnchor.lon, 1);
    expect(derivedHeading).toBeCloseTo(headingDeg, 1);
  });

  it('keeps apparent globe size monotonic while zooming in', () => {
    const samples = 24;
    let previousScale = -Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const view = viewFromLatLon(0, 0, distance);
      const effectiveFov = getGeoEffectiveFov(view);
      const apparentScale = getGeoApparentScale({
        distance,
        effectiveFov,
      });

      expect(apparentScale).toBeGreaterThanOrEqual(previousScale - 1e-6);
      previousScale = apparentScale;
    }
  });

  it('solves apparent scale directly from the target curve at max zoom', () => {
    const view = viewFromLatLon(0, 0, MIN_DISTANCE);
    const effectiveFov = getGeoEffectiveFov(view);
    const apparentScale = getGeoApparentScale({
      distance: MIN_DISTANCE,
      effectiveFov,
    });

    expect(getGeoTargetApparentScale(view)).toBeCloseTo(2.85, 6);
    expect(apparentScale).toBeCloseTo(getGeoTargetApparentScale(view), 6);
  });
});
