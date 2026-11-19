import type { Feature, Geometry } from 'geojson';

export const ATLAS_STORAGE_KEY = 'geo:time-atlas:v1';
export const MAX_ATLAS_BYTES = 2_000_000;
export const MIN_ATLAS_YEAR = -10000;
export const MAX_ATLAS_YEAR = 2200;
export const PERSPECTIVES = {
  borders: {
    label: 'Borders & states',
    color: '#65e8ff',
    description: 'Territory, states and changing boundaries',
  },
  rulers: {
    label: 'People & rule',
    color: '#ffc982',
    description: 'People, rulers, dynasties and events',
  },
  culture: {
    label: 'Culture & society',
    color: '#c2a6ff',
    description: 'Languages, beliefs and cultural change',
  },
  imagery: {
    label: 'Earth imagery',
    color: '#9de5b1',
    description: 'Dated imagery, one capture period at a time',
  },
} as const;
export type Perspective = keyof typeof PERSPECTIVES;
export type AtlasScope = 'balkans' | 'europe' | 'world';
export type AtlasProperties = {
  label: string;
  description: string;
  fromYear: number;
  toYear: number;
};
export type AtlasFeature = Feature<Geometry, AtlasProperties> & { id: string };
export type AtlasSource = {
  title: string;
  url: string;
  license: string;
  licenseText?: string;
};
type LayerBase = {
  id: string;
  title: string;
  perspective: Perspective;
  scope: AtlasScope;
  source: AtlasSource;
  confidence: 'documented' | 'approximate' | 'disputed';
};
export type AtlasLayer = LayerBase &
  (
    | { kind: 'vector'; features: AtlasFeature[] }
    | {
        kind: 'raster';
        frames: {
          id: string;
          fromYear: number;
          toYear: number;
          tiles: string;
          minZoom: number;
          maxZoom: number;
        }[];
      }
  );
export type TimeAtlas = {
  format: 'geo-time-atlas';
  schemaVersion: 1;
  layers: AtlasLayer[];
};
export const emptyTimeAtlas = (): TimeAtlas => ({
  format: 'geo-time-atlas',
  schemaVersion: 1,
  layers: [],
});

