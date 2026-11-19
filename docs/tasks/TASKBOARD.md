# Taskboard

## Current handoff

GEO-190/191/192/193/194/204/206 implementer checks are complete; all remain in
review because independent verification is pending. GEO-208 integrates this
prepared work under the owner's commit/merge request. GEO-205 storage resilience
follows; GEO-207 retains remaining security work.

## In progress

- [GEO-208 Verified repository integration](in-progress/GEO-208-verified-integration.md) - coherent commits, PR CI and merge; quarantine/source/security gates preserved, Pages release remains manual.

## Review

- [GEO-194 Renderer and geographic regression matrix](review/GEO-194-regression-matrix.md) - 256 unit / 8 Node / 47 Pages Chromium / 40 dev Chromium+Firefox / 20 Pages Firefox / 3 dev canaries / 1 Firefox DOM case passed. Renderer recovery, explicit Geo frames and editor readiness repaired; fine geometry, physical Android and performance remain separate gates.

- [GEO-206 Dependency advisory maintenance](review/GEO-206-dependency-security.md) - compatible chain patches; 232 unit / 8 Node / final 27 Chromium / 3 dev / 1 Firefox DOM checks passed. An initial intermittent ultrawide width failure is recorded for GEO-194. Remaining root advisories/runtime work are GEO-207; no security clearance or publication implied.

- [GEO-204 Renderer security](review/GEO-204-renderer-security.md) - hash-locked
  upstream backport, fail-closed installation checks and attribution canaries;
  clean install, 232 unit / 8 Node / 27 Chromium / 3 dev / 1 Firefox DOM checks
  passed. npm's version finding remains; other package updates are GEO-206.

- [GEO-190 Project foundation](review/GEO-190-project-foundation.md) - owner
  constitution, reality audit, portable memory and executable backlog.
- [GEO-191 Historical publication gate](review/GEO-191-historical-publication-gate.md)
  - research preserved outside publication; private files remain usable.
- [GEO-192 Earth entry](review/GEO-192-earth-entry.md) - immediate Earth, opt-in Help.
- [GEO-193 Dev security](review/GEO-193-dev-security.md) - Vite 8.1.6, safe default
  port, private-cache denial. Clean install/check and 23 E2E checks passed;
  remaining dependency advisories are recorded, not waived.

- [GEO-171 Historical boundary pilot](review/GEO-171-historical-pilot.md) — optional
  1900/1938 technical research retained; first-party publication suspended by
  GEO-191 pending component-rights review. Earlier checks are historical evidence.

- [GEO-180 Monochrome UI](review/GEO-180-monochrome-ui.md) — square monochrome UI,
  persistent dark/light mode; touch, selected-country contrast and startup keyboard
  follow-up verified through 320px; independent review pending.

- [GEO-170 Time atlas foundation](review/GEO-170-time-atlas.md) — starter preserved;
  dated layer authoring, map/timeline workspace and atlas files; 217 unit tests,
  data-builder test and 19 Chromium checks passed; independent review pending.

- [GEO-115 Startup flight brief](review/GEO-115-startup-popup.md) - popup overflow
  and keyboard repair verified historically; GEO-192 makes Help opt-in. The
  GEO-190 baseline now passes geography search; independent review pending.

- [GEO-090 Studio preparation](review/GEO-090-studio-preparation.md) — documentation
  and baseline audit; implementer complete, reviewer verification pending.

- [GEO-095 Restore verification baseline](review/GEO-095-baseline-reliability.md)
  — implementation verified: lint clean, 178 tests, production build, and 13 E2E
  tests passed; independent review pending.

- [GEO-100 Geographic scopes and search](review/GEO-100-geographic-scopes.md)
  — implemented; lint, 189 tests, production build, and 15 Chromium E2E tests
  passed; independent review pending.

- [GEO-105 Local development ports](review/GEO-105-local-ports.md)
  — original 6000 default superseded by GEO-193; earlier evidence retained; lint, 189 tests, build,
  and 15 Chromium E2E tests passed; independent review pending.

- [GEO-110 Observation provenance](review/GEO-110-observation-provenance.md)
  — implemented; lint, 199 application tests, one data-builder test, production
  build and 15 Chromium tests passed; independent review pending.

## Backlog and execution order

The owner constitution supersedes earlier numerical delivery order. Dependencies
matter more than task numbers; original review/done records are retained.

- [GEO-205 Storage resilience](backlog/GEO-205-storage-resilience.md) - P1; known
  direct preference/draft storage errors, separate from theme-only fallback.
- [GEO-207 Remaining glob and runtime security](backlog/GEO-207-toolchain-security-followup.md) - P1 before release; picomatch has no published fix, Node maintenance is separate from npm undici. Independent mobile/regression work may proceed.
- [GEO-195 Pin modern boundary inputs and attribution](backlog/GEO-195-immutable-sources.md) - P1.
- [GEO-196 Topology-aware boundary and LOD pipeline](backlog/GEO-196-topology-lod.md) - P1.
- [GEO-197 Minimal source layer style capability registries](backlog/GEO-197-typed-registries.md) - P1.
- [GEO-198 Geographic focus and camera handoff contract](backlog/GEO-198-geographic-view-intent.md) - P1.
- [GEO-199 Historical identity evidence and temporal resolution](backlog/GEO-199-historical-claims.md) - P1.
- [GEO-200 Reviewed historical source pilots and coverage matrix](backlog/GEO-200-historical-source-pilots.md) - P1.
- [GEO-201 Verified zero-cost DEM and Relief pilot](backlog/GEO-201-verified-relief.md) - P2.
- [GEO-202 Stable workspace zones density and localization](backlog/GEO-202-workspace-ui.md) - P2.
- [GEO-203 Reproducible geography performance evidence](backlog/GEO-203-performance-evidence.md) - P2.

Existing product work remains:

- [GEO-172 Historical entities](backlog/GEO-172-historical-entities.md) - apply
  GEO-199 contracts; territory/evidence first, people as context.
- [GEO-173 Dated imagery](backlog/GEO-173-dated-imagery.md) - rights/date gate.
- [GEO-120 Projects and sharing](backlog/GEO-120-portable-projects.md) - after
  GEO-100/110 and shared registry/temporal contracts GEO-197/199.
- [GEO-130 Data exports](backlog/GEO-130-data-exports.md) - after GEO-120.
- [GEO-140 Learn and compare](backlog/GEO-140-learn-compare.md) - evidence-backed.
- [GEO-150 Clip authoring](backlog/GEO-150-clip-authoring.md) - mobile Story Editor
  after shared scenes; no fabricated historical frames.
- [GEO-160 Media exports](backlog/GEO-160-media-exports.md) - capture feasibility
  first, then verified PNG/video with attribution and shared scene evaluation.

Claim using [the workflow](README.md). Parallelism is optional and needs isolated
ownership; no independent review or background execution is implied by a plan.

## Done

- `GEO-001` Foundation and toolchain
- `GEO-010` App shell and HUD
- `GEO-020` Asset pipeline and optimized runtime imagery
- `GEO-030` Globe rendering
- `GEO-040` Interaction engine and URL state
- `GEO-050` Viewer UX and presets
- `GEO-060` Reliability and fallbacks
- `GEO-070` QA scaffold and release plumbing
- `GEO-080` Documentation and collaboration docs

## Resolved temp tasks

- `TMP-GEO-020-01` Placeholder texture generation
- `TMP-GEO-030-01` Procedural cloud layer
- `TMP-GEO-040-01` View-state serialization contract
