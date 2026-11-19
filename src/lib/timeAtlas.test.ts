import { describe, expect, it } from 'vitest';
import {
  activeLayerItems,
  atlasExtent,
  emptyTimeAtlas,
  formatAtlasYear,
  layerInScope,
  parseAtlasFile,
  parseTimeAtlas,
} from './timeAtlas';

const source = {
  title: 'Test-only source',
  url: 'https://example.org/fixture',
  license: 'Test fixture',
};
const vector = {
  id: 'test',
  title: 'Fictional test layer',
  scope: 'balkans',
  perspective: 'borders',
  confidence: 'approximate',
  source,
  kind: 'vector',
  features: [
    {
      type: 'Feature',
      id: 'place',
      geometry: { type: 'Point', coordinates: [16, 45] },
      properties: {
        label: 'Test location',
        description: '',
        fromYear: 1000,
        toYear: 1100,
      },
    },
  ],
};
const file = (layer: unknown) => ({ ...emptyTimeAtlas(), layers: [layer] });

describe('temporal atlas contracts', () => {
  it('round-trips sourced layers and includes only observations covering the selected year', () => {
    const atlas = parseAtlasFile(JSON.stringify(file(vector)));
    expect(parseTimeAtlas(atlas)).toEqual(atlas);
    expect(activeLayerItems(atlas.layers[0]!, 999)).toBe(0);
    expect(activeLayerItems(atlas.layers[0]!, 1000)).toBe(1);
    expect(activeLayerItems(atlas.layers[0]!, 1100)).toBe(1);
    expect(activeLayerItems(atlas.layers[0]!, 1101)).toBe(0);
    expect(atlasExtent(atlas.layers)).toEqual({ min: 1000, max: 1100 });
    expect(layerInScope(atlas.layers[0]!, 'europe')).toBe(true);
    expect(layerInScope(atlas.layers[0]!, 'world')).toBe(true);
  });

  it('retains BCE semantics across the era boundary', () => {
    expect(formatAtlasYear(-1)).toBe('2 BCE');
    expect(formatAtlasYear(0)).toBe('1 BCE');
    expect(formatAtlasYear(1)).toBe('1 CE');
  });

  it('rejects unsupported versions and conflicting imports', () => {
    expect(() =>
      parseTimeAtlas({ ...file(vector), schemaVersion: 2 }),
    ).toThrow();
    expect(() =>
      parseTimeAtlas({ ...file(vector), layers: [vector, vector] }),
    ).toThrow(/Duplicate layer/);
    expect(() =>
      parseTimeAtlas(
        file({ ...vector, features: [...vector.features, ...vector.features] }),
      ),
    ).toThrow();
  });

  it.each([null, {}, [181, 45], [16, 91], [NaN, 45], [16], ['16', 45]])(
    'rejects invalid WGS84 coordinates %j',
    (coordinates) => {
      expect(() =>
        parseTimeAtlas(
          file({
            ...vector,
            features: [
              {
                ...vector.features[0],
                geometry: { type: 'Point', coordinates },
              },
            ],
          }),
        ),
      ).toThrow();
    },
  );

  it('rejects unknown, reversed or non-integer years rather than filling the timeline', () => {
    for (const dates of [
      { fromYear: null, toYear: 1100 },
      { fromYear: 1200, toYear: 1100 },
      { fromYear: 1000.5, toYear: 1100 },
    ]) {
      expect(() =>
        parseTimeAtlas(
          file({
            ...vector,
            features: [
              {
                ...vector.features[0],
                properties: { ...vector.features[0]!.properties, ...dates },
              },
            ],
          }),
        ),
      ).toThrow();
    }
  });

  it('requires provenance and safe source URLs', () => {
    for (const badSource of [
      { ...source, url: 'javascript:alert(1)' },
      { ...source, license: '' },
      { ...source, title: '' },
    ])
      expect(() =>
        parseTimeAtlas(file({ ...vector, source: badSource })),
      ).toThrow();
    expect(() => parseAtlasFile(' '.repeat(2_000_001))).toThrow(/2 MB/);
  });

  it('validates closed historical polygons without inventing geometry', () => {
    const ring = [
      [10, 40],
      [20, 40],
      [20, 50],
      [10, 40],
    ];
    const atlas = parseTimeAtlas(
      file({
        ...vector,
        features: [
          {
            ...vector.features[0],
            geometry: { type: 'Polygon', coordinates: [ring] },
          },
        ],
      }),
    );
    expect(atlas.layers[0]?.kind).toBe('vector');
    expect(() =>
      parseTimeAtlas(
        file({
          ...vector,
          features: [
            {
              ...vector.features[0],
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [10, 40],
                    [20, 40],
                    [20, 50],
                    [10, 50],
                  ],
                ],
              },
            },
          ],
        }),
      ),
    ).toThrow(/closed/);
  });

  it('selects only dated imagery frames and rejects ambiguous overlapping coverage', () => {
    const frame = {
      id: 'one',
      fromYear: 2000,
      toYear: 2000,
      tiles: 'https://example.org/tiles/{z}/{x}/{y}.png',
      minZoom: 0,
      maxZoom: 10,
    };
    const layer = {
      ...vector,
      perspective: 'imagery',
      kind: 'raster',
      frames: [frame, { ...frame, id: 'two', fromYear: 2010, toYear: 2010 }],
    };
    const atlas = parseTimeAtlas(file(layer));
    expect(activeLayerItems(atlas.layers[0]!, 2000)).toBe(1);
    expect(activeLayerItems(atlas.layers[0]!, 2005)).toBe(0);
    expect(() =>
      parseTimeAtlas(
        file({ ...layer, frames: [frame, { ...frame, id: 'other' }] }),
      ),
    ).toThrow(/overlap/);
  });
});