export function formatAtlasYear(year: number) {
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected an object.');
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string, max = 240): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Invalid ${name}.`);
  return value.trim();
}
function id(value: unknown) {
  const result = text(value, 'identifier', 80);
  if (!/^[\w-]+$/.test(result))
    throw new Error(
      'Identifiers use letters, numbers, hyphens and underscores.',
    );
  return result;
}
export function atlasAssetUrl(value: unknown) {
  const url = text(value, 'asset URL', 2000);
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('..'))
    return url;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
    throw new Error('Use an HTTPS source URL or local asset path.');
  return url;
}
function period(value: Record<string, unknown>) {
  const { fromYear, toYear } = value;
  if (
    typeof fromYear !== 'number' ||
    typeof toYear !== 'number' ||
    !Number.isInteger(fromYear) ||
    !Number.isInteger(toYear) ||
    fromYear < MIN_ATLAS_YEAR ||
    toYear > MAX_ATLAS_YEAR ||
    fromYear > toYear
  )
    throw new Error(
      'Invalid year interval. Use whole astronomical years, from ≤ to.',
    );
  return { fromYear, toYear };
}
function geometry(input: unknown): Geometry {
  const value = record(input);
  const position = (input: unknown) => {
    if (
      !Array.isArray(input) ||
      input.length !== 2 ||
      !input.every((v) => typeof v === 'number' && Number.isFinite(v)) ||
      Math.abs(input[0] as number) > 180 ||
      Math.abs(input[1] as number) > 90
    )
      throw new Error('Coordinates must be WGS84 [longitude, latitude].');
    return input as [number, number];
  };
  const line = (input: unknown, ring = false) => {
    if (
      !Array.isArray(input) ||
      input.length < (ring ? 4 : 2) ||
      input.length > 20000
    )
      throw new Error('Invalid line or polygon ring.');
    const result = input.map(position);
    if (
      ring &&
      (result[0]![0] !== result.at(-1)![0] ||
        result[0]![1] !== result.at(-1)![1])
    )
      throw new Error('Polygon rings must be closed.');
    return result;
  };
  const polygon = (input: unknown) => {
    if (!Array.isArray(input) || !input.length || input.length > 100)
      throw new Error('Invalid polygon.');
    return input.map((ring) => line(ring, true));
  };
  switch (value.type) {
    case 'Point':
      return { type: 'Point', coordinates: position(value.coordinates) };
    case 'LineString':
      return { type: 'LineString', coordinates: line(value.coordinates) };
    case 'Polygon':
      return { type: 'Polygon', coordinates: polygon(value.coordinates) };
    case 'MultiPolygon': {
      if (
        !Array.isArray(value.coordinates) ||
        !value.coordinates.length ||
        value.coordinates.length > 500
      )
        throw new Error('Invalid multipolygon.');
      return {
        type: 'MultiPolygon',
        coordinates: value.coordinates.map(polygon),
      };
    }
    default:
      throw new Error(
        'Supported geometry: Point, LineString, Polygon, MultiPolygon.',
      );
  }
}

export function parseTimeAtlas(input: unknown): TimeAtlas {
  const atlas = record(input);
  if (
    atlas.format !== 'geo-time-atlas' ||
    atlas.schemaVersion !== 1 ||
    !Array.isArray(atlas.layers) ||
    atlas.layers.length > 100
  )
    throw new Error(
      'Expected a geo-time-atlas version 1 file with at most 100 layers.',
    );
  const layerIds = new Set<string>();
  let featureCount = 0;
  const layers = atlas.layers.map((input): AtlasLayer => {
    const value = record(input);
    const layerId = id(value.id);
    if (layerIds.has(layerId)) throw new Error('Duplicate layer ID.');
    layerIds.add(layerId);
    if (
      typeof value.perspective !== 'string' ||
      !Object.hasOwn(PERSPECTIVES, value.perspective) ||
      !['balkans', 'europe', 'world'].includes(String(value.scope)) ||
      !['documented', 'approximate', 'disputed'].includes(
        String(value.confidence),
      )
    )
      throw new Error('Invalid perspective, scope or confidence.');
    const source = record(value.source);
    if (
      source.licenseText !== undefined &&
      (typeof source.licenseText !== 'string' ||
        source.licenseText.length > 50000 ||
        !source.licenseText.trim())
    )
      throw new Error('Invalid license text.');
    const base: LayerBase = {
      id: layerId,
      title: text(value.title, 'layer title'),
      perspective: value.perspective as Perspective,
      scope: value.scope as AtlasScope,
      confidence: value.confidence as LayerBase['confidence'],
      source: {
        title: text(source.title, 'source title'),
        url: atlasAssetUrl(source.url),
        license: text(source.license, 'source license'),
        ...(source.licenseText === undefined
          ? {}
          : { licenseText: source.licenseText as string }),
      },
    };
    const itemIds = new Set<string>();
    if (value.kind === 'raster') {
      if (
        base.perspective !== 'imagery' ||
        !Array.isArray(value.frames) ||
        value.frames.length > 200 ||
        !value.frames.length
      )
        throw new Error('Imagery requires 1–200 dated raster frames.');
      const frames = value.frames.map((input) => {
        const frame = record(input);
        const frameId = id(frame.id);
        if (itemIds.has(frameId)) throw new Error('Duplicate frame ID.');
        itemIds.add(frameId);
        const dates = period(frame);
        const tiles = atlasAssetUrl(frame.tiles);
        if (!['{z}', '{x}', '{y}'].every((token) => tiles.includes(token)))
          throw new Error('Raster frames require an XYZ tile URL.');
        const minZoom = frame.minZoom;
        const maxZoom = frame.maxZoom;
        if (
          typeof minZoom !== 'number' ||
          typeof maxZoom !== 'number' ||
          !Number.isInteger(minZoom) ||
          !Number.isInteger(maxZoom) ||
          minZoom < 0 ||
          maxZoom > 22 ||
          minZoom > maxZoom
        )
          throw new Error('Invalid raster zoom range.');
        return { id: frameId, ...dates, tiles, minZoom, maxZoom };
      });
      const sorted = [...frames].sort((a, b) => a.fromYear - b.fromYear);
      if (
        sorted.some(
          (frame, index) =>
            index > 0 && frame.fromYear <= sorted[index - 1]!.toYear,
        )
      )
        throw new Error(
          'Imagery frame periods must not overlap within a layer.',
        );
      return { ...base, kind: 'raster', frames };
    }
    if (
      value.kind !== 'vector' ||
      base.perspective === 'imagery' ||
      !Array.isArray(value.features) ||
      value.features.length === 0
    )
      throw new Error('Vector layers require dated GeoJSON features.');
    const features = value.features.map((input): AtlasFeature => {
      const feature = record(input);
      const featureId = id(feature.id);
      if (
        ++featureCount > 5000 ||
        itemIds.has(featureId) ||
        feature.type !== 'Feature'
      )
        throw new Error('Invalid, duplicate or excessive feature count.');
      itemIds.add(featureId);
      const properties = record(feature.properties);
      return {
        type: 'Feature',
        id: featureId,
        geometry: geometry(feature.geometry),
        properties: {
          label: text(properties.label, 'feature label'),
          description:
            typeof properties.description === 'string'
              ? properties.description.slice(0, 5000)
              : '',
          ...period(properties),
        },
      };
    });
    return { ...base, kind: 'vector', features };
  });
  return { format: 'geo-time-atlas', schemaVersion: 1, layers };
}

export function parseAtlasFile(json: string) {
  if (new TextEncoder().encode(json).length > MAX_ATLAS_BYTES)
    throw new Error('Atlas files must be under 2 MB.');
  return parseTimeAtlas(JSON.parse(json));
}
export function layerInScope(layer: AtlasLayer, scope: AtlasScope) {
  return (
    scope === 'world' ||
    layer.scope === scope ||
    (scope === 'europe' && layer.scope === 'balkans')
  );
}
export function activeLayerItems(layer: AtlasLayer, year: number) {
  return layer.kind === 'vector'
    ? layer.features.filter(
        (feature) =>
          feature.properties.fromYear <= year &&
          feature.properties.toYear >= year,
      ).length
    : layer.frames.filter(
        (frame) => frame.fromYear <= year && frame.toYear >= year,
      ).length;
}
export function atlasExtent(layers: AtlasLayer[]) {
  const periods = layers.flatMap<{ fromYear: number; toYear: number }>(
    (layer) =>
      layer.kind === 'vector'
        ? layer.features.map((feature) => feature.properties)
        : layer.frames,
  );
  return periods.length
    ? {
        min: Math.min(...periods.map((period) => period.fromYear)),
        max: Math.max(...periods.map((period) => period.toYear)),
      }
    : { min: -2999, max: new Date().getFullYear() };
}
export function downloadAtlas(atlas: TimeAtlas) {
  const blob = new Blob([JSON.stringify(atlas, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'geo-time-atlas.json';
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
