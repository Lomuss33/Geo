# GEO-115 Startup flight brief

- Owner: Codex
- Branch: `geo/geo-115-startup-popup`
- Dependencies: existing onboarding and GEO-095 verification foundation.
- Scope: user-requested startup popup repair; no studio features.
- Assumption: repair overflow and dismissal/accessibility of the Flight brief.

## Acceptance criteria

- [x] Content scrolls within short viewports; entry button remains reachable.
- [x] Concise introduction retains the control reference.
- [x] Dialog focuses its entry button, traps Tab, and dismisses with Escape.
- [x] Dismissal uses the existing persistence path; Help can reopen the brief.

## Implementer verification

- `npm run lint`: passed.
- `npm run build`: passed (existing large-chunk warning).
- `npm run test`: 195 passed, four timeouts during concurrent browser checks.
- `npm run test -- --maxWorkers=2`: all 199 tests passed.
- `npm run test:e2e`: Chromium, 15 passed including the new short-screen
  popup regression; one failed in geography search URL focus (`focus=HRV`).
- `npx playwright test --last-failed`: the same geography URL assertion failed
  again. That path primes onboarding as dismissed and is outside this repair.
- New browser coverage checks 375 � 500 button bounds, initial focus, Tab and
  Shift+Tab containment, Escape dismissal, and persistence after reload.
- No manual screenshot verification or independent review claimed.

## Reviewer verification

Pending independent review.
