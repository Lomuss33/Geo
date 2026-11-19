// Optional local research verification. No quarantined bytes are needed by the
// default application tests or published build. Node 24 strips the parser's types.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAtlasFile, activeLayerItems } from '../../src/lib/timeAtlas.ts';

const directory = resolve('.cache/research/historical-pilot');
const read = (path) => readFileSync(resolve(directory, path), 'utf8');
let data;
let metadata;
try {
  data = parseAtlasFile(read('balkans-pilot.json'));
  metadata = JSON.parse(read('provenance.json'));
} catch (cause) {
  throw new Error(
    'Research fixtures missing or invalid. Use npm run build:history -- --research; this does not approve publication.',
    { cause },
  );
}

test('research snapshots retain exact source geometries and explicit date gaps', () => {
  const layer = data.layers[0];
  assert.equal(layer.kind, 'vector');
  assert.equal(layer.confidence, 'approximate');
  for (const year of [1899, 1901, 1937, 1939])
    assert.equal(activeLayerItems(layer, year), 0);
  for (const input of metadata.inputs) {
    assert.equal(activeLayerItems(layer, input.year), 7);
    assert.ok(input.url.includes(metadata.revision));
    assert.match(input.sha256, /^[0-9a-f]{64}$/);
    const originals = JSON.parse(read(input.preferredSource));
    const snapshot = layer.features.filter(
      (feature) => feature.properties.fromYear === input.year,
    );
    assert.equal(snapshot.length, originals.features.length);
    for (const feature of snapshot) {
      assert.deepEqual(
        feature.geometry,
        originals.features.find(
          (original) => original.properties.NAME === feature.properties.label,
        )?.geometry,
      );
      assert.equal(feature.properties.toYear, input.year);
      assert.match(feature.id, /^polity-[a-z-]+-y\d+$/);
    }
  }
});

test('research import/export retains the upstream notice without claiming component-rights approval', () => {
  const roundTrip = parseAtlasFile(JSON.stringify(data));
  assert.match(roundTrip.layers[0].source.license, /GPL-3.0/);
  assert.equal(roundTrip.layers[0].source.licenseText, read('LICENSE.txt'));
});
