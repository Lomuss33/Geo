# Source review catalog

Maintainer: active data task owner. Policy: [DATA_POLICY](../../docs/DATA_POLICY.md).
This initial catalog enforces the suspension of one known historical research
package. It is **not** a completed rights audit of every legacy asset.

`historical-basemaps.json` records pinned inputs, hashes, separate review states,
source evidence and the publication block. `npm run verify:data` rejects blocked
paths inside `public/`; `npm run build` runs it before copying public assets.
Do not change the review status to make a build pass. Review the actual inputs,
record evidence and complete a separate packaging task before enabling a source.

| Source                                        | Current evidence/state                                                                                             | Next action                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Historical Basemaps regional pilot            | GPL-3.0 notice confirmed at the pinned revision; contributing-map rights unresolved; local research only           | Trace 1900/1938 components or choose a separately reviewed alternative         |
| geoBoundaries gbOpen                          | Legacy runtime assets and attribution present; builder still uses `/api/current/`; per-release evidence incomplete | GEO-195 immutable input/hash manifest before any rebuild                       |
| Natural Earth                                 | Legacy fallback; builder references mutable `master`                                                               | Pin revision, document public-domain evidence and derived geometry             |
| NASA Earth imagery                            | Source filenames/URLs in ASSETS and NASA notice in THIRD_PARTY; no fresh full media-rights audit                   | Preserve notice; verify each replacement                                       |
| World Bank                                    | Source years, unit policy and URLs retained in observations                                                        | Preserve dataset version and comparison semantics                              |
| OpenFreeMap/OpenStreetMap                     | External basemap/fonts/sprites; service terms inspected 2026-11-16; no SLA/offline promise                         | Review attribution and failure/availability behavior with security remediation |
| Cliopatria, HistoGIS, AWMC                    | Research shortlist from the owner document, not imported/approved here                                             | GEO-200 source-specific rights and temporal pilot                              |
| DEM providers, historical imagery, gazetteers | Discovered only                                                                                                    | Verify edition, terms, dates and distribution before implementation            |

The pinned Historical Basemaps README's Credits section describes inputs from
multiple sources including archived/student material. That does not prove a
specific infringement; it leaves component-rights review incomplete. The owner
requires a production hold until it is resolved. This decision supersedes the
earlier GEO-171 assumption that carrying the upstream license was sufficient.

Local research commands (Node 24):

```sh
npm run build:history -- --research
npm run test:history:research
```

Output stays in ignored `.cache/research/historical-pilot/`. No default build,
unit test or published app requires those files. The research check validates
source fidelity/date gaps/license preservation; it is not a historical or legal
approval. Existing private atlas files remain importable and exportable.

[OpenFreeMap terms](https://openfreemap.org/tos/) describe an as-is free service
that can stop. Offline downloads have specific size/concurrency/identification
limits. Geo does not currently implement that download feature; do not add bulk
prefetch based on the general availability of free tiles.

The fuller owner-provided [research shortlist](../../docs/research/SOURCE_SHORTLIST.md)
is retained as unverified leads, not source approval.
