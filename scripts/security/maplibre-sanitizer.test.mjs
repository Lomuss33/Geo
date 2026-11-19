import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBackport,
  backportPlan,
  specification,
  verifyBackport,
} from './maplibre-sanitizer.mjs';

async function withPackage(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'geo-maplibre-'));
  try {
    await callback(directory);
  } finally {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('geo-maplibre-'));
    await rm(directory, { recursive: true, force: true });
  }
}

test('installed MapLibre backport is verified and applying twice changes nothing', async () => {
  const directory = fileURLToPath(
    new URL('../../node_modules/maplibre-gl/', import.meta.url),
  );
  await verifyBackport(directory);
  assert.equal(await applyBackport(directory), 0);
  assert.equal((await backportPlan(directory)).length, 0);
});

test('an unknown version fails before any package file is patched', async () => {
  await withPackage(async (directory) => {
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({ version: '6.4.1', main: 'dist/maplibre-gl.js' }),
    );
    await assert.rejects(applyBackport(directory), /Unsupported MapLibre/);
  });
});

test('unexpected bytes fail closed and are not overwritten', async () => {
  await withPackage(async (directory) => {
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({
        version: specification.version,
        main: 'dist/maplibre-gl.js',
      }),
    );
    const target = join(directory, specification.files[0].path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, 'unreviewed bytes');
    await assert.rejects(
      applyBackport(directory),
      /Unrecognized MapLibre bytes/,
    );
    assert.equal(await readFile(target, 'utf8'), 'unreviewed bytes');
  });
});

test('a later unrecognized file cannot leave an earlier file partially patched', async () => {
  const installed = fileURLToPath(
    new URL('../../node_modules/maplibre-gl/', import.meta.url),
  );
  const first = specification.files[0];
  const original = (
    await readFile(join(installed, first.path), 'utf8')
  ).replace(first.after, first.before);
  await withPackage(async (directory) => {
    await writeFile(
      join(directory, 'package.json'),
      JSON.stringify({
        version: specification.version,
        main: 'dist/maplibre-gl.js',
      }),
    );
    await mkdir(dirname(join(directory, first.path)), { recursive: true });
    await writeFile(join(directory, first.path), original);
    const later = join(directory, specification.files[1].path);
    await mkdir(dirname(later), { recursive: true });
    await writeFile(later, 'unreviewed bundle');
    await assert.rejects(
      applyBackport(directory),
      /Unrecognized MapLibre bytes/,
    );
    assert.equal(await readFile(join(directory, first.path), 'utf8'), original);
  });
});
