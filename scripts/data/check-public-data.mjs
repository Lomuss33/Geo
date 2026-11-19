import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyPublicData(root, records) {
  const publicRoot = resolve(root, 'public');
  const ids = new Set();
  for (const record of records) {
    if (
      record.schemaVersion !== 1 ||
      typeof record.id !== 'string' ||
      !record.id ||
      ids.has(record.id) ||
      !['blocked', 'published'].includes(record.publication?.status) ||
      !Array.isArray(record.publication.publicPaths) ||
      record.publication.publicPaths.length === 0 ||
      typeof record.publication.reason !== 'string' ||
      !record.publication.reason.trim()
    )
      throw new Error('Invalid source publication record.');
    ids.add(record.id);
    if (
      record.publication.status === 'published' &&
      (record.reviews?.rights !== 'verified' ||
        record.reviews?.geometry !== 'validated' ||
        record.reviews?.history !== 'reviewed')
    )
      throw new Error(
        `${record.id}: publication requires separate rights, geometry and history review.`,
      );
    for (const path of record.publication.publicPaths) {
      if (
        typeof path !== 'string' ||
        !path ||
        isAbsolute(path) ||
        path.includes('\\')
      )
        throw new Error('Invalid public data path.');
      const target = resolve(publicRoot, path);
      const inside = relative(publicRoot, target);
      if (!inside || inside.startsWith('..') || isAbsolute(inside))
        throw new Error('Source publication path escapes public/.');
      if (record.publication.status === 'blocked' && existsSync(target))
        throw new Error(
          `${record.id}: blocked research data found in public/${path}. ${record.publication.reason}`,
        );
    }
  }
}

export function checkPublicData(root) {
  const catalog = resolve(root, 'data/catalog');
  const records = readdirSync(catalog)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(resolve(catalog, name), 'utf8')));
  if (!records.length) throw new Error('Source publication catalog is empty.');
  verifyPublicData(root, records);
  return records.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const count = checkPublicData(root);
  console.log(
    `Checked ${count} source publication record(s); blocked data are outside public/.`,
  );
}
