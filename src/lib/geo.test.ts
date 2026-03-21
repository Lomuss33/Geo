import { describe, expect, it } from 'vitest';
import { latLonToVector3, vector3ToLatLon } from './geo';

describe('geo conversions', () => {
  it('round-trips lat/lon pairs within tolerance', () => {
    const vector = latLonToVector3(43.6, -79.4);
    const result = vector3ToLatLon(vector);

    expect(result.lat).toBeCloseTo(43.6, 4);
    expect(result.lon).toBeCloseTo(-79.4, 4);
  });
});
