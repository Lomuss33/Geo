# GEO-198 Geographic focus and camera handoff contract

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-198-geographic-view-intent` (create when claimed)
- Dependencies: GEO-194

## Why and starting evidence

Preserve meaningful focus/scale across renderers instead of crude camera resets.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

src/lib/modeBridge.ts, bordersBridge.ts, navigation/application modules and tests; preserve old URL decoders.

## Acceptance criteria

- [ ] Define GeographicViewIntent separately from Three/MapLibre camera state with documented scale/orientation tolerances.
- [ ] Test close-zoom and global roundtrips, heading/tilt limitations, antimeridian and legacy view URLs.
- [ ] Preserve usable fallback on failed renderer switch and avoid two permanently active heavy mobile scenes.
- [ ] Document unavoidable projection differences rather than claiming mathematically exact equivalence.

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
