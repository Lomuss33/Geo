# GEO-100 Geographic scopes and country search

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-100-geographic-scopes`
- Parent: studio roadmap
- Dependencies: GEO-095

## Objective

Introduce Balkans, Europe, and World as geographic collections independent of rendering mode.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [x] Versioned scope definitions and per-source country-ID aliases in a dedicated domain module.
- [x] Explicit Europe membership policy and proposed Balkans collection from PRODUCT.md.
- [x] Country search, coverage indicators, scope selector, and mode-appropriate camera framing.

## Acceptance criteria

- [x] Every configured ID resolves or is explicitly unavailable, including Kosovo aliases.
- [x] Switching scopes preserves rendering mode and valid selection; handles out-of-scope selections explicitly.
- [x] Search handles country names and aliases; keyboard selection works.
- [x] Unit tests cover membership/aliases and E2E covers Balkans search and scope changes.

## Verification

Final verification on 2026-10-19:

```text
npm run check
npm run test:e2e
npx prettier --check <changed Markdown and source files>
git diff --check
```

- `npm run check`: passed. Lint clean; 25 test files and 189 tests passed;
  TypeScript and GitHub Pages production build passed.
- `npm run test:e2e`: all 15 Chromium tests passed in 43.8 seconds, using the
  repository's software-rendering configuration and Pages base path.
- New tests cover membership and identity aliases, missing-outline behavior,
  search normalization, selection retention/clearing, native keyboard activation,
  frozen navigation controls, mode preservation, and the globe surface-anchor
  transition. Existing Borders URL/profile restoration and animation tests pass.
- Changed source/document formatting and diff whitespace checks passed; relative
  documentation links verified by Python.
- Collaborative browser inspection of the explorer exposed a close-zoom framing
  bug. It is fixed and confirmed by both controller simulation and Chromium
  telemetry assertions. The explorer is memoized with a stable navigation callback
  so viewer telemetry does not rerender the full country list each frame.
- Earlier E2E runs exposed a smoke-test setup that dismissed onboarding and then
  expected it to appear. Removed that contradictory setup. A test-only import of
  world-atlas JSON was also removed from Playwright's Node-side test module.
- Existing bundle-size warning remains: about 2.36 MB minified / 652 KB gzip.
  Some build runs also report plugin timing warnings. No lint rules suppressed.
- No new dependencies, boundary-asset regeneration, commit, push, or PR.

## Scope and limitations

Membership and source policy are documented in `docs/GEOGRAPHIC_SCOPES.md`.
The catalog corrects Italy/Bangladesh display names without rewriting upstream
assets. Kosovo remains selectable with explicit missing low-resolution outline
coverage; its camera is unchanged. Metric coverage is not inferred from geometry.
Explorer scope/selection are session state; portable scope URLs belong to GEO-120.
Camera framing is approximate and uses existing whole-country geometry.
Manual Edge/Firefox validation was not performed.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: implementation complete with passing checks and documented coverage limits.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: independent review pending; leave in review until reviewer evidence exists.
