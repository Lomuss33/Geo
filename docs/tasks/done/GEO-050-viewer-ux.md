# GEO-050 Viewer UX

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: `GEO-040`

## Objective

Finish the user-facing viewer controls and telemetry experience.

## Deliverables

- [x] Preset viewpoints
- [x] Share-link copy flow
- [x] Live telemetry HUD
- [x] Quality selection

## Acceptance criteria

- [x] View presets are visible and trigger transitions
- [x] Share action uses the current URL-encoded view

## Verification

```bash
npm run test
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Presets and HUD are exposed directly in the app shell.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: UX controls are present and labeled.
