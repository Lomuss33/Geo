# GEO-001 Foundation

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: none

## Objective

Scaffold the repo, standardize the Pages build path, and install the development toolchain.

## Deliverables

- [x] Vite + React + TypeScript app scaffolded
- [x] Lint, unit test, and Playwright config added
- [x] GitHub Pages deployment workflow added

## Acceptance criteria

- [x] `npm run build` succeeds
- [x] Pages build targets `/Geo/`

## Verification

```bash
npm run build
npm run lint
npm run test
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Foundation and tooling are in repo root and wired for GitHub Pages.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: Build, lint, and test pass in the implementation session.
