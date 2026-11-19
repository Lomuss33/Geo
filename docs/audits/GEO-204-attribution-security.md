# GEO-204 attribution security audit

Date: 2026-11-18. Local branch: `geo/geo-204-renderer-security`, HEAD `6414025`
plus the inherited dirty tree. The 84 pre-existing files were preserved with
hashes in ignored `.cache/geo-204/entry-work.zip` and its manifest. No commits,
pushes, publication or independent review were performed.

## Actual entry paths

| Path              | Attribution entrance                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| HeadwayMap        | Local style JSON plus remote vector TileJSON; custom baseline credits are also passed to AttributionControl   |
| BordersMap        | Local `attribution.json` sources passed as customAttribution; existing source/tiles stay unchanged            |
| TimeAtlasMap      | MapLibre default control, fixed modern-reference credit; private source text rendered by React, not user HTML |
| Installed library | `dist/maplibre-gl.js` default package entry; same sanitizer in dev/CSP variants                               |

The installed source and all four non-worker bundles contain the live collection
loop. The upstream fix is
[1da69f3cd913a39fa948708e01478663bf48bc27](https://github.com/maplibre/maplibre-gl-js/commit/1da69f3cd913a39fa948708e01478663bf48bc27).
See [SECURITY](../SECURITY.md) for the exact patch, installation guard and debugging
tradeoff. Source/geometry publication gates are unrelated and remain in force.

## Before/after evidence

Before the backport, the new installed-control suite had 8 failures / 2 passes.
Handlers survived after a preceding handler or script URL was stripped. Controlled
Chromium app canaries executed locally through style, TileJSON and Borders custom
metadata (counters 4, 4 and 3). They never sent data to an attacker or modified a
third-party service.

After the backport, a clean `npm ci` applied all five patches. Lint, 232 unit tests,
8 Node data/security tests and the Pages build passed, followed by 27 production
Chromium checks, 3 development app canaries and 1 desktop Firefox DOM fixture.
Missing-patch checks rejected both build and dev after lifecycle scripts were
deliberately disabled. Repair was idempotent and cleared an existing Vite cache
probe. No dependency versions changed. See [the task evidence](../tasks/review/GEO-204-renderer-security.md)
for exact commands and limits; full Firefox map/device coverage remains unverified.

## Other dependency triage — not a blanket exemption

`npm audit --json` on 2026-11-18 reports 25 findings (1 critical, 12 high,
11 moderate, 1 low). No dependency versions changed during this session's lockfile
update; the MapLibre exact pin and install-script metadata changed. The previous
2026-11-16 report of 20 is historical, not a current result.

| Chain                                                                                             | Actual use / disposition                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| maplibre-gl                                                                                       | Browser attribution loop addressed by the documented local backport; upstream version finding remains, review still required                                                                                       |
| fflate via @types/three / three-stdlib / drei                                                     | Production-transitive loaders; Geo currently loads JPEG/JSON, no direct ZIP/unzip calls found in src/scripts. Not declared unreachable or safe; patch under GEO-206                                                |
| protocol-buffers-schema via pbf/resolve-protobuf-schema                                           | Runtime/build dependency graph for vector tiles and tile generation; Geo does not accept user .proto schemas. Trace bundling/reachability and patch, not a categorical exemption                                   |
| undici via jsdom                                                                                  | Development/test dependency; no production Node backend. Patch compatible range and verify tests; Node's own HTTP implementation is a separate maintenance concern                                                 |
| zod via React Hooks ESLint tooling                                                                | Development lint dependency; current application validators are handwritten. Patch with the toolchain, not an imported-data clearance                                                                              |
| picomatch, tinyglobby, fdir, minimatch, brace-expansion; dependent Vite/Vitest/TS-ESLint packages | File scanning/build/test chains, not app country-search input. Audit now flags Vite transitively; no new direct Vite advisory in this report. Remediate compatible ranges without npm's suggested major downgrades |
| @vitest/mocker / vitest                                                                           | Test/dev mock server surfaces; ordinary `vitest run` is not an intentionally network-exposed public service. Still upgrade compatible patched versions and retest                                                  |
| @babel/core, browserslist, baseline-browser-mapping                                               | Transform/target-selection tooling; no GUI feature evaluates user JS or browserslist inputs. Record real build risk; patch in the dedicated maintenance increment                                                  |
| @humanfs/node, js-yaml and dependent ESLint/TS-ESLint packages                                    | Development filesystem/configuration parsing. Current user atlas JSON is not routed through YAML. Do not suppress the findings; validate compatible tooling updates                                                |

`npm explain` established these parent chains; source search found no direct ZIP,
YAML, protobuf-schema compiler or HTML setter calls in the app. Absence of a direct
call does not prove every transitive path unreachable. No exploit reproduction of
these other packages or global audit fix was performed. GEO-206 owns the bounded
compatible updates and fresh audit comparison.

No renderer major upgrade, geometry regeneration or optional historical publication
was introduced. Physical Android Firefox and performance budgets remain untested.
