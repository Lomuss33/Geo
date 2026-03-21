# GEO-070 QA and Release

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: `GEO-001`

## Objective

Create the project verification baseline and deployment automation.

## Deliverables

- [x] Unit test suite
- [x] Playwright smoke test scaffold
- [x] GitHub Actions deploy workflow

## Acceptance criteria

- [x] `npm run test` passes
- [x] Workflow builds and deploys the static artifact

## Verification

```bash
npm run test
npm run build
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Workflow defined in `.github/workflows/deploy.yml`.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: Unit tests are green and deploy automation is present.
