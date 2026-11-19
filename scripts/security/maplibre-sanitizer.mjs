import { createHash } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const specification = JSON.parse(
  await readFile(join(here, 'maplibre-sanitizer.json'), 'utf8'),
);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

// A version bump is not a reason to silently reuse a vendor patch. Re-audit it.
export async function backportPlan(packageDirectory) {
  const metadata = JSON.parse(
    await readFile(join(packageDirectory, 'package.json'), 'utf8'),
  );
  if (
    metadata.version !== specification.version ||
    metadata.main !== 'dist/maplibre-gl.js'
  ) {
    throw new Error(
      'Unsupported MapLibre package: review GEO-204 before changing version or entrypoint.',
    );
  }
  const pending = [];
  for (const file of specification.files) {
    const path = join(packageDirectory, file.path);
    const original = await readFile(path);
    const digest = sha256(original);
    if (digest === file.patchedSha256) continue;
    if (digest !== file.originalSha256) {
      throw new Error(
        `Unrecognized MapLibre bytes in ${file.path}; no files were patched. Reinstall the pinned package or review the backport.`,
      );
    }
    let fixed = original.toString('utf8').replace(file.before, file.after);
    if (file.sourceMapComment) {
      // Avoid publishing misleading upstream mappings for locally changed code.
      fixed = fixed.replace(
        file.sourceMapComment,
        '// GEO-204: upstream source map disabled after the security backport.',
      );
    }
    if (sha256(fixed) !== file.patchedSha256)
      throw new Error(`Backport digest mismatch in ${file.path}.`);
    pending.push({ path, fixed });
  }
  return pending;
}

export async function verifyBackport(packageDirectory) {
  if ((await backportPlan(packageDirectory)).length) {
    throw new Error(
      'MapLibre security backport is missing. Run npm run patch:security or npm ci with lifecycle scripts enabled.',
    );
  }
}

export async function applyBackport(packageDirectory) {
  // Preflight every file before writing any, so unknown versions/bytes fail closed.
  const pending = await backportPlan(packageDirectory);
  for (const { path, fixed } of pending) await writeFile(path, fixed);
  await verifyBackport(packageDirectory);
  return pending.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const packageDirectory = resolve(here, '../../node_modules/maplibre-gl');
  const mode = process.argv[2];
  if (mode === '--apply') {
    const count = await applyBackport(packageDirectory);
    // An old optimized dependency could otherwise outlive the patched package.
    // This fixed generated-cache path is the only directory removed by the CLI.
    const nodeModules = resolve(here, '../../node_modules');
    const cache = join(nodeModules, '.vite');
    if (!isAbsolute(cache) || dirname(cache) !== nodeModules) {
      throw new Error('Unexpected Vite cache path.');
    }
    await rm(cache, { recursive: true, force: true });
    console.log(
      `MapLibre ${specification.version}: verified ${specification.advisory} backport (${count} files patched).`,
    );
  } else if (mode === '--verify') {
    await verifyBackport(packageDirectory);
    console.log(
      `MapLibre ${specification.version}: ${specification.advisory} backport verified.`,
    );
  } else {
    throw new Error('Expected --apply or --verify.');
  }
}
