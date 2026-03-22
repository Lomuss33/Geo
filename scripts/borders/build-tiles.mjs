import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import {
  buildAttributionPayload,
  buildCountryIndex,
  ensureDirectory,
  isDirectRun,
  readNormalizedJson,
  removeIfExists,
  resolvePublicPath,
  writeBordersStyle,
  writePublicJson,
} from './_shared.mjs';

const TILE_OPTIONS = {
  maxZoom: 6,
  indexMaxZoom: 6,
  indexMaxPoints: 0,
  buffer: 64,
  tolerance: 0,
  extent: 4096,
};

const collectTileKeys = (indexes) => {
  const keys = new Set();

  for (const index of indexes) {
    for (const coord of index.tileCoords) {
      keys.add(`${coord.z}/${coord.x}/${coord.y}`);
    }
  }

  return [...keys].sort((left, right) => {
    const [lz, lx, ly] = left.split('/').map(Number);
    const [rz, rx, ry] = right.split('/').map(Number);

    return lz - rz || lx - rx || ly - ry;
  });
};

export const buildTiles = async () => {
  const [adm0, adm1, adm2] = await Promise.all([
    readNormalizedJson('adm0.geojson'),
    readNormalizedJson('adm1.geojson'),
    readNormalizedJson('adm2.geojson'),
  ]);

  const indexes = {
    adm0: geojsonvt(adm0, TILE_OPTIONS),
    adm1: geojsonvt(adm1, TILE_OPTIONS),
    adm2: geojsonvt(adm2, TILE_OPTIONS),
  };

  const tileKeys = collectTileKeys(Object.values(indexes));
  const tilesRoot = resolvePublicPath('tiles', 'boundaries');

  await removeIfExists(tilesRoot);

  for (const key of tileKeys) {
    const [z, x, y] = key.split('/').map(Number);
    const layers = {};

    for (const [layerName, index] of Object.entries(indexes)) {
      const tile = index.getTile(z, x, y);
      if (tile) {
        layers[layerName] = tile;
      }
    }

    if (Object.keys(layers).length === 0) {
      continue;
    }

    const outputPath = join(tilesRoot, `${z}`, `${x}`, `${y}.pbf`);
    await ensureDirectory(dirname(outputPath));
    await writeFile(outputPath, vtpbf.fromGeojsonVt(layers));
  }

  await writePublicJson('country-index.json', buildCountryIndex(adm0, adm1, adm2));
  await writePublicJson('attribution.json', buildAttributionPayload());
  await writeBordersStyle();

  // Remove transitional GeoJSON assets now that the vector-tile path is live.
  await Promise.all([
    removeIfExists(resolvePublicPath('adm0.geojson')),
    removeIfExists(resolvePublicPath('adm0.metadata.json')),
    removeIfExists(resolvePublicPath('adm1.geojson')),
    removeIfExists(resolvePublicPath('adm1.metadata.json')),
    removeIfExists(resolvePublicPath('adm2')),
  ]);

  console.log(`Wrote ${tileKeys.length} Borders vector tiles.`);
};

if (isDirectRun(import.meta.url)) {
  await buildTiles();
}
