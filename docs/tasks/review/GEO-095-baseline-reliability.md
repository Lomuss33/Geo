# GEO-095 Restore the verification baseline

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-095-baseline-reliability`
- Parent: studio roadmap
- Dependencies: none

## Objective

Resolve existing lint and test failures before adding studio behavior.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [x] Declare Node globals for scripts/borders/\*.mjs in ESLint.
- [x] Resolve BordersLegend effect-state and BordersMap asynchronous callback lint errors without disabling rules broadly.
- [x] Preserve the GEO-090 baseline of 174 passing tests and a successful production build.

## Acceptance criteria

- [x] npm run check exits successfully.
- [x] Changed Borders interactions retain their behavior; run E2E when behavior changes.
- [x] Record remaining warnings and exact verification output.

## Verification

Commands run:

```text
npm run lint
npx vitest run src/components/BordersLegend.test.tsx --reporter=verbose
npm run check
npm run test:e2e
```

- Final `npm run check`: passed, including lint with zero errors/warnings,
  23 unit/component test files with 178 passing tests, TypeScript, and Pages build.
- Four new legend regressions cover hierarchy without fetching, superseded request
  failures, clearing profile errors, and late metric responses after switching.
- An initial regression-test hook accidentally returned the mocked loader; Vitest
  treated it as hook cleanup and invoked it. Corrected the hook to return nothing;
  the final complete unit suite passed.
- `npm run test:e2e`: all 13 Chromium tests passed in 33.5 seconds using the
  repository configuration, including Borders profile switching and URL restoration.
- Remaining build warnings: existing approximately 2.36 MB minified JavaScript
  bundle / 650 KB gzip, and Vite plugin timing. No lint warnings remain.

Implementation uses profile-keyed legend state and effect-event map callbacks,
plus an identity guard against completing map initialization after cleanup. Build
script globals are declared only for `scripts/**/*.mjs`; no rules are disabled.
No data/assets/dependencies were regenerated. Formatting and diff whitespace checks passed. Manual Edge/Firefox verification
was not performed.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: implementation and regression checks complete; preparation changes from
  GEO-090 remain uncommitted alongside this task, as requested by the workflow.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: independent review pending; do not mark done without reviewer evidence.
