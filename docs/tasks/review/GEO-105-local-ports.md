# GEO-105 Local development ports

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-105-local-ports`
- Parent: user-requested development configuration
- Dependencies: none

## Objective

Move local server defaults into the 6000 range while retaining Pages paths.

## Deliverables and acceptance criteria

- [x] Development defaults to 6000; preview and browser tests use 6001.
- [x] Servers fail clearly when the chosen port is occupied.
- [x] README documents ports and Chromium's restriction on 6000 with a CLI override.
- [x] URL test fixtures use the new development port.
- [x] Verify resolved defaults, HTTP startup, lint, tests, build, and browser tests.

## Verification

Commands and evidence:

- Vite `createServer({ mode: 'local-dev' })` with Node HTTP request: returned
  HTTP 200 on `127.0.0.1:6000`; resolved dev/preview ports were 6000/6001,
  both with strict port selection. Server closed after the check.
- The initial Node Fetch request rejected 6000 as a restricted port; HTTP server
  verification therefore used `node:http`. No browser restriction was disabled.
- `npm run check`: passed; lint clean, 25 test files / 189 tests passed,
  TypeScript and Pages build passed. Existing bundle-size/timing warnings remain.
- `npx prettier --check` on changed files and `git diff --check`: passed.
- `npm run test:e2e`: all 15 Chromium tests passed in 48.5 seconds against
  preview port 6001.

No application UI behavior changes. README links the Chromium source restriction
and documents the explicit `--port 6001` development override.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: independent review pending.

## Superseded development default

GEO-193 replaces browser-blocked dev port 6000 with 6003. Preview remains 6001;
the later E2E isolation uses 6002. Historical evidence above is retained, not a
recommendation to bypass browser safety restrictions.
