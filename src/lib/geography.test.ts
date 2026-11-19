import { beforeEach, describe, expect, it } from 'vitest';
import index from '../../public/assets/borders/country-index.json';
import {
  BALKANS_COUNTRIES,
  EUROPE_COUNTRIES,
  GEOGRAPHIC_SCOPES,
  buildGeographyCatalog,
  countryDestination,
  countryInScope,
  scopeDestination,
  searchCountries,
} from './geography';
import { deriveSurfaceAnchor } from './camera';
import { useGeographyStore } from '../state/geographyStore';

const catalog = buildGeographyCatalog(index);

describe('geographic collections and source identities', () => {
  it('retains every bundled record and resolves every configured regional member', () => {
    expect(new Set(catalog.map((country) => country.iso3)).size).toBe(
      catalog.length,
    );
    for (const id of [
      ...index.map((country) => country.iso3),
      ...EUROPE_COUNTRIES,
    ]) {
      expect(
        catalog.find((country) => country.iso3 === id),
        id,
      ).toBeDefined();
    }
    expect(searchCountries(catalog, 'balkans', '')).toHaveLength(12);
    expect(BALKANS_COUNTRIES.every((id) => countryInScope(id, 'europe'))).toBe(
      true,
    );
    expect(countryInScope('USA', 'europe')).toBe(false);
  });

  it('corrects source display names by identity instead of matching a regional name', () => {
    const italy = catalog.find((country) => country.iso3 === 'ITA')!;
    expect(italy.name).toBe('Italy');
    expect(italy.sourceIds).toEqual({ borders: 'ITA', atlas: '380' });
    expect(italy.geometry?.name).toBe('Italy');
    expect(searchCountries(catalog, 'world', 'Bangladesh')[0]?.name).toBe(
      'Bangladesh',
    );
  });

  it('matches aliases, country codes, accents, and multiple search terms within scope', () => {
    for (const query of ['Turkey', 'Türkiye', 'TUR', 'turkiye']) {
      expect(
        searchCountries(catalog, 'balkans', query).map(
          (country) => country.iso3,
        ),
      ).toEqual(['TUR']);
    }
    expect(searchCountries(catalog, 'balkans', 'Hrvatska')[0]?.iso3).toBe(
      'HRV',
    );
    expect(
      searchCountries(catalog, 'balkans', 'bosnia herzegovina')[0]?.iso3,
    ).toBe('BIH');
    expect(searchCountries(catalog, 'balkans', 'Germany')).toEqual([]);
  });

  it('keeps Kosovo searchable with explicit missing atlas coverage', () => {
    for (const query of ['Kosovo', 'XKX', 'KOS']) {
      const country = searchCountries(catalog, 'balkans', query)[0]!;
      expect(country.iso3).toBe('XKX');
      expect(country.sourceIds).toEqual({ borders: 'XKX', atlas: null });
      expect(countryDestination(country)).toBeNull();
    }
  });

  it('keeps configured regional identities available when the boundary catalog fails', () => {
    const fallback = buildGeographyCatalog([]);
    const croatia = searchCountries(fallback, 'balkans', 'Croatia')[0]!;
    expect(croatia.sourceIds.borders).toBeNull();
    expect(croatia.geometry).not.toBeNull();
  });

  it('builds consistent mode-specific country frames without changing source geometry', () => {
    const croatia = catalog.find((country) => country.iso3 === 'HRV')!;
    const frame = countryDestination(croatia)!;
    const pose = deriveSurfaceAnchor(frame.geo);
    expect(pose.anchorLon).toBeCloseTo(frame.map.center[0], 1);
    expect(pose.anchorLat).toBeCloseTo(frame.map.center[1], 1);
    expect(frame.countryIso).toBe('HRV');
    expect(frame.map.zoom).toBeGreaterThan(0);
    expect(frame.geo.distance).toBeGreaterThan(1);
    for (const scope of Object.keys(GEOGRAPHIC_SCOPES) as Array<
      keyof typeof GEOGRAPHIC_SCOPES
    >) {
      const frame = scopeDestination(scope);
      expect(frame.countryIso).toBeNull();
      expect(frame.geo.rotation.every(Number.isFinite)).toBe(true);
    }
  });
});

describe('geography selection', () => {
  beforeEach(() => {
    useGeographyStore.setState({
      scope: 'world',
      selectedIso: null,
      notice: '',
    });
  });

  it('preserves an in-scope selection and explains clearing an out-of-scope one', () => {
    const state = useGeographyStore.getState();
    state.selectCountry('HRV');
    state.setScope('balkans');
    expect(useGeographyStore.getState().selectedIso).toBe('HRV');
    state.setScope('world');
    state.selectCountry('USA');
    state.setScope('europe');
    expect(useGeographyStore.getState().selectedIso).toBeNull();
    expect(useGeographyStore.getState().notice).toContain('outside this scope');
  });
});
