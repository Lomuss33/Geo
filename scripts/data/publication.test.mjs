import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPublicData, verifyPublicData } from './check-public-data.mjs';
import { fileURLToPath } from 'node:url';

const blocked = {
  schemaVersion: 1,
  id: 'test-source',
  publication: {
    status: 'blocked',
    reason: 'Rights pending',
    publicPaths: ['assets/test'],
  },
};

test('blocks data publication even when an upstream license string is present', () => {
  const root = mkdtempSync(join(tmpdir(), 'geo-publication-'));
  try {
    verifyPublicData(root, [blocked]);
    mkdirSync(join(root, 'public/assets/test'), { recursive: true });
    assert.throws(
      () => verifyPublicData(root, [{ ...blocked, declaredLicense: 'MIT' }]),
      /blocked research data/,
    );
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('geo-publication-'));
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects traversal, unknown states and publication without all reviews', () => {
  for (const path of ['../private', '.', '/absolute', 'assets\\test']) {
    assert.throws(() =>
      verifyPublicData('.', [
        {
          ...blocked,
          publication: { ...blocked.publication, publicPaths: [path] },
        },
      ]),
    );
  }
  assert.throws(() =>
    verifyPublicData('.', [
      {
        ...blocked,
        publication: { ...blocked.publication, status: 'approved-ish' },
      },
    ]),
  );
  assert.throws(
    () =>
      verifyPublicData('.', [
        {
          ...blocked,
          publication: { ...blocked.publication, status: 'published' },
          reviews: { rights: 'verified' },
        },
      ]),
    /separate rights/,
  );
  assert.throws(
    () => verifyPublicData('.', [blocked, blocked]),
    /Invalid source/,
  );
});

test('the repository publication catalog does not expose quarantined data', () => {
  assert.ok(
    checkPublicData(fileURLToPath(new URL('../../', import.meta.url))) > 0,
  );
});
