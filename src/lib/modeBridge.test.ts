import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, MAX_DISTANCE, MIN_DISTANCE } from './constants';
import {
  distanceToHeadwayZoom,
  geoFromHeadway,
  headwayFromGeo,
  headwayViewsEqual,
  headwayZoomToDistance,
} from './modeBridge';

describe('mode bridge', () => {
  it('maps geo distance anchors onto explicit Headway zoom anchors', () => {
    expect(distanceToHeadwayZoom(MAX_DISTANCE)).toBeCloseTo(0.8, 3);
    expect(distanceToHeadwayZoom(3.15)).toBeCloseTo(1.8, 3);
    expect(distanceToHeadwayZoom(MIN_DISTANCE)).toBeCloseTo(3.2, 3);
  });

  it('inverts Headway zoom anchors back to geo distance anchors', () => {
    expect(headwayZoomToDistance(0.8)).toBeCloseTo(MAX_DISTANCE, 3);
    expect(headwayZoomToDistance(1.8)).toBeCloseTo(3.15, 3);
    expect(headwayZoomToDistance(3.2)).toBeCloseTo(MIN_DISTANCE, 3);
  });

  it('translates a geo view into a centered Headway globe state', () => {
    const headway = headwayFromGeo(DEFAULT_VIEW);

    expect(headway.center[0]).toBeCloseTo(-28, 1);
    expect(headway.center[1]).toBeCloseTo(19.5, 1);
    expect(headway.zoom).toBeCloseTo(1.8, 2);
    expect(headway.bearing).toBe(0);
    expect(headway.pitch).toBe(0);
  });

  it('translates a Headway view back into a geo view without roll', () => {
    const geo = geoFromHeadway({
      center: [13, 52],
      zoom: 2.4,
      bearing: 22,
      pitch: 15,
    });
    const roundTrip = headwayFromGeo(geo);

    expect(roundTrip.center[0]).toBeCloseTo(13, 1);
    expect(roundTrip.center[1]).toBeCloseTo(52, 1);
    expect(roundTrip.bearing).toBe(0);
    expect(roundTrip.pitch).toBe(0);
  });

  it('compares Headway views with a small tolerance', () => {
    expect(
      headwayViewsEqual(
        { center: [13, 52], zoom: 2.4, bearing: 22, pitch: 15 },
        { center: [13.0004, 51.9998], zoom: 2.4003, bearing: 22.0003, pitch: 15 },
      ),
    ).toBe(true);
  });
});
