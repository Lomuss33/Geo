# GEO-130 Selected CSV and GeoJSON exports

## Status

- State: backlog
- Owner: unclaimed
- Branch: `geo/GEO-130-data-exports` (create when claimed)
- Parent: studio roadmap
- Dependencies: GEO-120

## Objective

Export the exact selected observations and geographic features with provenance.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [ ] Browser downloads for CSV observations and WGS84 GeoJSON features.
- [ ] Stable column/property definitions and documented null/formula-safety behavior.
- [ ] Coverage feedback, attribution, and selected-feature-only export.

## Acceptance criteria

- [ ] Exports retain source URLs, observation years, units, and dataset/geometry provenance.
- [ ] CSV quoting covers commas, quotes, newlines, Unicode, nulls, and formula-like text.
- [ ] GeoJSON uses longitude/latitude, stable IDs, valid geometry, and explicit missing-feature reporting.
- [ ] Tests inspect downloaded content and confirm no unintended full-world export.

## Verification

Not run; implementation has not started. Required: `npm run check` and
`npm run test:e2e` for interaction/UI changes. Add focused contract/regression
tests and manual export inspection where the criteria require them.

## Implementer self-check

- [ ] Scope complete
- [ ] Verification logged
- Notes: pending implementation.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: pending review.
