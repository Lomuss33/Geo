import { describe, expect, it } from 'vitest';
import { viewFromLatLon } from './constants';
import type { CountryPolygon } from './countryGeometry';
import { projectCountryOutlineToViewport } from './countryProjection';

const createSquareCountry = (
  name: string,
  lat: number,
  lon: number,
  halfSizeDeg: number,
): CountryPolygon => {
  const ring: Array<[number, number]> = [
    [lon - halfSizeDeg, lat - halfSizeDeg],
    [lon + halfSizeDeg, lat - halfSizeDeg],
    [lon + halfSizeDeg, lat + halfSizeDeg],
    [lon - halfSizeDeg, lat + halfSizeDeg],
    [lon - halfSizeDeg, lat - halfSizeDeg],
  ];

  return {
    id: name,
    name,
    centroid: [lon, lat],
    rings: [ring],
    polygons: [[ring]],
  };
};

const getBoundsWidth = (
  bounds: ReturnType<typeof projectCountryOutlineToViewport>['bounds'],
) => (bounds ? bounds.right - bounds.left : 0);

const getBoundsCenterX = (
  bounds: ReturnType<typeof projectCountryOutlineToViewport>['bounds'],
) => (bounds ? (bounds.left + bounds.right) / 2 : 0);

describe('countryProjection', () => {
  it('projects a centered visible country into a non-empty path', () => {
    const projection = projectCountryOutlineToViewport(
      createSquareCountry('Center', 0, 0, 7),
      {
        view: viewFromLatLon(0, 0, 2.2),
        viewportWidth: 1200,
        viewportHeight: 800,
      },
    );

    expect(projection.hasVisibleGeometry).toBe(true);
    expect(projection.path).toContain('M');
    expect(projection.bounds).not.toBeNull();
  });

  it('shrinks the projected footprint as the camera moves farther away', () => {
    const country = createSquareCountry('Center', 0, 0, 7);
    const closeProjection = projectCountryOutlineToViewport(country, {
      view: viewFromLatLon(0, 0, 1.4),
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    const farProjection = projectCountryOutlineToViewport(country, {
      view: viewFromLatLon(0, 0, 3.15),
      viewportWidth: 1200,
      viewportHeight: 800,
    });

    expect(getBoundsWidth(closeProjection.bounds)).toBeGreaterThan(
      getBoundsWidth(farProjection.bounds),
    );
  });

  it('moves projected bounds on screen when the globe rotation changes', () => {
    const country = createSquareCountry('Offset', 0, 25, 6);
    const offsetProjection = projectCountryOutlineToViewport(country, {
      view: viewFromLatLon(0, 0, 2.6),
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    const centeredProjection = projectCountryOutlineToViewport(country, {
      view: viewFromLatLon(0, 25, 2.6),
      viewportWidth: 1200,
      viewportHeight: 800,
    });
    const viewportCenterX = 600;

    expect(getBoundsCenterX(offsetProjection.bounds)).not.toBeCloseTo(
      getBoundsCenterX(centeredProjection.bounds),
      1,
    );
    expect(
      Math.abs(getBoundsCenterX(centeredProjection.bounds) - viewportCenterX),
    ).toBeLessThan(
      Math.abs(getBoundsCenterX(offsetProjection.bounds) - viewportCenterX),
    );
  });

  it('reports no visible geometry for a country on the back side of the globe', () => {
    const projection = projectCountryOutlineToViewport(
      createSquareCountry('Backside', 0, 180, 8),
      {
        view: viewFromLatLon(0, 0, 2.2),
        viewportWidth: 1200,
        viewportHeight: 800,
      },
    );

    expect(projection.hasVisibleGeometry).toBe(false);
    expect(projection.path).toBe('');
    expect(projection.bounds).toBeNull();
  });

  it('clips near-horizon geometry instead of closing a path through the back hemisphere', () => {
    const projection = projectCountryOutlineToViewport(
      createSquareCountry('Horizon', 0, 70, 16),
      {
        view: viewFromLatLon(0, 0, 2.2),
        viewportWidth: 1200,
        viewportHeight: 800,
      },
    );

    expect(projection.hasVisibleGeometry).toBe(true);
    expect(projection.path).not.toContain('Z');
    expect((projection.path.match(/M/g) ?? []).length).toBeGreaterThan(1);
  });
});
