import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import index from '../../public/assets/borders/country-index.json';
import fixtures from '../../tests/fixtures/geographic-cases.json';
import { buildGeographyCatalog, countryDestination } from './geography';
import { projectCountryOutlineToViewport } from './countryProjection';
import { getCountryById } from './countryGeometry';

const catalog = buildGeographyCatalog(index);

describe('source-tied geography regression cases', () => {
  it('pins the observed inputs without claiming fine-scale precision or an observation year', () => {
    for (const source of fixtures.sourceEvidence.sources) {
      const bytes = readFileSync(resolve(source.path));
      expect(
        createHash('sha256').update(bytes).digest('hex'),
        source.path,
      ).toBe(source.sha256);
    }
    expect(fixtures.sourceEvidence.geometryObservationYear).toBeNull();
    expect(fixtures.sourceEvidence.upstreamReleaseReview).toBe(
      'pending GEO-195',
    );
  });

  it.each(fixtures.cases)(
    '$id retains actual coverage, country frames and finite coarse outlines',
    (fixture) => {
      for (const iso of fixture.countryIso3) {
        const country = catalog.find((record) => record.iso3 === iso)!;
        expect(country, iso).toBeDefined();
        expect(
          index.find((record) => record.iso3 === iso),
          iso,
        ).toMatchObject({ hasAdm1: true, hasAdm2: true });
        const destination = countryDestination(country)!;
        expect(destination, iso).not.toBeNull();
        expect(destination.geo.rotation.every(Number.isFinite)).toBe(true);
        expect(destination.map.center.every(Number.isFinite)).toBe(true);
        for (const viewport of [
          { width: 320, height: 568 },
          { width: 1440, height: 900 },
        ]) {
          const outline = projectCountryOutlineToViewport(country.geometry!, {
            view: destination.geo,
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
          });
          expect(outline.hasVisibleGeometry, iso).toBe(true);
          expect(outline.path).not.toMatch(/NaN|Infinity/);
          expect(outline.bounds).not.toBeNull();
          expect(Object.values(outline.bounds!).every(Number.isFinite)).toBe(
            true,
          );
        }
      }
      expect(fixture.fineGeometryReview).toBe('pending GEO-195/GEO-196');
      expect(fixture.limits.length).toBeGreaterThan(0);
    },
  );

  it('includes real multipart geometry on both sides of the antimeridian', () => {
    const fiji = getCountryById('242')!;
    expect(fiji.polygons.length).toBeGreaterThan(1);
    const longitudes = fiji.rings.flat().map((point) => point[0]);
    expect(longitudes.some((lon) => lon > 170)).toBe(true);
    expect(longitudes.some((lon) => lon < -170)).toBe(true);
  });
});
