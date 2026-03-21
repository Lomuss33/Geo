import { describe, expect, it } from 'vitest';
import {
  buildCountryFrontProjection,
  findCountryByLatLon,
  getAllCountries,
} from './countryGeometry';

describe('countryGeometry', () => {
  it('loads named countries from the atlas dataset', () => {
    const countries = getAllCountries();

    expect(countries.length).toBeGreaterThan(150);
    expect(countries.some((country) => country.name === 'Brazil')).toBe(true);
    expect(countries.some((country) => country.name === 'India')).toBe(true);
  });

  it('resolves a country from a known lon/lat sample', () => {
    const country = findCountryByLatLon(-54, -10);

    expect(country?.name).toBe('Brazil');
  });

  it('builds deterministic front projections that scale with zoom', () => {
    const brazil = getAllCountries().find((country) => country.name === 'Brazil');

    expect(brazil).toBeTruthy();

    const coarse = buildCountryFrontProjection(brazil!, {
      widthPx: 400,
      heightPx: 400,
      zoomFactor: 90,
    });
    const close = buildCountryFrontProjection(brazil!, {
      widthPx: 400,
      heightPx: 400,
      zoomFactor: 180,
    });

    expect(coarse).toContain('M');
    expect(close).not.toBe(coarse);
  });
});
