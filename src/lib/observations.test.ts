import { describe, expect, it } from 'vitest';
import gdp from '../../public/assets/borders/profiles/gdp.json';
import population from '../../public/assets/borders/profiles/population.json';
import {
  comparisonPolicy,
  getMetricObservation,
  parseMetricDataset,
  type MetricRecord,
} from './observations';

const record = (
  iso3: string,
  value: number | null,
  year: number | null,
): MetricRecord => ({
  iso3,
  name: iso3,
  value,
  year,
  missingReason:
    value === null ? 'no-observation' : year === null ? 'unknown-year' : null,
});

describe('observation contracts', () => {
  it('validates both bundled datasets and retains provenance for an individual observation', () => {
    const data = parseMetricDataset(population, 'population');
    expect(parseMetricDataset(gdp, 'gdp').unit).toBe('current US$');
    const observation = getMetricObservation(data, 'HRV')!;
    expect(observation.year).toBeGreaterThan(2000);
    expect(observation.source.name).toBe('World Bank Open Data');
    expect(observation.source.retrievedAt).toBeTruthy();
    expect(observation.unit).toBe('people');
    expect(observation.datasetVersion).toContain('SP.POP.TOTL');
  });

  it('migrates legacy profiles without inventing observation or retrieval years', () => {
    const data = parseMetricDataset(
      {
        indicator: 'GDP',
        records: [{ iso3: 'HRV', name: 'Croatia', value: 0 }],
      },
      'gdp',
    );
    expect(data.records[0]).toMatchObject({
      value: 0,
      year: null,
      missingReason: 'unknown-year',
    });
    expect(data.source.retrievedAt).toBeNull();
    expect(comparisonPolicy(data.records).canCompareSameYear).toBe(false);
    expect(parseMetricDataset(data, 'gdp')).toEqual(data);
  });

  it('distinguishes missing data from a real zero', () => {
    const data = parseMetricDataset(
      {
        ...population,
        records: [record('HRV', 0, 2024), record('BIH', null, null)],
      },
      'population',
    );
    expect(data.records.map((entry) => entry.value)).toEqual([0, null]);
    expect(comparisonPolicy(data.records).canCompareSameYear).toBe(false);
  });

  it('allows same-year comparisons only when all selected observations have that year', () => {
    expect(
      comparisonPolicy([record('HRV', 1, 2024), record('BIH', 2, 2024)])
        .canCompareSameYear,
    ).toBe(true);
    const mixed = comparisonPolicy([
      record('HRV', 1, 2023),
      record('BIH', 2, 2024),
    ]);
    expect(mixed.canCompareSameYear).toBe(false);
    expect(mixed.label).toContain('Mixed years');
    expect(comparisonPolicy([]).canCompareSameYear).toBe(false);
  });

  it.each([NaN, Infinity, -1, '100'])('rejects invalid values: %s', (value) => {
    expect(() =>
      parseMetricDataset(
        { ...population, records: [{ ...record('HRV', 1, 2024), value }] },
        'population',
      ),
    ).toThrow();
  });

  it('rejects future versions, mismatched indicators, duplicate IDs and inconsistent availability', () => {
    expect(() =>
      parseMetricDataset({ ...population, schemaVersion: 2 }, 'population'),
    ).toThrow();
    expect(() => parseMetricDataset(gdp, 'population')).toThrow();
    expect(() =>
      parseMetricDataset(
        {
          ...population,
          records: [record('HRV', 1, 2024), record('HRV', 2, 2024)],
        },
        'population',
      ),
    ).toThrow();
    expect(() =>
      parseMetricDataset(
        {
          ...population,
          records: [{ ...record('HRV', null, null), year: 2024 }],
        },
        'population',
      ),
    ).toThrow();
    expect(() =>
      parseMetricDataset(
        { ...population, records: [record('HRV', 1, 2024.5)] },
        'population',
      ),
    ).toThrow();
    expect(() =>
      parseMetricDataset(
        {
          ...population,
          source: { ...population.source, url: 'javascript:alert(1)' },
        },
        'population',
      ),
    ).toThrow();
  });
});
