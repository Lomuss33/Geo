# Taskboard

## Review

- [GEO-090 Studio preparation](review/GEO-090-studio-preparation.md) — documentation
  and baseline audit; implementer complete, reviewer verification pending.

- [GEO-095 Restore verification baseline](review/GEO-095-baseline-reliability.md)
  — implementation verified: lint clean, 178 tests, production build, and 13 E2E
  tests passed; independent review pending.

- [GEO-100 Geographic scopes and search](review/GEO-100-geographic-scopes.md)
  — implemented; lint, 189 tests, production build, and 15 Chromium E2E tests
  passed; independent review pending.

- [GEO-105 Local development ports](review/GEO-105-local-ports.md)
  — development on 6000, preview/browser tests on 6001; lint, 189 tests, build,
  and 15 Chromium E2E tests passed; independent review pending.

- [GEO-110 Observation provenance](review/GEO-110-observation-provenance.md)
  — implemented; lint, 199 application tests, one data-builder test, production
  build and 15 Chromium tests passed; independent review pending.

## Backlog and execution order

- [GEO-120 Projects and sharing](backlog/GEO-120-portable-projects.md)
  — after GEO-100 and GEO-110.
- [GEO-130 Data exports](backlog/GEO-130-data-exports.md) — after GEO-120.
- [GEO-140 Learn and compare](backlog/GEO-140-learn-compare.md) — after GEO-120.
- [GEO-150 Clip authoring](backlog/GEO-150-clip-authoring.md) — after GEO-120.
- [GEO-160 Media exports](backlog/GEO-160-media-exports.md) — capture feasibility
  after GEO-095; delivery after GEO-130, GEO-140, and GEO-150.

Dependencies describe work ordering, not authorization to launch parallel agents.
Claim tasks using [the workflow](README.md). Studio behavior remains planned.

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
