# Dependency security maintenance

Maintainer: active security task owner. Updated 2026-11-18 for GEO-204/206. This
records specific fixes and remaining paths, not blanket publication approval.

## MapLibre attribution backport

Geo pins **maplibre-gl 5.21.0** and applies the narrow upstream fix for
[GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579).
The vulnerable sanitizer iterates a live attribute collection while removing
attributes. A neighboring event handler or unsafe URL can survive and execute
inside AttributionControl. The
[upstream fix](https://github.com/maplibre/maplibre-gl-js/commit/1da69f3cd913a39fa948708e01478663bf48bc27)
snapshots that collection with `Array.from` before removing entries.

The application uses the same package in Headway, Borders and TimeAtlasMap.
Headway receives attribution from styles and remote TileJSON; Borders passes
local attribution metadata to the control. Time atlas has constant reference
credits plus React-rendered user source text. No `setHTML` in application code
does not prove an attribution control is safe.

`scripts/security/maplibre-sanitizer.json` specifies original and patched SHA-256
values for `src/util/dom.ts` and the four non-worker production/development/CSP
bundles. The install script preflights every file before writing any, rejects
unknown versions/bytes, applies only the reviewed loop change, and verifies the
result. Unchanged license headers/notices remain under BSD-3-Clause. Nothing
changes the npm package version to pretend an upstream release was installed.

Tradeoff: original generated source maps do not describe modified bundle bytes.
The four patched bundle mapping comments are disabled; upstream map files are
retained but unreferenced. Debug stepping in those dependency bundles is reduced.
This does not change Geo source mapping or renderer behavior. No library bundle
or boundary dataset is vendored into the repository.

## Installation and fail-closed checks

```sh
npm ci
npm run verify:security
npm run check
npm run test:e2e
npm run test:security:dev
```

`postinstall` applies/verifies the patch automatically. The normal npm dev, build,
test and watch commands verify it before use. If lifecycle scripts are disabled,
those commands reject the unpatched package. For explicit repair after stopping
this project's dev server, run `npm run patch:security`; then restart it. The
repair CLI also clears only generated `node_modules/.vite/`, so stale optimized
MapLibre code cannot outlive a repair. Verification alone never edits files.

An interrupted install may leave a mixture of known original/patched files;
repair completes it. Unexpected bytes fail rather than being silently overwritten.
Do not edit the expected hashes or allow another version merely to make checks
green. Install the pinned artifact or perform a new security/compatibility review.

Directly bypassing npm scripts is not a supported release workflow. Publishing a
previously built dist does not retroactively verify its contents. Rebuild and run
the canary tests against that exact output after a patch or dependency change.

## Regression coverage and evidence

- `maplibreAttribution.test.ts` exercises the installed control with adjacent
  events, unsafe links, image attributes and nested SVG, through both custom and
  source attribution. Later metadata updates and legitimate HTTPS credits remain.
- Production browser canaries route controlled style, TileJSON and Borders
  metadata into the actual app. Handlers only increment a local counter; there is
  no exfiltration or attack against a third-party service.
- `test:security:dev` repeats those app tests through Vite's optimized dependency
  path at `/`; production tests cover the Pages build at `/Geo/`.
- The no-WebGL browser control fixture can run on desktop Firefox as well as
  Chromium. It establishes DOM/control behavior, not full Firefox map rendering,
  mobile support or Android device performance.

Optional Firefox fixture on Windows PowerShell:

```powershell
npx playwright install firefox
$env:GEO_E2E_FIREFOX = '1'
npx playwright test tests/attribution-control.spec.ts --project=firefox
Remove-Item Env:GEO_E2E_FIREFOX
```

See [GEO-204 evidence](tasks/review/GEO-204-renderer-security.md) for actual
results and [the advisory triage](audits/GEO-204-attribution-security.md) for limits.

## npm audit and future upgrades

`npm audit` identifies upstream version ranges, not this local backport. It will
still flag 5.21.0. Retain that report and link the precise mitigation/evidence;
never suppress the advisory or report zero vulnerabilities based on a payload test.
Compatible fixes for fflate, protobuf schema, Vitest mocker, minimatch, braces,
humanfs, Babel/browser-target metadata, YAML, npm Undici and Zod are recorded in
[GEO-206's audit](audits/GEO-206-dependency-maintenance.md). The installed-tree audit
reports 13 affected packages (1 critical MapLibre version finding, 12 high package
findings propagated from one picomatch advisory). Production-only audit reports
only MapLibre. Counts can change with registry metadata and do not measure
exploited bugs or establish a safe release.

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) has no
published fixed picomatch version as of 2026-11-18. Vite/Vitest/TypeScript-ESLint
use it in development file-scanning chains; the application has no direct
picomatch import or user-glob API. Untrusted project/configuration input remains
a concern. Do not accept npm's suggested major downgrades as a validated fix or
write an unreviewed regex replacement merely to silence the count.

Node's built-in Undici/OpenSSL are separate from npm packages. The observed local
runtime is Node 24.11.1 with built-in Undici 7.16.0 / OpenSSL 3.5.4; it was not
updated by the jsdom dependency repair. The official
[November 2026 release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
provides Node 24.22.3. Maintain the supported 24 line separately, starting with a
verified project-scoped executable and repeating checks before adoption. No
system PATH or other project's runtime was changed in this increment.

[GEO-207](tasks/backlog/GEO-207-toolchain-security-followup.md) tracks remaining
upstream glob/runtime work. This does not block independent regression/mobile
work, remove the release security gate or authorize publication.

An upstream supported fixed version is preferable long term, but a major renderer
upgrade requires its own compatibility/authorization review. Once an approved
upgrade supplies the fix, remove the backport lifecycle/verification hooks,
specification and related assumptions together. Keep the behavior canaries and
legacy renderer, camera, style, URL and import checks. A future change to source
attribution handling requires re-review even if the existing payloads still pass.
