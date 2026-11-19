# GEO-203 Reproducible geography performance evidence

## Status

- State: backlog
- Priority: P2
- Owner: unclaimed
- Branch: `geo/geo-203-performance-evidence` (create when claimed)
- Dependencies: GEO-194; baseline before major optimization

## Why and starting evidence

Measure actual bottlenecks before simplifying data or promising device performance.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

benchmark harness/artifacts, rendering instrumentation and measured changes only; no unbounded CI load or tile-service prefetch.

## Acceptance criteria

- [ ] Record browser/device, cold/warm caches, controlled bandwidth/latency, transfer, first useful view, frame p95, switches and memory proxy.
- [ ] Compare results to provisional owner budgets without claiming simulation equals real Android Firefox.
- [ ] Profile main-thread/GPU/React costs; prioritize decorative effects, DPR and resource release before geographic feature loss.
- [ ] Keep regional/time lazy packs and existing XYZ until PMTiles/Range/Pages/device benchmarks justify migration.

## Implementation and rollback

Start with one complete small pilot. Preserve existing assets/format decoders and
fallback paths until verified. Split further tasks if this scope cannot be fully
checked. No broad reformat, unapproved data publication or unrelated dependency
major changes.

## Verification

NOT RUN; implementation has not started. Required: clean install when dependencies
change, lint, unit/data tests, production build, changed-file formatting, relevant
E2E and manual output inspection. Record physical-device vs emulated evidence,
rights/attribution review and any blocked checks explicitly.

## Implementer self-check

- [ ] Scope complete
- [ ] Checks and limitations recorded

## Reviewer verification

- [ ] Independent changes review
- [ ] Acceptance criteria confirmed
- Notes: pending; keep review distinct from implementation evidence.

## Handoff

Update STATUS, TASKBOARD, affected contracts and source review records. Leave
exact next commands/fixtures and unresolved owner decisions (or none).
