import { describe, expect, it } from 'vitest';
import {
  BORDERS_COLORS,
  buildBordersAdm0FillExpression,
  buildBordersAdm0LineExpression,
  buildBordersAdm2Filter,
  buildBordersPinsData,
  getBordersAssetUrl,
  getBordersCountryName,
} from './bordersData';

describe('bordersData helpers', () => {
  it('builds relative and absolute asset URLs without rewriting tile templates', () => {
    window.history.replaceState(
      {},
      '',
      `${window.location.origin}/Geo/?mode=borders`,
    );

    expect(getBordersAssetUrl('style.json')).toBe(
      `${import.meta.env.BASE_URL}assets/borders/style.json`,
    );
    expect(
      getBordersAssetUrl('style.json', { absolute: true }),
    ).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL}assets/borders/style.json`,
    );
    expect(
      getBordersAssetUrl('tiles/boundaries/{z}/{x}/{y}.pbf', {
        absolute: true,
      }),
    ).toBe(
      `${window.location.origin}${import.meta.env.BASE_URL}assets/borders/tiles/boundaries/{z}/{x}/{y}.pbf`,
    );
  });

  it('builds a metric choropleth expression for adm0 fills', () => {
    const expression = buildBordersAdm0FillExpression('gdp', {
      indicator: 'NY.GDP.MKTP.CD',
      records: [
        { iso3: 'USA', name: 'United States', value: 28_000_000_000_000 },
        { iso3: 'DEU', name: 'Germany', value: 4_500_000_000_000 },
      ],
    });

    expect(expression).toMatchObject([
      'match',
      ['get', 'iso3'],
      'USA',
      expect.stringMatching(/^#/),
      'DEU',
      expect.stringMatching(/^#/),
      BORDERS_COLORS.metricUnavailable,
    ]);
  });

  it('builds highlight expressions and filters from focus state', () => {
    expect(buildBordersAdm0LineExpression(null)).toBe(BORDERS_COLORS.countryLine);
    expect(buildBordersAdm0LineExpression('usa')).toEqual([
      'match',
      ['get', 'iso3'],
      'USA',
      BORDERS_COLORS.countryLineFocused,
      BORDERS_COLORS.countryLine,
    ]);
    expect(buildBordersAdm2Filter(null)).toEqual([
      '==',
      ['get', 'iso3'],
      '__NONE__',
    ]);
    expect(buildBordersAdm2Filter('deu')).toEqual([
      '==',
      ['get', 'iso3'],
      'DEU',
    ]);
  });

  it('resolves country names and suppresses pins for hierarchy mode', () => {
    expect(
      getBordersCountryName(
        [
          {
            iso3: 'USA',
            name: 'United States',
            region: 'North America',
            hasAdm1: true,
            hasAdm2: true,
          },
        ],
        'usa',
      ),
    ).toBe('United States');

    expect(
      buildBordersPinsData({
        profileId: 'hierarchy',
        showPinpoints: true,
        records: [
          {
            id: 'pin-1',
            name: 'New York',
            countryIso3: 'USA',
            coordinates: [-74.006, 40.7128],
          },
        ],
      }),
    ).toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });
});
