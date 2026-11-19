export const METRIC_DEFINITIONS = {
  gdp: {
    label: 'GDP (current US$)',
    code: 'NY.GDP.MKTP.CD',
    unit: 'current US$',
  },
  population: {
    label: 'Population, total',
    code: 'SP.POP.TOTL',
    unit: 'people',
  },
} as const;
export type MetricId = keyof typeof METRIC_DEFINITIONS;
export type MetricRecord = {
  iso3: string;
  name: string;
  value: number | null;
  year: number | null;
  missingReason: 'no-observation' | 'unknown-year' | null;
};
export type MetricDataset = {
  schemaVersion: 1;
  indicator: string;
  indicatorId: MetricId;
  unit: string;
  datasetVersion: string;
  source: {
    name: string;
    url: string;
    retrievedAt: string | null;
    timestampBasis: 'download' | 'cache-file-modification' | 'unknown';
  };
  records: MetricRecord[];
};

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid metric object.');
  return value as Record<string, unknown>;
};
const text = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

/** Validate at the asset boundary; legacy values never acquire invented years. */
export function parseMetricDataset(
  input: unknown,
  id: MetricId,
): MetricDataset {
  const payload = object(input);
  const legacy = payload.schemaVersion === undefined;
  const definition = METRIC_DEFINITIONS[id];
  if (!legacy && payload.schemaVersion !== 1)
    throw new Error('Unsupported metric schema version.');
  if (
    !text(payload.indicator) ||
    !Array.isArray(payload.records) ||
    payload.records.length > 1000
  )
    throw new Error('Invalid metric dataset.');
  const source = legacy
    ? {
        name: 'World Bank Open Data',
        url: `https://data.worldbank.org/indicator/${definition.code}`,
        retrievedAt: null,
        timestampBasis: 'unknown',
      }
    : object(payload.source);
  if (
    !legacy &&
    (payload.indicatorId !== id ||
      payload.unit !== definition.unit ||
      !text(payload.datasetVersion))
  )
    throw new Error('Metric metadata mismatch.');
  if (
    !text(source.name) ||
    typeof source.url !== 'string' ||
    !source.url.startsWith('https://') ||
    (source.retrievedAt !== null &&
      (typeof source.retrievedAt !== 'string' ||
        !Number.isFinite(Date.parse(source.retrievedAt)))) ||
    !['download', 'cache-file-modification', 'unknown'].includes(
      String(source.timestampBasis),
    )
  )
    throw new Error('Invalid metric source.');
  if ((source.retrievedAt === null) !== (source.timestampBasis === 'unknown'))
    throw new Error('Inconsistent source timestamp.');
  const ids = new Set<string>();
  const records = payload.records.map((entry): MetricRecord => {
    const record = object(entry);
    if (
      typeof record.iso3 !== 'string' ||
      !/^[A-Z]{3}$/.test(record.iso3) ||
      ids.has(record.iso3) ||
      !text(record.name)
    )
      throw new Error('Invalid or duplicate metric country.');
    ids.add(record.iso3);
    if (
      record.value !== null &&
      (typeof record.value !== 'number' ||
        !Number.isFinite(record.value) ||
        record.value < 0)
    )
      throw new Error('Invalid metric value.');
    const year = legacy ? null : record.year;
    if (
      year !== null &&
      (typeof year !== 'number' ||
        !Number.isInteger(year) ||
        year < 1800 ||
        year > 2200)
    )
      throw new Error('Invalid observation year.');
    const missingReason = legacy
      ? record.value === null
        ? 'no-observation'
        : 'unknown-year'
      : record.missingReason;
    if (
      (record.value === null &&
        (year !== null || missingReason !== 'no-observation')) ||
      (record.value !== null &&
        (year === null
          ? missingReason !== 'unknown-year'
          : missingReason !== null))
    )
      throw new Error('Inconsistent observation availability.');
    return {
      iso3: record.iso3,
      name: record.name as string,
      value: record.value as number | null,
      year: year as number | null,
      missingReason: missingReason as MetricRecord['missingReason'],
    };
  });
  return {
    schemaVersion: 1,
    indicator: payload.indicator as string,
    indicatorId: id,
    unit: definition.unit,
    datasetVersion: legacy
      ? 'legacy-unversioned'
      : (payload.datasetVersion as string),
    source: source as MetricDataset['source'],
    records,
  };
}

export function comparisonPolicy(records: MetricRecord[]) {
  const available = records.filter((record) => record.value !== null);
  const years = [
    ...new Set(
      available
        .map((record) => record.year)
        .filter((year): year is number => year !== null),
    ),
  ].sort();
  const unknown = available.some((record) => record.year === null);
  const sameYear = available.length > 0 && !unknown && years.length === 1;
  return {
    canCompareSameYear: sameYear && available.length === records.length,
    label:
      available.length === 0
        ? 'No observations available.'
        : unknown
          ? 'Observation years unknown; same-year comparisons unavailable.'
          : sameYear
            ? `Observation year: ${years[0]}.`
            : `Observation years: ${years[0]}–${years.at(-1)}. Mixed years; same-year comparisons unavailable.`,
  };
}

export function getMetricObservation(dataset: MetricDataset, iso3: string) {
  const record = dataset.records.find((entry) => entry.iso3 === iso3);
  return record
    ? {
        ...record,
        indicatorId: dataset.indicatorId,
        unit: dataset.unit,
        source: dataset.source,
        datasetVersion: dataset.datasetVersion,
      }
    : null;
}
