# GEO-190 Project constitution and reality audit

## Status

- State: review
- Priority: P0
- Owner: Codex
- Branch: `geo/geo-190-project-foundation`
- Parent: owner-constitution foundation campaign
- Dependencies: owner master prompt; existing GEO-090/095/100/110/170/180 work
- PR: none; commit/push/PR/publication not requested.

## Why and current evidence

Owner direction: PRODUCT_VISION. Audited HEAD: `6414025aee75c2d967a092e581a8734a375e71fc`
plus the preserved dirty tree. See [the reality audit](../../audits/GEO-190-reality-check.md).
Source/licensing claims, research assertions and actual checks are distinct.

## Scope

Documentation and a narrowly scoped cache-lint ignore. Child increments GEO-191/192/193 share this foundation campaign branch; no mass renderer/store rewrite.

## Acceptance criteria

- [x] Inspect local/public HEAD, dirty work, lockfile, CI and source implementation before changes.
- [x] Preserve the existing task workflow and uncommitted files; no commit/push/PR/deploy.
- [x] Add canonical owner vision, status, data/design policy, inventory, decisions and executable backlog.
- [x] Reconcile README, architecture, QA and maintenance without claiming target features are implemented.
- [x] Run baseline and final checks, record existing debt, legal/security blockers and exact next work.

## Verification

Final verification on 2026-11-16, Windows / Node 24.11.1, Vite 8.1.6:

- `npm ci`: passed after a package-lock-only optional-dependency repair. The first
  post-update attempt failed on a missing @emnapi/runtime record; actual clean
  installation was repeated successfully, not replaced by a dry-run claim.
- `npm run check`: passed after that clean install: lint, 29 unit files / 222 tests,
  4 data/publication tests, source publication guard, TypeScript and Pages build.
- `npm run test:e2e`: all 23 Chromium tests passed after the clean install against
  the `/Geo/` production preview (69.2 seconds).
- `npm run test:history:research`: 2 local research fidelity/date/license tests
  passed. They are optional and do not establish rights or historical accuracy.
- `npm run build:history`: expected rejection before download/output; blocked
  public and dist paths absent. All five preserved research file hashes still
  match the entry snapshot.
- Node/Vite default-dev probe: strict port 6003, `/` HTTP 200, both direct and
  `/@fs/` cache probes HTTP 403. Server closed after this check.
- `npm audit --json`: 20 remaining findings (1 critical, 5 high, 13 moderate, 1 low),
  down from 25 at baseline; Vite is no longer flagged, MapLibre remains critical.
- `npm run format`: 72 legacy file warnings remain (83 at baseline). Changed-file
  formatting and local documentation links are checked separately; no mass
  geometry/code reformat was performed.
- Reviewed Chromium screenshots at 1600x900 Earth and 320x568 atlas; compared
  with preserved baseline evidence. Real Android Firefox/manual browser matrix,
  geographical topology/DEM accuracy and performance budgets: NOT RUN.

Logs are local in `.cache/geo-190-final/`; this task summary is the portable
record. No new remote CI run, commit, push, PR or deployment was performed.

## Rollback and compatibility

Reverse only this increment's changes; preserve the audited dirty tree and all
private browser data. The entry snapshot is an ignored local ZIP, not permission
to reset unrelated files. Restoring a source quarantined for rights needs review;
do not bypass that gate merely to restore a previous UI.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged

## Reviewer verification

- [ ] Changes inspected independently
- [ ] Acceptance criteria confirmed
- Notes: pending; no reviewer verification claimed.

## Handoff

Update STATUS and TASKBOARD after checks. Prioritize GEO-204 renderer security;
then GEO-194 regression/device evidence and GEO-195 immutable modern sources.
