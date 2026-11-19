# GEO-199 Historical identity evidence and temporal resolution

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-199-historical-claims` (create when claimed)
- Dependencies: GEO-190 policy, existing atlas v1; coordinate GEO-197

## Why and starting evidence

Define honest shared historical contracts before curated expansion.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

src/lib/timeAtlas.ts adapters and new domain contracts/tests; preserve schema v1 behavior, do not force modern ISO/QID identity.

## Acceptance criteria

- [ ] Separate entity identity, original source record, geometry, names, interpretation and political/jurisdiction relations.
- [ ] Preserve original temporal assertions/calendar/precision and source-specific interval inclusion, with explicit astronomical-year v1 adapters and no historical year zero.
- [ ] Resolver distinguishes snapshots, claimed intervals, approximate/disputed/unknown states, partial coverage and modern references.
- [ ] Version new formats, preserve user v1 files and demonstrate gaps/alternatives without inferred polygons or boundary morphing.

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
