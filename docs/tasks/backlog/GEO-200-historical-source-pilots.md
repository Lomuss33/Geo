# GEO-200 Reviewed historical source pilots and coverage matrix

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-200-historical-source-pilots` (create when claimed)
- Dependencies: GEO-199 and source-specific rights; coordinate GEO-191

## Why and starting evidence

Replace publication assumptions with a defensible historical demonstrator.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

data/catalog/, offline source adapters, small vetted sample packages and docs; no paid provider or end-user account.

## Acceptance criteria

- [ ] Resolve Historical Basemaps component rights or retain hold; independently evaluate Cliopatria, HistoGIS and AWMC pinned inputs and terms.
- [ ] Prioritize documented 117/200, 1350, 1530, 1900 and 1938 cases only where sources support them; preserve full polity extents.
- [ ] Keep HistoGIS record/date/area discrepancies, AWMC lines vs polygons and Ottoman names without geometry explicit.
- [ ] Produce region/time/theme coverage matrix, licenses, transformations, source-fidelity and historical review evidence before packaging.
- [ ] No bulk ingestion or interpolation across unsupported epochs; NC/ODbL/GPL questions remain source-specific.

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
