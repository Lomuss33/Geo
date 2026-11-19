# GEO-173 Dated imagery source

## Status

- State: backlog
- Owner: unclaimed
- Dependencies: GEO-170, source-specific rights review; no required account/key for end users

## Objective

Connect one licensed imagery source with verified spatial and temporal coverage.

Read `docs/TIME_ATLAS.md` and `docs/PRODUCT.md`.

## Acceptance criteria

- [ ] Document provider terms, CORS, acquisition dates, resolution and geographic coverage.
- [ ] Add acquisition-date precision with a versioned migration; do not substitute nearby dates across coverage gaps.
- [ ] Verify frames and no-data states on desktop/mobile; retain source attribution and declare any required account or key.

## Verification

Implementation not started. Run lint, unit/data tests, production build and browser
checks relevant to the change. Source and license review must be recorded.

## Implementer self-check

- [ ] Scope complete
- [ ] Verification logged

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
