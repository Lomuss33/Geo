# GEO-060 Reliability

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: `GEO-030`, `GEO-040`

## Objective

Add fallbacks and recovery behavior for unsupported or degraded environments.

## Deliverables

- [x] WebGL unsupported fallback
- [x] Texture-load degraded mode
- [x] Reduced-motion-friendly UI behavior

## Acceptance criteria

- [x] Blank-screen failure paths are replaced with visible messaging
- [x] Degraded states are visible in the HUD

## Verification

```bash
npm run lint
npm run build
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Fallback messaging is visible in the main app shell.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: Reliability paths are documented in `MAINTENANCE.md`.
