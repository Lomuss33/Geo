import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Deliberately pinned: regeneration must not silently change historical content.
const revision = '4b5039e50d8d2464b065bd76ad6086cd4597108d';
const base = `https://raw.githubusercontent.com/aourednik/historical-basemaps/${revision}`;
const root = fileURLToPath(new URL('../../', import.meta.url));
// Research output is deliberately outside the published tree. A catalog review
// and a separate packaging task are required before any production integration.
if (!process.argv.includes('--research')) {
  throw new Error(
    'Historical pilot publication is blocked pending component-rights review. For local research only, use npm run build:history -- --research.',
  );
}
const output = join(root, '.cache/research/historical-pilot');
const cache = join(root, '.cache/historical-pilot', revision);
const entities = {
  1900: {
    Romania: 'romania',
    Serbia: 'serbia',
    Montenegro: 'montenegro',
    'Austria Hungary': 'austria-hungary',
    Bulgaria: 'bulgaria',
    'Ottoman Empire': 'ottoman-empire',
    Greece: 'greece',
  },
  1938: {
    Albania: 'albania',
    Turkey: 'turkey',
    Bulgaria: 'bulgaria',
    Romania: 'romania',
    Hungary: 'hungary',
    Yugoslavia: 'yugoslavia',
    Greece: 'greece',
  },
};

await mkdir(cache, { recursive: true });
await mkdir(join(output, 'source'), { recursive: true });
async function original(path) {
  const cached = join(cache, path.replaceAll('/', '-'));
  try {
    return await readFile(cached);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const response = await fetch(`${base}/${path}`);
  if (!response.ok)
    throw new Error(`Historical source download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(cached, bytes);
  return bytes;
}
const features = [];
const inputs = [];
for (const [year, names] of Object.entries(entities)) {
  const path = `geojson/world_${year}.geojson`;
  const bytes = await original(path);
  const collection = JSON.parse(bytes.toString('utf8'));
  const selected = collection.features.filter((feature) =>
    Object.hasOwn(names, feature.properties?.NAME),
  );
  for (const name of Object.keys(names)) {
    if (
      selected.filter((feature) => feature.properties.NAME === name).length !==
      1
    )
      throw new Error(`Expected exactly one ${name} feature in ${year}.`);
  }
  // Preferred editable source for this independent dataset: original selected
  // features and properties, with no clipping, rounding or polygon repair.
  const sourceName = `world_${year}.subset.geojson`;
  await writeFile(
    join(output, 'source', sourceName),
    JSON.stringify({ type: 'FeatureCollection', features: selected }) + '\n',
  );
  inputs.push({
    year: Number(year),
    url: `${base}/${path}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    preferredSource: `source/${sourceName}`,
    selectedNames: Object.keys(names),
  });
  for (const feature of selected) {
    const name = feature.properties.NAME;
    features.push({
      type: 'Feature',
      id: `polity-${names[name]}-y${year}`,
      geometry: feature.geometry,
      properties: {
        label: name,
        description: `Source snapshot: ${year}; no exact day is supplied. Historical entity key: polity-${names[name]}. Full source extent, not clipped to the Balkans. Source authority label (SUBJECTO): ${feature.properties.SUBJECTO ?? 'not supplied'}. Approximate educational reconstruction from Historical Basemaps; not independently verified. Source revision: ${revision}.`,
        fromYear: Number(year),
        toYear: Number(year),
      },
    });
  }
}
const licenseBytes = await original('LICENSE');
const atlas = {
  format: 'geo-time-atlas',
  schemaVersion: 1,
  layers: [
    {
      id: 'historical-basemaps-balkans-1900-1938-v1',
      title: 'Balkans: political snapshots · 1900 / 1938',
      perspective: 'borders',
      scope: 'balkans',
      confidence: 'approximate',
      source: {
        title: 'André Ourednik / Historical Basemaps',
        url: `https://github.com/aourednik/historical-basemaps/tree/${revision}`,
        license:
          'GPL-3.0 · modified regional data selection; no warranty; source linked above',
        licenseText: licenseBytes.toString('utf8'),
      },
      kind: 'vector',
      features,
    },
  ],
};
const serialized = JSON.stringify(atlas);
if (Buffer.byteLength(serialized) > 2_000_000)
  throw new Error('Pilot exceeds the atlas file limit.');
await writeFile(join(output, 'balkans-pilot.json'), serialized + '\n');
await writeFile(join(output, 'LICENSE.txt'), licenseBytes);
await writeFile(
  join(output, 'provenance.json'),
  JSON.stringify(
    {
      revision,
      upstream: 'https://github.com/aourednik/historical-basemaps',
      license: 'GPL-3.0',
      modification:
        'Regional feature selection and temporal atlas wrapper by Geo, 2026-11-15. Original geometry and selected source properties preserved. No warranty; not independently verified.',
      periods:
        'Single-year snapshots only; intervening years intentionally have no coverage.',
      geometry:
        'Unclipped WGS84 source coordinates; full polity extents may extend outside the region.',
      inputs,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Built ${features.length} dated features, ${Buffer.byteLength(serialized)} bytes, source ${revision}.`,
);
