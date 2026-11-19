import type {
  BordersProfileId,
  BordersSelectedFeature,
} from '../state/viewerStore';
import { formatBordersMetricValue } from './bordersLegend';
import { getBordersProfileDefinition } from './bordersProfiles';
import {
  parseMetricDataset,
  type MetricDataset,
  type MetricRecord,
} from './observations';

export type BordersMetricRecord = {
  iso3: string;
  name: string;
  value: number | null;
} & Partial<Pick<MetricRecord, 'year' | 'missingReason'>>;

export type BordersMetricsPayload = {
  indicator: string;
  records: BordersMetricRecord[];
} & Partial<Omit<MetricDataset, 'indicator' | 'records'>>;

export type BordersPinRecord = {
  id: string;
  name: string;
  countryIso3: string;
  coordinates: [lng: number, lat: number];
};

export type BordersAdm2Manifest = {
  generatedAt: string;
  countries: Array<{
    iso3: string;
    featureCount: number;
  }>;
};

export type BordersCountryIndexRecord = {
  iso3: string;
  name: string;
  region: string;
  hasAdm1: boolean;
  hasAdm2: boolean;
};

export type BordersAttributionPayload = {
  generatedAt: string;
  sources: string[];
};

type JsonCache = Map<string, Promise<unknown>>;
type BordersFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: Record<string, unknown>;
  }>;
};

export const BORDERS_COLORS = {
  countryNeutral: '#113151',
  countryLine: '#8fd8ff',
  countryLineFocused: '#ffd08a',
  adm1Line: 'rgba(146, 208, 244, 0.42)',
  adm2Line: 'rgba(184, 231, 255, 0.54)',
  adm2LineSelected: '#ffd08a',
  metricStops: ['#0b2741', '#18507e', '#2d7ab3', '#9cd8ff'],
  hierarchyStops: ['#17304d', '#205b7d', '#4b87a1', '#9ec3bf'],
  metricUnavailable: '#102134',
  adm2MetricFill: 'rgba(28, 74, 106, 0.16)',
} as const;

const jsonCache: JsonCache = new Map();
const EMPTY_FEATURE_COLLECTION: BordersFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export const getBordersAssetUrl = (
  path: string,
  options?: { absolute?: boolean },
) => {
  const relativePath = `${import.meta.env.BASE_URL}assets/borders/${path}`;

  if (!options?.absolute) {
    return relativePath;
  }

  const normalizedPath = relativePath.startsWith('/')
    ? relativePath
    : `/${relativePath}`;
  return `${window.location.origin}${normalizedPath}`;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const url = getBordersAssetUrl(path);

  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Borders asset unavailable: ${path}`);
        }

        return response.json() as Promise<T>;
      }),
    );
  }

  return jsonCache.get(url)! as Promise<T>;
};

export const loadBordersCountryIndex = () =>
  fetchJson<BordersCountryIndexRecord[]>('country-index.json');

export const loadBordersCoverage = () =>
  fetchJson<BordersAdm2Manifest>('adm2-manifest.json');

export const loadBordersAttribution = () =>
  fetchJson<BordersAttributionPayload>('attribution.json');

export const loadBordersMetrics = async (
  profileId: 'gdp' | 'population',
): Promise<BordersMetricsPayload> =>
  parseMetricDataset(
    await fetchJson<unknown>(`profiles/${profileId}.json`),
    profileId,
  );

export const loadBordersPins = (profileId: 'gdp' | 'population') =>
  fetchJson<BordersPinRecord[]>(`pins/${profileId}.json`);

const getMetricValues = (payload: BordersMetricsPayload | null) =>
  (payload?.records ?? [])
    .map((record) => record.value)
    .filter(
      (value): value is number => value != null && Number.isFinite(value),
    );

const mixChannel = (from: number, to: number, alpha: number) =>
  Math.round(from + (to - from) * alpha);

const mixHex = (from: string, to: string, alpha: number) => {
  const normalize = (value: string) => value.replace('#', '');
  const fromHex = normalize(from);
  const toHex = normalize(to);
  const r = mixChannel(
    Number.parseInt(fromHex.slice(0, 2), 16),
    Number.parseInt(toHex.slice(0, 2), 16),
    alpha,
  );
  const g = mixChannel(
    Number.parseInt(fromHex.slice(2, 4), 16),
    Number.parseInt(toHex.slice(2, 4), 16),
    alpha,
  );
  const b = mixChannel(
    Number.parseInt(fromHex.slice(4, 6), 16),
    Number.parseInt(toHex.slice(4, 6), 16),
    alpha,
  );

  return `#${[r, g, b]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
};

