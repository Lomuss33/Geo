import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEW,
  DEFAULT_FOV,
  DEFAULT_DISTANCE,
  FRONT_VECTOR,
  MAX_DISTANCE,
  MIN_DISTANCE,
  viewFromLatLon,
} from './constants';
import {
  getGeoActualVisibleEarthTopScreenY,
  applyHumanViewConstraint,
  deriveGeoCenteredAnchor,
  getGeoAxisMarkerLocal,
  getGeoAxisSurfaceLocal,
  deriveGeoOverviewHeading,
  deriveSurfaceAnchor,
  getGeoActualSurfaceAngleDeg,
  getGeoActualAxisScreenY,
  getGeoAnchorScreenY,
  getGeoApparentScale,
  getGeoCameraTransitionT,
  getGeoCameraPose,
  getGeoControlMode,
  getGeoDesiredAxisScreenY,
  getGeoDesiredVisibleEarthTopScreenY,
  getGeoEffectiveFov,
  getGeoLinearZoomT,
  getGeoLookPitchDeg,
  getGeoViewportCoverage,
  getGeoTargetApparentScale,
  getResponsiveStartupGeoView,
  getOverviewPinnedSurfaceDebug,
  getPinnedSurfaceLocal,
  stepGeoOverviewAnchor,
  stepGeoOverviewHeading,
  surfaceAnchoredGeoView,
} from './camera';
import { getRollDegrees, getViewCenterLocal, latLonToVector3 } from './geo';
import { quaternionFromArray } from './math';

