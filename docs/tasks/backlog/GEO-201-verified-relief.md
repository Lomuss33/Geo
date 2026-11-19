# GEO-201 Verified zero-cost DEM and Relief pilot

## Status

- State: backlog
- Priority: P2
- Owner: unclaimed
- Branch: `geo/geo-201-verified-relief` (create when claimed)
- Dependencies: source rights, GEO-197; GEO-194 QA locations

## Why and starting evidence

Implement actual physical geography only with verified elevation.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

offline DEM pipeline and MapLibre adapter/style pilot; source/hosting feasibility first, no blanket terrain promise.

## Acceptance criteria

- [ ] Choose an edition with confirmed free distribution rights, acquisition/vertical datum, NoData and hosting limits; register no paid service.
- [ ] Pilot Balkan DEM encoding with known-height/continuity tests at Dinaric/Adriatic sites; Terrarium/Mapbox RGB are not interchangeable.
- [ ] Build readable hillshade/height palette/water separation and legend, with modern-reference labels under historical layers.
- [ ] Optional 3D uses exaggeration 1 by default, labels changes and releases resources; do not claim current globe bump is terrain.

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