const getLogRangeRatio = (value: number, values: number[]) => {
  const safeValues = values.filter((entry) => entry > 0);

  if (safeValues.length === 0 || value <= 0) {
    return 0;
  }

  const min = Math.log10(Math.min(...safeValues));
  const max = Math.log10(Math.max(...safeValues));

  if (Math.abs(max - min) < Number.EPSILON) {
    return 1;
  }

  return Math.min(1, Math.max(0, (Math.log10(value) - min) / (max - min)));
};

const getMetricColor = (value: number | null, values: number[]) => {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return BORDERS_COLORS.metricUnavailable;
  }

  const ratio = getLogRangeRatio(value, values);

  if (ratio <= 0.33) {
    return mixHex(
      BORDERS_COLORS.metricStops[0],
      BORDERS_COLORS.metricStops[1],
      ratio / 0.33,
    );
  }

  if (ratio <= 0.66) {
    return mixHex(
      BORDERS_COLORS.metricStops[1],
      BORDERS_COLORS.metricStops[2],
      (ratio - 0.33) / 0.33,
    );
  }

  return mixHex(
    BORDERS_COLORS.metricStops[2],
    BORDERS_COLORS.metricStops[3],
    (ratio - 0.66) / 0.34,
  );
};

const buildPinFeatureCollection = (records: BordersPinRecord[]) => ({
  type: 'FeatureCollection' as const,
  features: records.map((record) => ({
    type: 'Feature' as const,
    id: record.id,
    geometry: {
      type: 'Point' as const,
      coordinates: record.coordinates,
    },
    properties: {
      id: record.id,
      name: record.name,
      iso3: record.countryIso3,
    },
  })),
});

export const getBordersCountryName = (
  countryIndex: BordersCountryIndexRecord[] | null,
  iso3: string | null,
) => {
  if (countryIndex == null || iso3 == null) {
    return null;
  }

  const normalizedIso = iso3.toUpperCase();
  return (
    countryIndex.find((record) => record.iso3.toUpperCase() === normalizedIso)
      ?.name ?? null
  );
};

export const buildBordersAdm0FillExpression = (
  profileId: BordersProfileId,
  metrics: BordersMetricsPayload | null,
) => {
  if (profileId === 'hierarchy') {
    return BORDERS_COLORS.countryNeutral;
  }

  const values = getMetricValues(metrics);
  const matchPairs = (metrics?.records ?? []).flatMap((record) => [
    record.iso3.toUpperCase(),
    getMetricColor(record.value, values),
  ]);

  return [
    'match',
    ['get', 'iso3'],
    ...matchPairs,
    BORDERS_COLORS.metricUnavailable,
  ];
};

export const buildBordersAdm0LineExpression = (
  focusedCountryIso: string | null,
) => {
  if (focusedCountryIso == null) {
    return BORDERS_COLORS.countryLine;
  }

  return [
    'match',
    ['get', 'iso3'],
    focusedCountryIso.toUpperCase(),
    BORDERS_COLORS.countryLineFocused,
    BORDERS_COLORS.countryLine,
  ];
};

export const buildBordersAdm2FillExpression = (profileId: BordersProfileId) =>
  profileId === 'hierarchy'
    ? ['coalesce', ['get', 'hierarchyColor'], BORDERS_COLORS.hierarchyStops[2]]
    : BORDERS_COLORS.adm2MetricFill;

export const buildBordersAdm2LineExpression = (
  selectedFeature: BordersSelectedFeature | null,
) => {
  if (selectedFeature == null || selectedFeature.admLevel !== 2) {
    return BORDERS_COLORS.adm2Line;
  }

  return [
    'match',
    ['get', 'featureId'],
    selectedFeature.featureId,
    BORDERS_COLORS.adm2LineSelected,
    BORDERS_COLORS.adm2Line,
  ];
};

export const buildBordersAdm2Filter = (focusedCountryIso: string | null) =>
  focusedCountryIso == null
    ? ['==', ['get', 'iso3'], '__NONE__']
    : ['==', ['get', 'iso3'], focusedCountryIso.toUpperCase()];

export const buildBordersPinsData = (input: {
  profileId: BordersProfileId;
  showPinpoints: boolean;
  records: BordersPinRecord[] | null;
}) => {
  const profile = getBordersProfileDefinition(input.profileId);

  if (
    !input.showPinpoints ||
    !profile.showPinpointsByDefault ||
    input.records == null
  ) {
    return EMPTY_FEATURE_COLLECTION;
  }

  return buildPinFeatureCollection(input.records);
};

export const formatBordersSelectionValue = (
  profileId: BordersProfileId,
  value: number | null,
) => formatBordersMetricValue(profileId, value);

export const getBordersAttribution = (
  payload: BordersAttributionPayload | null,
) =>
  payload?.sources?.length
    ? payload.sources.join(', ')
    : 'geoBoundaries, Natural Earth, World Bank Open Data';
