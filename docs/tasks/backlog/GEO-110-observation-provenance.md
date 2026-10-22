# GEO-110 Observation years and provenance

## Status

- State: backlog
- Owner: unclaimed
- Branch: `geo/GEO-110-observation-provenance` (create when claimed)
- Parent: studio roadmap
- Dependencies: GEO-095

## Objective

Make existing GDP/population observations trustworthy inputs for comparisons and exports.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [ ] Versioned observation schema, runtime validation, source metadata, and missing-value reasons.
- [ ] Update scripts/borders/build-metrics.mjs to preserve selected record dates and retrieval metadata.
- [ ] Migrate consumers and fixtures; expose years and mixed-year/common-year policy.

## Acceptance criteria

- [ ] Numeric observations retain country, indicator, value, unit, source, year, and version.
- [ ] Unavailable values remain null; no-data differs from zero.
- [ ] Mixed-year data cannot silently produce same-year ranking claims.
- [ ] Offline fixtures cover differing years, missing data, invalid records, and existing profile compatibility.

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
