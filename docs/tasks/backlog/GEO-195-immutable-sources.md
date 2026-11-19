# GEO-195 Pin modern boundary inputs and attribution

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-195-immutable-sources` (create when claimed)
- Dependencies: GEO-190 data policy; before any new boundary generation

## Why and starting evidence

Make modern data builds reproducible and reviewable.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

scripts/borders/\_shared.mjs, ingest/cache modules, data/catalog/, source tests; do not rebuild the 100MB runtime bundle incidentally.

## Acceptance criteria

- [ ] Inventory current gbOpen/Natural Earth/World Bank inputs and stored provenance; do not replace current geometry as discovery.
- [ ] Use immutable source editions/revisions, SHA-256 and deterministic build inputs instead of /current and master.
- [ ] Retain per-source usage evidence, attribution, IDs, years, units and missingness; reject hash mismatch before output.
- [ ] Provide offline manifest tests and an explicit opt-in ingest command with no CI bulk network downloads.

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
