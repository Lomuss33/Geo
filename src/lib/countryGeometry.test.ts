import { describe, expect, it } from 'vitest';
import {
  findCountryByLatLon,
  getAllCountries,
  getCountryById,
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

  it('can look up a loaded country by id', () => {
    const brazil = getAllCountries().find((country) => country.name === 'Brazil');

    expect(brazil).toBeTruthy();
    expect(getCountryById(brazil!.id)?.name).toBe('Brazil');
    expect(getCountryById('missing-country-id')).toBeNull();
  });
});
