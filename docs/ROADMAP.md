# Roadmap

Updated 2026-11-19 from the owner constitution and latest self-checks. Enduring constraints:
[PRODUCT_VISION](PRODUCT_VISION.md). Actual capabilities: [FEATURE_REGISTRY](FEATURE_REGISTRY.md).
Current checks/blockers: [STATUS](STATUS.md). One execution tracker:
[tasks/TASKBOARD](tasks/TASKBOARD.md). Numbers are IDs, not priority order.

## Preserve the foundation

Existing Geo/R3F, Headway/Borders, search/scopes, sourced observations, comparison,
view URLs and camera timelines remain. The Time atlas/user-file foundation and
monochrome UI are implemented locally with review pending. The first-party
Historical Basemaps pilot is quarantined pending component-rights review.
No completed task is reset to make room for the new direction.

## Current foundation campaign

- GEO-190: reality audit, permanent guidance, truthful status and executable work.
- GEO-191: historical source publication hold, research isolation and build guard.
- GEO-192: immediate Earth entry, opt-in Help, preserved accessibility and URLs.
- GEO-193: same-major Vite security maintenance and a browser-usable dev port.
- GEO-204 (P0): attribution sanitizer backport implemented and verified locally;
  independent review pending. npm still flags the upstream version. See
  [SECURITY](SECURITY.md); compatible chain patches are in GEO-206 and residual
  security work remains GEO-207 before release.
- GEO-206: compatible affected-chain updates and implementer checks are complete;
  independent review pending. Residual picomatch and runtime maintenance is GEO-207;
  do not turn npm's suggested major downgrades into an automatic migration.
- GEO-194: renderer recovery, saved-frame/editor readiness and six-viewport
  Chromium/Firefox self-checks complete; independent review pending. Geographic
  fixtures pin only country-scale baselines. Real Android and precision/performance
  evidence remain separate.

## Ordered enabling work

| Work                                         | Dependencies                        | Outcome                                                                                        |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| GEO-206 dependency maintenance (review)      | GEO-204 backport checks             | compatible updates and clean-install/canary self-checks; independent review pending            |
| GEO-207 remaining toolchain/runtime security | GEO-204/206 evidence                | verified same-line Node maintenance and upstream picomatch follow-up; no advisory suppression  |
| GEO-194 regression matrix (review)           | current foundation                  | verified desktop renderer/URL/viewport baselines; source/real-device precision limits explicit |
| GEO-205 storage resilience                   | current foundation                  | denied-storage handling for preferences/drafts, preservation of unsaved work                   |
| GEO-195 pinned modern sources                | source policy                       | immutable gbOpen/Natural Earth input hashes and rights/attribution evidence                    |
| GEO-196 topology and LOD                     | GEO-194/195                         | controlled generalization, shared boundaries and island/seam checks                            |
| GEO-197 typed registries                     | source policy, existing adapters    | source/layer/style/tool capabilities without runtime plugin infrastructure                     |
| GEO-198 geographic intent                    | GEO-194                             | stable focus/scale/orientation handoff with stated tolerances                                  |
| GEO-199 historical claims/resolver           | source policy, atlas v1             | identity vs source record, precision, alternatives, BCE/CE and honest gaps                     |
| GEO-200 historical source pilots             | GEO-199 plus source-specific rights | reviewed Cliopatria/HistoGIS/AWMC candidates with full extents and evidence                    |
| GEO-201 physical/Relief pilot                | source rights and registries        | actual DEM, encoding/height/NoData checks, modern-reference labels                             |
| GEO-202 shell/density/localization           | registries and view intent          | stable shared workspace zones, mobile parity, BCS/English/German infrastructure                |
| GEO-203 measured performance                 | regression matrix                   | reproducible cold/warm loads, frame p95, memory proxy and real-device evidence                 |

Dependencies can be satisfied by verified self-check where independent review is
still pending, but that is not authorization to mark a task done or publish. Split
large phases into smaller tasks before implementing. Do not rebuild geometry or
upgrade a major renderer incidentally.

## Connected Learn/Create journey

Retain the existing studio tasks and refine their contracts against the owner
vision before implementation:

- GEO-120: SceneSnapshot/ProjectDocument, ordered scenes, versioned references,
  portable JSON, compatible view/animation imports and bounded local persistence.
  Historical integration depends on GEO-197/199; do not ship a competing format.
- GEO-130: selected observation CSV/GeoJSON with sources, years and safe text export.
- GEO-140 / GEO-172: evidence/territory/timeline/relationships where real records
  exist. Polity identity is separate from names, control and source snapshots.
- GEO-150: mobile Story Editor, data/geo/free labels and linked/overridden behavior;
  auto-sequences use available states only. Advanced Timeline follows the foundation.
- GEO-160: shared preview/export model, exact PNG composition/attribution and only
  verified browser video formats. Timeline hex is not a movie.
- GEO-173: dated imagery only after verified acquisition coverage, rights and CORS.

The integrated phone release journey in PRODUCT is a target. No current code
claims a complete history/terrain/Learn/Create/export workflow.

## Long-term expansion and exclusions

Deepen Balkan and global coverage through reviewed regional/time packs; geography
and territorial change remain the focus. Add hydrology, historical landscapes,
culture and GIS analysis only with evidence and an appropriate source model.
Keep source/geometry alternatives distinct and record uncertainty.

No paid or billable services, required backend/accounts, hidden tracking or
unapproved publishing automation. Cloud collaboration, exhaustive yearly world
history, server video rendering and guaranteed MP4 are not first-release promises.
Continuous improvement means successive active sessions, not a pretend perpetual
background agent.