const projectLocalPointScreenY = (
  view: ReturnType<typeof viewFromLatLon>,
  localPoint: Vector3,
) => {
  const cameraPose = getGeoCameraPose(view);
  const camera = new PerspectiveCamera(cameraPose.effectiveFov, 1, 0.01, 1000);
  const worldPoint = localPoint
    .clone()
    .applyQuaternion(quaternionFromArray(view.rotation));

  camera.position.set(...cameraPose.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(new Vector3(...cameraPose.target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  return (1 - worldPoint.project(camera).y) / 2;
};

const buildConstrainedZoomPath = (samples: number) => {
  let previous = viewFromLatLon(18, 25, DEFAULT_DISTANCE);
  let anchor: { lat: number; lon: number } | null = null;
  let headingDeg = 0;
  const views = [previous];

  for (let index = 1; index <= samples; index += 1) {
    const t = index / samples;
    const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
    const candidate = {
      ...previous,
      distance,
    };
    const linearZoomT = getGeoLinearZoomT(distance);

    if (!anchor && linearZoomT > 1e-4) {
      anchor = deriveGeoCenteredAnchor(candidate);
      headingDeg = deriveGeoOverviewHeading(candidate, anchor);
    } else if (anchor && linearZoomT <= 1e-4) {
      anchor = null;
      headingDeg = 0;
    }

    previous = applyHumanViewConstraint(candidate, {
      sourceDistance: views.at(-1)?.distance ?? candidate.distance,
      anchor,
      headingDeg,
    });
    views.push(previous);
  }

  return views;
};

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

  it('starts with the Sinai Peninsula near the center of the default view', () => {
    const centeredPoint = getViewCenterLocal(
      quaternionFromArray(DEFAULT_VIEW.rotation),
    );

    expect(centeredPoint.distanceTo(latLonToVector3(29.7, 34.2))).toBeLessThan(
      1e-6,
    );
  });

  it('starts with north-up orientation for the default view', () => {
    expect(getRollDegrees(quaternionFromArray(DEFAULT_VIEW.rotation))).toBeCloseTo(
      0,
      4,
    );
  });

  it('uses the retuned overview rig at minimum distance', () => {
    const pose = getGeoCameraPose(viewFromLatLon(0, 0, MIN_DISTANCE));
    const surfaceAngle = getGeoActualSurfaceAngleDeg({
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    });

    expect(pose.position[0]).toBeCloseTo(0, 6);
    expect(pose.position[1]).toBeCloseTo(1.1, 3);
    expect(pose.position[2]).toBeCloseTo(MIN_DISTANCE + 0.07, 3);
    expect(pose.target[0]).toBeCloseTo(0, 6);
    expect(pose.target[1]).toBeGreaterThan(0.96);
    expect(pose.target[1]).toBeLessThan(0.99);
    expect(pose.target[1]).toBeLessThan(pose.position[1]);
    expect(pose.target[2]).toBeCloseTo(0, 6);
    expect(getGeoLookPitchDeg(DEFAULT_DISTANCE)).toBeCloseTo(0, 6);
    expect(getGeoLookPitchDeg(MIN_DISTANCE)).toBeCloseTo(19.75, 6);
    expect(pose.effectiveFov).toBeGreaterThan(DEFAULT_FOV);
    expect(surfaceAngle).toBeGreaterThan(115);
    expect(surfaceAngle).toBeLessThan(120);
  });

  it('keeps the visible earth top near one-third down when fully zoomed in', () => {
    expect(
      getGeoActualVisibleEarthTopScreenY({
        distance: DEFAULT_DISTANCE,
        fov: DEFAULT_FOV,
      }),
    ).toBeCloseTo(0, 6);
    expect(
      getGeoActualVisibleEarthTopScreenY({
        distance: MIN_DISTANCE,
        fov: DEFAULT_FOV,
      }),
    ).toBeGreaterThan(0.3);
    expect(
      getGeoActualVisibleEarthTopScreenY({
        distance: MIN_DISTANCE,
        fov: DEFAULT_FOV,
      }),
    ).toBeLessThan(0.36);
  });

  it('uses the view center as the axis point in orbit framing', () => {
    const view = viewFromLatLon(19.5, -28, DEFAULT_DISTANCE);
    const axisPoint = getGeoAxisSurfaceLocal(view);
    const centeredPoint = getViewCenterLocal(
      quaternionFromArray(view.rotation),
    );

    expect(axisPoint.distanceTo(centeredPoint)).toBeLessThan(1e-6);
  });

  it('uses the anchored surface point as the axis point in close framing', () => {
    const view = surfaceAnchoredGeoView({
      lat: 24,
      lon: 38,
      headingDeg: 33,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const axisPoint = getGeoAxisSurfaceLocal(view);

    expect(axisPoint.distanceTo(latLonToVector3(24, 38))).toBeLessThan(1e-6);
  });

  it('does not reuse the screen-center hit as the close-zoom axis point', () => {
    const view = surfaceAnchoredGeoView({
      lat: 24,
      lon: 38,
      headingDeg: 33,
      distance: MIN_DISTANCE,
      baseFov: DEFAULT_FOV,
    });
    const axisPoint = getGeoAxisSurfaceLocal(view);
    const screenCenterPoint = getPinnedSurfaceLocal({
      distance: view.distance,
      fov: view.fov,
    });

    expect(axisPoint.distanceTo(screenCenterPoint)).toBeGreaterThan(0.05);
  });

  it('keeps dedicated axis and visible-earth framing helpers available for overview tuning', () => {
    expect(getGeoLinearZoomT(DEFAULT_DISTANCE)).toBeCloseTo(0, 6);
    expect(getGeoLinearZoomT(MIN_DISTANCE)).toBeCloseTo(1, 6);
    expect(getGeoCameraTransitionT(DEFAULT_DISTANCE)).toBeCloseTo(0, 6);
    expect(getGeoCameraTransitionT(MIN_DISTANCE)).toBeCloseTo(1, 6);
    expect(getGeoDesiredAxisScreenY(DEFAULT_DISTANCE)).toBeCloseTo(0.5, 6);
    expect(getGeoDesiredAxisScreenY(MIN_DISTANCE)).toBeCloseTo(4 / 5, 6);
    expect(getGeoDesiredVisibleEarthTopScreenY(DEFAULT_DISTANCE)).toBeCloseTo(
      0,
      6,
    );
    expect(getGeoDesiredVisibleEarthTopScreenY(MIN_DISTANCE)).toBeCloseTo(
      0.33,
      6,
    );
    expect(
      getGeoActualAxisScreenY({
        distance: DEFAULT_DISTANCE,
        fov: DEFAULT_FOV,
      }),
    ).toBeCloseTo(0.5, 6);
    expect(
      getGeoActualVisibleEarthTopScreenY({
        distance: DEFAULT_DISTANCE,
        fov: DEFAULT_FOV,
      }),
    ).toBeCloseTo(0, 6);
    expect(
      getGeoEffectiveFov(viewFromLatLon(0, 0, DEFAULT_DISTANCE)),
    ).toBeCloseTo(DEFAULT_FOV, 6);
    expect(getGeoEffectiveFov(viewFromLatLon(0, 0, MIN_DISTANCE))).toBeGreaterThan(
      DEFAULT_FOV,
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

  it('keeps the view trending more tangent while zooming in', () => {
    const samples = 32;
    let previousAngle = Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const angle = getGeoActualSurfaceAngleDeg({
        distance,
        fov: DEFAULT_FOV,
      });

      expect(angle).toBeLessThanOrEqual(previousAngle + 0.5);
      previousAngle = angle;
    }
  });

  it('moves the visible earth top downward smoothly across the full zoom range', () => {
    const samples = 32;
    let previousScreenY = -Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const screenY = getGeoActualVisibleEarthTopScreenY({
        distance,
        fov: DEFAULT_FOV,
      });

      expect(screenY).toBeGreaterThanOrEqual(previousScreenY - 3e-3);
      previousScreenY = screenY;
    }
  });

  it('avoids a late drop spike in the final quarter of zoom', () => {
    const samples = 8;
    let previousScreenY: number | null = null;

    for (let index = 0; index <= samples; index += 1) {
      const t = 0.75 + index / samples / 4;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const screenY = getGeoActualVisibleEarthTopScreenY({
        distance,
        fov: DEFAULT_FOV,
      });

      if (previousScreenY != null) {
        expect(screenY - previousScreenY).toBeLessThanOrEqual(0.035);
      }

      previousScreenY = screenY;
    }
  });

  it('keeps the earth getting larger while zooming in', () => {
    const samples = 32;
    let previousScale = -Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const effectiveFov = getGeoEffectiveFov({
        distance,
        fov: DEFAULT_FOV,
      });
      const scale = getGeoApparentScale({
        distance,
        effectiveFov,
      });

      expect(scale).toBeGreaterThanOrEqual(previousScale - 1e-6);
      previousScale = scale;
    }
  });

  it('keeps the axis metrics separate from visible earth framing', () => {
    const axisScreenY = getGeoAnchorScreenY(MIN_DISTANCE);
    const visibleEarthTopScreenY = getGeoActualVisibleEarthTopScreenY({
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    });

    expect(Math.abs(axisScreenY - visibleEarthTopScreenY)).toBeGreaterThan(0.2);
  });

  it('projects the axis marker to the same screen Y as the axis helper', () => {
    const view = buildConstrainedZoomPath(24).at(-1)!;
    const markerScreenY = projectLocalPointScreenY(
      view,
      getGeoAxisMarkerLocal(view),
    );
    const axisScreenY = getGeoActualAxisScreenY({
      distance: view.distance,
      fov: view.fov,
    });

    expect(markerScreenY).toBeCloseTo(axisScreenY, 6);
  });

  it('moves the projected axis marker downward monotonically while zooming in', () => {
    let previousScreenY = -Infinity;

    for (const view of buildConstrainedZoomPath(24)) {
      const markerScreenY = projectLocalPointScreenY(
        view,
        getGeoAxisMarkerLocal(view),
      );

      expect(markerScreenY).toBeGreaterThanOrEqual(previousScreenY - 1e-3);
      previousScreenY = markerScreenY;
    }
  });

  it('keeps the axis marker near one-fifth from bottom at maximum zoom', () => {
    const view = buildConstrainedZoomPath(24).at(-1)!;
    const markerScreenY = projectLocalPointScreenY(
      view,
      getGeoAxisMarkerLocal(view),
    );

    expect(markerScreenY).toBeGreaterThan(0.79);
    expect(markerScreenY).toBeLessThan(0.81);
  });

  it('does not drift upward near maximum zoom anymore', () => {
    const views = buildConstrainedZoomPath(32);
    const startIndex = Math.floor(views.length * 0.75);
    let previousScreenY: number | null = null;

    for (let index = startIndex; index < views.length; index += 1) {
      const view = views[index]!;
      const markerScreenY = projectLocalPointScreenY(
        view,
        getGeoAxisMarkerLocal(view),
      );

      if (previousScreenY != null) {
        expect(markerScreenY).toBeGreaterThanOrEqual(previousScreenY - 1e-3);
      }

      previousScreenY = markerScreenY;
    }
  });

  it('keeps the lifted marker aligned with the axis helper while not reusing the raw surface point', () => {
    const view = buildConstrainedZoomPath(24).at(-1)!;
    const axisLocal = getGeoAxisSurfaceLocal(view);
    const markerLocal = getGeoAxisMarkerLocal(view);
    const markerScreenY = projectLocalPointScreenY(view, markerLocal);
    const axisScreenY = getGeoActualAxisScreenY({
      distance: view.distance,
      fov: view.fov,
    });

    expect(markerLocal.distanceTo(axisLocal)).toBeGreaterThan(0.01);
    expect(markerScreenY).toBeCloseTo(axisScreenY, 6);
  });

  it('does not significantly reverse back toward orbital framing in the last quarter of zoom', () => {
    const samples = 8;
    let previousAngle = Infinity;

    for (let index = 0; index <= samples; index += 1) {
      const t = 0.75 + index / samples / 4;
      const distance = DEFAULT_DISTANCE + (MIN_DISTANCE - DEFAULT_DISTANCE) * t;
      const angle = getGeoActualSurfaceAngleDeg({
        distance,
        fov: DEFAULT_FOV,
      });

      expect(angle).toBeLessThanOrEqual(previousAngle + 0.5);
      previousAngle = angle;
    }
  });

  it('keeps constrained zoom steps continuous without a large late-stage rotation jump', () => {
    const samples = 96;
    let previous = viewFromLatLon(18, 25, DEFAULT_DISTANCE);
    let largestStepDeg = 0;

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
      const deltaDeg =
        (quaternionFromArray(previous.rotation).angleTo(
          quaternionFromArray(next.rotation),
        ) *
          180) /
        Math.PI;

      largestStepDeg = Math.max(largestStepDeg, deltaDeg);
      previous = next;
    }

    expect(largestStepDeg).toBeLessThan(12);
  });

  it('pins an off-center surface point at maximum zoom without collapsing back to the front vector', () => {
    const pinned = getPinnedSurfaceLocal({
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    });
    const debug = getOverviewPinnedSurfaceDebug({
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    });

    expect(pinned.distanceTo(FRONT_VECTOR)).toBeGreaterThan(0.05);
    expect(pinned.length()).toBeCloseTo(1, 6);
    expect(debug.anchorNdcY).toBeLessThan(-0.3);
    expect(debug.anchorNdcY).toBeGreaterThan(-0.7);
  });

  it('supports explicit off-screen anchor rays when they still intersect the globe', () => {
    const view = {
      distance: MIN_DISTANCE,
      fov: DEFAULT_FOV,
    };
    const pinned = getPinnedSurfaceLocal(view, -8);
    const debug = getOverviewPinnedSurfaceDebug(view, -8);

    expect(debug.rayFallbackUsed).toBe(false);
    expect(debug.anchorNdcY).toBe(-8);
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

  it('can exceed the target scale at max zoom once the effective FOV hits its cap', () => {
    const view = viewFromLatLon(0, 0, MIN_DISTANCE);
    const effectiveFov = getGeoEffectiveFov(view);
    const apparentScale = getGeoApparentScale({
      distance: MIN_DISTANCE,
      effectiveFov,
    });

    expect(getGeoTargetApparentScale(view)).toBeCloseTo(2.85, 6);
    expect(apparentScale).toBeGreaterThan(getGeoTargetApparentScale(view));
    expect(apparentScale).toBeCloseTo(4.517797, 5);
  });
});
