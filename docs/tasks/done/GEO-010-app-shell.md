# GEO-010 App Shell

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: `GEO-001`

## Objective

Create the full-screen cinematic shell, HUD, onboarding, and responsive layout.

## Deliverables

- [x] Full-screen app layout
- [x] Modern HUD styling and typography
- [x] Onboarding overlay and fullscreen entry point

## Acceptance criteria

- [x] Desktop layout is readable and usable
- [x] Mobile widths do not collapse the interface

## Verification

```bash
npm run build
npm run test
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: UI shell lives in `src/app/App.tsx` and `src/styles/global.css`.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: Layout is responsive and onboarding is keyboard reachable.
