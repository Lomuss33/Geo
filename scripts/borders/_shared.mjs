import { readFile, rm, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = resolve(__dirname, '..', '..');
export const PUBLIC_BORDERS_DIR = join(ROOT_DIR, 'public', 'assets', 'borders');
export const CACHE_BORDERS_DIR = join(ROOT_DIR, '.cache', 'borders');
export const RAW_DIR = join(CACHE_BORDERS_DIR, 'raw');
export const NORMALIZED_DIR = join(CACHE_BORDERS_DIR, 'normalized');

const USER_AGENT = 'Geo Borders Builder';
const GEOBOUNDARIES_ALL_ENDPOINTS = {
  ADM0: 'https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM0/',
  ADM1: 'https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM1/',
  ADM2: 'https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM2/',
};
const NATURAL_EARTH_ADM0_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

export const HIERARCHY_COLORS = ['#17304d', '#205b7d', '#4b87a1', '#9ec3bf'];
export const BORDERS_STYLE = {
  version: 8,
  name: 'Borders Atlas',
  center: [-28, 19.5],
  zoom: 1.8,
  bearing: 0,
  pitch: 0,
  projection: {
    type: 'globe',
  },
  sources: {},
  layers: [
    {
      id: 'borders-background',
      type: 'background',
      paint: {
        'background-color': '#050c17',
      },
    },
  ],
  fog: {
    range: [0.4, 10],
    color: '#0b1730',
    'high-color': '#1c4b69',
    'space-color': '#01040a',
    'horizon-blend': 0.06,
  },
};

export const resolvePublicPath = (...segments) =>
  join(PUBLIC_BORDERS_DIR, ...segments);

export const resolveCachePath = (...segments) =>
  join(CACHE_BORDERS_DIR, ...segments);

export const resolveRawPath = (...segments) => join(RAW_DIR, ...segments);

export const resolveNormalizedPath = (...segments) =>
  join(NORMALIZED_DIR, ...segments);

export const ensureDirectory = async (path) => {
  await mkdir(path, { recursive: true });
};

export const ensureParentDirectory = async (path) => {
  await ensureDirectory(dirname(path));
};

export const writeJsonFile = async (path, payload) => {
  await ensureParentDirectory(path);
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
};

export const readJsonFile = async (path) =>
  JSON.parse(await readFile(path, 'utf8'));

export const writePublicJson = async (relativePath, payload) =>
  writeJsonFile(resolvePublicPath(relativePath), payload);

export const writeNormalizedJson = async (filename, payload) =>
  writeJsonFile(resolveNormalizedPath(filename), payload);

export const readNormalizedJson = async (filename) =>
  readJsonFile(resolveNormalizedPath(filename));

export const removeIfExists = async (path) => {
  await rm(path, { recursive: true, force: true });
};

export const isDirectRun = (metaUrl) =>
  process.argv[1] != null &&
  resolve(process.argv[1]) === fileURLToPath(metaUrl);

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText} (${url})`,
    );
  }

  return response.json();
};

export const fetchJsonCached = async (url, cacheRelativePath) => {
  const cachePath = resolveRawPath(cacheRelativePath);

  try {
    return await readJsonFile(cachePath);
  } catch {
    const payload = await fetchJson(url);
    await writeJsonFile(cachePath, payload);
    return payload;
  }
};

export const fetchGeoBoundariesMetadata = async (admLevel) => {
  const payload = await fetchJsonCached(
    GEOBOUNDARIES_ALL_ENDPOINTS[admLevel],
    join('metadata', `${admLevel}.json`),
  );

  return Array.isArray(payload) ? payload : [];
};

export const fetchGeoBoundariesGeometry = async (metadata, admLevel) => {
  const downloadUrl =
    metadata.simplifiedGeometryGeoJSON ??
    metadata.gjDownloadURL ??
    metadata.staticDownloadLink;

  if (typeof downloadUrl !== 'string' || downloadUrl.length === 0) {
    throw new Error(
      `No GeoJSON download URL for ${metadata.boundaryISO} ${admLevel}`,
    );
  }

  return fetchJsonCached(
    downloadUrl,
    join('geometry', admLevel, `${metadata.boundaryISO}.json`),
  );
};

export const fetchNaturalEarthAdm0Collection = async () =>
  fetchJsonCached(
    NATURAL_EARTH_ADM0_URL,
    join('natural-earth', 'ne_50m_admin_0_countries.json'),
  );

export const sortMetadataEntries = (records) =>
  [...records].sort((left, right) =>
    `${left.boundaryISO}-${left.boundaryType}`.localeCompare(
      `${right.boundaryISO}-${right.boundaryType}`,
    ),
  );

export const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index], index);
    }
  };

  const workers = Array.from(
    { length: Math.max(1, Math.min(concurrency, items.length || 1)) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
};

const normalizeName = (value, fallback) => {
  const name = typeof value === 'string' ? value.trim() : '';
  return name.length > 0 ? name : fallback;
};

const roundCoordinate = (value, precision = 4) =>
  Number.parseFloat(Number(value).toFixed(precision));

const dedupeConsecutivePoints = (ring) => {
  const deduped = [];

  for (const point of ring) {
    const previous = deduped[deduped.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      deduped.push(point);
    }
  }

  return deduped;
};

const simplifyRing = (ring, maxPoints, precision) => {
  const rounded = ring.map(([lon, lat]) => [
    roundCoordinate(lon, precision),
    roundCoordinate(lat, precision),
  ]);

  if (rounded.length <= 4) {
    return rounded;
  }

  const step = Math.max(1, Math.ceil(rounded.length / maxPoints));
  const sampled = rounded.filter(
    (_, index) =>
      index === 0 || index === rounded.length - 1 || index % step === 0,
  );
  const deduped = dedupeConsecutivePoints(sampled);
  const first = deduped[0];
  const last = deduped[deduped.length - 1];

  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    deduped.push([...first]);
  }

  return deduped.length >= 4 ? deduped : rounded.slice(0, 4);
};

export const simplifyGeometry = (geometry, admLevel) => {
  if (!geometry || geometry.coordinates == null) {
    return null;
  }

  const precision = admLevel === 'ADM0' ? 3 : 4;
  const maxPoints = admLevel === 'ADM0' ? 220 : admLevel === 'ADM1' ? 96 : 64;

  if (geometry.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geometry.coordinates.map((ring) =>
        simplifyRing(ring, maxPoints, precision),
      ),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring, maxPoints, precision)),
      ),
    };
  }

  return geometry;
};

export const createAdm0Feature = (feature, metadata, index) => {
  const iso3 = metadata.boundaryISO;
  const sourceId = String(
    feature?.properties?.shapeID ?? feature?.id ?? `${iso3}-ADM0-${index + 1}`,
  );
  const geometry = simplifyGeometry(feature?.geometry ?? null, 'ADM0');

  if (geometry == null) {
    return null;
  }

  return {
    type: 'Feature',
    id: `${iso3}-${sourceId}`,
    properties: {
      iso3,
      name: normalizeName(
        feature?.properties?.shapeName ?? metadata.boundaryName,
        iso3,
      ),
      region: normalizeName(
        metadata?.Continent ?? metadata?.['UNSDG-region'],
        'Unknown',
      ),
    },
    geometry,
  };
};

export const createNaturalEarthAdm0Feature = (feature, iso3) => {
  const geometry = simplifyGeometry(feature?.geometry ?? null, 'ADM0');

  if (geometry == null) {
    return null;
  }

  return {
    type: 'Feature',
    id: `${iso3}-natural-earth-adm0`,
    properties: {
      iso3,
      name: normalizeName(
        feature?.properties?.ADMIN ??
          feature?.properties?.NAME_LONG ??
          feature?.properties?.NAME,
        iso3,
      ),
      region: normalizeName(
        feature?.properties?.CONTINENT ?? feature?.properties?.REGION_UN,
        'Unknown',
      ),
    },
    geometry,
  };
};

export const createSubdivisionFeature = (
  feature,
  metadata,
  admLevel,
  index,
) => {
  const iso3 = metadata.boundaryISO;
  const sourceId = String(
    feature?.properties?.shapeID ??
      feature?.id ??
      `${iso3}-${admLevel}-${index + 1}`,
  );
  const geometry = simplifyGeometry(feature?.geometry ?? null, admLevel);

  if (geometry == null) {
    return null;
  }

  return {
    type: 'Feature',
    id: `${iso3}-${sourceId}`,
    properties: {
      iso3,
      featureId: `${iso3}-${sourceId}`,
      name: normalizeName(
        feature?.properties?.shapeName,
        `${iso3} ${admLevel} ${index + 1}`,
      ),
    },
    geometry,
  };
};

export const sortFeatures = (features) =>
  [...features].sort((left, right) =>
    JSON.stringify([
      left.properties?.iso3 ?? '',
      left.properties?.name ?? '',
      left.properties?.featureId ?? '',
      left.id ?? '',
    ]).localeCompare(
      JSON.stringify([
        right.properties?.iso3 ?? '',
        right.properties?.name ?? '',
        right.properties?.featureId ?? '',
        right.id ?? '',
      ]),
    ),
  );

export const featureCollection = (features) => ({
  type: 'FeatureCollection',
  features: sortFeatures(features),
});

const projectPoint = ([lon, lat]) => [
  lon * Math.cos((lat * Math.PI) / 180),
  lat,
];

const signedRingArea = (ring) => {
  let area = 0;

  for (let index = 0; index < ring.length - 1; index += 1) {
    const [x1, y1] = projectPoint(ring[index]);
    const [x2, y2] = projectPoint(ring[index + 1]);
    area += x1 * y2 - x2 * y1;
  }

  return area / 2;
};

const polygonArea = (polygon) => {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return 0;
  }

  const outer = Math.abs(signedRingArea(polygon[0]));
  const holes = polygon
    .slice(1)
    .reduce((sum, ring) => sum + Math.abs(signedRingArea(ring)), 0);

  return Math.max(0, outer - holes);
};

export const calculateGeometryArea = (geometry) => {
  if (geometry == null) {
    return 0;
  }

  if (geometry.type === 'Polygon') {
    return polygonArea(geometry.coordinates);
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce(
      (sum, polygon) => sum + polygonArea(polygon),
      0,
    );
  }

  return 0;
};

export const applyHierarchyProperties = (features) => {
  const ranked = [...features]
    .map((feature) => ({
      area: calculateGeometryArea(feature.geometry),
      feature,
    }))
    .sort(
      (left, right) =>
        right.area - left.area ||
        String(left.feature.properties?.name ?? '').localeCompare(
          String(right.feature.properties?.name ?? ''),
        ),
    );

  const hierarchyById = new Map();

  ranked.forEach((entry, index) => {
    const bucket = Math.min(
      HIERARCHY_COLORS.length - 1,
      Math.floor(
        (index / Math.max(1, ranked.length)) * HIERARCHY_COLORS.length,
      ),
    );
    const hierarchyRank = bucket + 1;

    hierarchyById.set(entry.feature.id, {
      hierarchyRank,
      hierarchyColor: HIERARCHY_COLORS[bucket],
      hierarchyMetricValue: hierarchyRank,
    });
  });

  return features.map((feature) => ({
    ...feature,
    properties: {
      ...feature.properties,
      ...hierarchyById.get(feature.id),
    },
  }));
};

export const writeBordersStyle = async () => {
  await writePublicJson('style.json', BORDERS_STYLE);
};

export const buildCountryIndex = (
  adm0Collection,
  adm1Collection,
  adm2Collection,
) => {
  const adm1Iso = new Set(
    adm1Collection.features.map((feature) => feature.properties.iso3),
  );
  const adm2Iso = new Set(
    adm2Collection.features.map((feature) => feature.properties.iso3),
  );
  const countryByIso = new Map();

  for (const feature of sortFeatures(adm0Collection.features)) {
    const iso3 = feature.properties.iso3;
    if (!countryByIso.has(iso3)) {
      countryByIso.set(iso3, {
        iso3,
        name: feature.properties.name,
        region: feature.properties.region,
        hasAdm1: adm1Iso.has(iso3),
        hasAdm2: adm2Iso.has(iso3),
      });
    }
  }

  return [...countryByIso.values()].sort((left, right) =>
    left.iso3.localeCompare(right.iso3),
  );
};

export const buildAttributionPayload = () => ({
  generatedAt: new Date().toISOString(),
  sources: ['geoBoundaries gbOpen', 'Natural Earth', 'World Bank Open Data'],
});

export const readNormalizedCountries = async () => {
  const adm0 = await readNormalizedJson('adm0.geojson');
  const countryByIso = new Map();

  for (const feature of sortFeatures(adm0.features)) {
    const iso3 = feature.properties.iso3;
    if (!countryByIso.has(iso3)) {
      countryByIso.set(iso3, {
        iso3,
        name: feature.properties.name,
        region: feature.properties.region,
      });
    }
  }

  return [...countryByIso.values()].sort((left, right) =>
    left.iso3.localeCompare(right.iso3),
  );
};

export const fetchWorldBankIndicatorSeries = async (indicatorCode) => {
  return (await fetchWorldBankIndicatorDataset(indicatorCode)).records;
};

export const fetchWorldBankIndicatorDataset = async (indicatorCode) => {
  const url =
    `https://api.worldbank.org/v2/country/all/indicator/${indicatorCode}` +
    '?format=json&per_page=5000&mrv=8&gapfill=y';

  const payload = await fetchJsonCached(
    url,
    join('world-bank', `${indicatorCode}.json`),
  );

  if (!Array.isArray(payload?.[1]) || payload?.[0]?.pages !== 1) {
    throw new Error(
      `Invalid or incomplete World Bank response: ${indicatorCode}`,
    );
  }
  const cacheInfo = await stat(
    resolveRawPath('world-bank', `${indicatorCode}.json`),
  );
  return {
    records: payload[1],
    sourceUrl: url,
    retrievedAt: cacheInfo.mtime.toISOString(),
    timestampBasis: 'cache-file-modification',
  };
};

export const buildWorldBankRecordMap = (records, countryIsoSet) => {
  const latestByIso = new Map();

  for (const record of records) {
    const iso3 = String(record?.countryiso3code ?? '').toUpperCase();
    if (!countryIsoSet.has(iso3)) {
      continue;
    }

    const value = record?.value;
    const year = Number(record.date);
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      !Number.isInteger(year) ||
      year < 1800 ||
      year > 2200
    ) {
      continue;
    }

    const current = latestByIso.get(iso3);
    if (!current || Number(record.date) > Number(current.date)) {
      latestByIso.set(iso3, {
        date: Number(record.date),
        value,
      });
    }
  }

  return latestByIso;
};
