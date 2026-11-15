# GEO-110 Observation years and provenance

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-110-observation-provenance`
- Parent: studio roadmap
- Dependencies: GEO-095

## Objective

Make existing GDP/population observations trustworthy inputs for comparisons and exports.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [x] Versioned observation schema, runtime validation, source metadata, and missing-value reasons.
- [x] Update scripts/borders/build-metrics.mjs to preserve selected record dates and retrieval metadata.
- [x] Migrate consumers and fixtures; expose years and mixed-year/common-year policy.

## Acceptance criteria

- [x] Numeric observations retain country, indicator, value, unit, source, year, and version.
- [x] Unavailable values remain null; no-data differs from zero.
- [x] Mixed-year data cannot silently produce same-year ranking claims.
- [x] Offline fixtures cover differing years, missing data, invalid records, and existing profile compatibility.

## Verification

Before integration: reviewed the GEO-105 commit; `npm run check` passed with
189 tests and `npm run test:e2e` passed with 15 Chromium tests. Local main was
fast-forwarded to 7aa6bb6, then GEO-110 was implemented on its own branch.

GEO-110 verification:

- `node scripts/borders/build-metrics.mjs`: regenerated only GDP/population JSON
  from existing cached responses, without network refresh or boundary generation.
- Compared ISO/value pairs in both generated datasets against HEAD: all 232
  country records per profile retained the same numeric values and missing values.
- `npm run check`: lint clean, 26 test files / 199 tests passed, one offline Node
  builder test passed, TypeScript and production build passed.
- `npm run test:e2e`: all 15 Chromium tests passed in 54.7 seconds.
- Added contract tests for shipped assets, zero versus null, missing/invalid years,
  duplicate IDs, future versions, metadata consistency, legacy migration, per-record
  provenance and same-year eligibility. Legend tests cover mixed-year warnings,
  sources, focused years and unavailable countries.
- Existing large-bundle warning remains; no rules disabled.
- Source timestamps are explicitly cache-file modification times, not newly
  verified download times. Existing World Bank values were not refreshed.
- No MP4/PNG/CSV export or historical time-series feature is claimed.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: implementation complete; formatting, relative documentation links and
  diff whitespace checks passed. Original values unchanged.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: independent reviewer verification pending; task remains in review.
