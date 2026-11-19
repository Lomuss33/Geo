# GEO-196 Topology-aware boundary and LOD pipeline

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-196-topology-lod` (create when claimed)
- Dependencies: GEO-194, GEO-195

## Why and starting evidence

Replace lossy vertex sampling only after its baseline and immutable sources exist.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

scripts/borders/, explicit fixtures, pipeline reports and source metadata; choose tooling by evidence, no renderer rewrite.

## Acceptance criteria

- [ ] Separate canonical geometry, generalized LOD and display symbols; retain rollback assets.
- [ ] Use a proven topology-aware build-time method; validate rings, holes, islands/enclaves, shared edges, seams and antimeridian.
- [ ] Report changed area/displacement, invalid polygons and lost small features using documented source tolerances and geodesic/projected methods.
- [ ] Do not merge competing interpretations or raise tile maxZoom to claim new detail; validate pilot before bulk assets.

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
