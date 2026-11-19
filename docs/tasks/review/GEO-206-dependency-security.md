# GEO-206 Compatible dependency advisory maintenance

## Status

- State: review
- Priority: P1, before new public release
- Owner: Codex
- Branch: `geo/geo-206-dependency-security`
- Entry HEAD: `6414025aee75c2d967a092e581a8734a375e71fc` plus 96 inherited dirty/untracked files, preserved with hashes in ignored `.cache/geo-206/entry-work.zip` and `entry-manifest.json`.
- Dependencies: GEO-204 integrity-locked MapLibre backport; preserved unchanged.
- PR: none; no commit, push, publication or independent review performed.

## Evidence and implementation

Fresh baseline audit: 25 affected-package findings, matching GEO-204's last
report. After compatible updates: 13 (1 critical, 12 high), with only two root
advisory IDs. Production-only audit: MapLibre alone. See the complete
[version ledger and reachability audit](../../audits/GEO-206-dependency-maintenance.md)
and [SECURITY](../../SECURITY.md). No advisory is suppressed.

Only two root ranges change: Vitest `^4.1.12`, TypeScript-ESLint `^8.73.0`.
Reviewed 59 changed package records: 57 updates plus 2 new development children;
the root lock record mirrors those two ranges. Runtime-transitive changes are
fflate 0.8.2 to 0.8.3, fflate 0.6.10 to 0.6.11 and protobuf schema 3.6.0 to 3.6.1.
TypeScript-ESLint 8.73 declares minimatch ^11.0.1, so the nested major change is
within its parent contract, not a forced override. No existing license metadata
changed; new dev-only children and included notices are documented in THIRD_PARTY.

MapLibre, its patch specification/installer/tests, Vite, React/React DOM,
Three/R3F/drei, Playwright, TypeScript, ESLint and jsdom package records stay
unchanged. No `audit fix`, overrides, untested direct major upgrade, renderer
replacement, geometry regeneration or historical publication.

## Acceptance criteria

- [x] Capture fresh audit/outdated/lock evidence; distinguish metadata changes from actual version changes.
- [x] Update explicit affected chains within compatible ranges, review every lock change and preserve MapLibre version/hash/entrypoint guards.
- [x] Re-audit production versus dev paths and the separate Node runtime; record remaining root findings and concrete follow-up in GEO-207.
- [x] Observe clean install applying the backport, full check, production renderer/URL/import/security E2E and dev attribution canaries.
- [x] Report remaining findings and verification limits honestly, with implementer evidence separate from independent approval.

## Verification

Observed 2026-11-18, Windows / Node 24.11.1 / Vite 8.1.6 / Playwright 1.58.2:

| Command/check                                                                               | Actual result                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm audit --json`, `npm outdated --json`, `npm outdated --all --json` at entry             | Captured fresh registry evidence; audit 25 (1 critical / 12 high / 11 moderate / 1 low)                                                             |
| Explicit lock-only runtime and tooling update commands                                      | PASS; exact commands and all 59 changed records in the linked audit                                                                                 |
| `npm ci --no-audit --no-fund`                                                               | PASS (33.5s); 357 installed packages, all five MapLibre patches applied                                                                             |
| `npm run check`                                                                             | PASS (34.0s); lint, 30 unit files / 232 tests, 8 Node data/security tests, publication guard, TypeScript and Pages build                            |
| Initial `npm run test:e2e`                                                                  | FAIL (131.7s); 26 passed, one ultrawide editor width assertion measured 2544px instead of <=840px                                                   |
| Unchanged ultrawide diagnostic, `--repeat-each=3 --trace=on`                                | PASS (39.7s); all three repetitions, no app/CSS/test change                                                                                         |
| Final `npm run test:e2e -- --trace=retain-on-failure`                                       | PASS (94.4s); all 27 Chromium checks against production `/Geo/`                                                                                     |
| `npm run test:security:dev`                                                                 | PASS (6.8s); all 3 actual app attribution entrances through optimized Vite dependencies at `/`                                                      |
| `GEO_E2E_FIREFOX=1 npx playwright test tests/attribution-control.spec.ts --project=firefox` | PASS (12.4s); 1 Firefox 146.0.1 installed-control DOM fixture, not a full Firefox map/device run                                                    |
| Final `npm audit --json`                                                                    | 13 affected packages (1 critical / 12 high); only MapLibre and picomatch root IDs                                                                   |
| `npm audit --omit=dev --json`                                                               | 1 critical upstream MapLibre version finding; local backport remains independently verified                                                         |
| `npm explain` affected and new packages                                                     | PASS; actual resolved parent ranges captured, including minimatch 11 allowed by TypeScript-ESLint 8.73                                              |
| `npm run format`                                                                            | FAIL (16.5s); exactly the same 72 warning files as GEO-204, no new warning files                                                                    |
| Targeted Prettier / documentation links / `git diff --check`                                | PASS; 14 changed files, 78 Markdown documents / 151 local file links with no missing targets, whitespace check clean                                |
| Final scope check                                                                           | PASS; all 84 inherited files outside this task scope byte-identical; only the two intended manifest ranges and 59 reviewed package versions changed |
| LAN development restart                                                                     | PASS; `npm run dev -- --host 192.168.0.167 --port 5173`, Vite 8.1.6 ready, HTTP 200 with Vite client; no other process stopped                      |

The initial ultrawide failure remains evidence, not a declared fixed bug. Source
CSS, workspace component and smoke test were byte-identical to entry; emitted
CSS filename/size also matched GEO-204. Three unchanged repetitions and the full
final run passed, but the cause is unconfirmed. GEO-194 owns stable
readiness/layout investigation. No retries or relaxed assertions were added.

An earlier combined verification session and the first full rerun lost their
execution sessions without final results. The completed check was retained;
partial browser runs were not counted as passes. Processes/logs were inspected
before resuming, and the final commands above completed with recorded exit codes.

Full Firefox renderer/manual desktop matrix, physical Android Firefox,
geographic topology/DEM accuracy and performance budgets: NOT RUN. No new
screenshot review, remote CI success or source-rights/publication approval is
claimed. Existing large-bundle warnings remain separate performance work.

Machine logs, audit JSON, parent chains, lock comparisons and failed-run evidence
are ignored in `.cache/geo-206/`; this task and the linked audit are the portable
record. The implementation required no new test files; existing contract,
security and renderer checks cover the maintenance increment.

## Remaining security and rollback

picomatch has no published fixed version at this audit; 12 high reports propagate
that dev chain. MapLibre's version report remains with its known local upstream
fix. Node 24.11.1 includes Undici 7.16.0 / OpenSSL 3.5.4 and was not upgraded by npm
undici 7.30.2. GEO-207 records a verified project-scoped same-line Node pilot and
upstream glob follow-up; no global executable/PATH/other project was changed.
A MapLibre major migration needs separate compatibility evidence before removing
the backport. No owner decision blocks ordinary local regression work.

If a regression requires rollback, restore only this increment's manifest/lock
changes from the entry snapshot, keeping inherited work, user files and the
GEO-204 patch. Do not reset/stage the whole dirty tree or silently restore a
vulnerable package for release. Treat older dependency versions as a diagnostic
fallback with the security gate still open.

## Implementer self-check

- [x] Bounded compatible-update scope complete; remaining root findings tracked in GEO-207
- [x] Actual checks, initial failure and unverified limits recorded

## Reviewer verification

- [ ] Independent changes review
- [ ] Acceptance criteria confirmed
- Notes: pending. State remains review, not done or publication-approved.

## Handoff

Follow-up [GEO-194](GEO-194-regression-matrix.md) now has a verified renderer and
six-viewport Chromium/Firefox matrix, an independent editor-width cap and saved
Geo frame repairs; the original intermittent width trigger remains unconfirmed.
Real Android evidence remains unavailable until a device is actually tested.
GEO-205 follows for storage failures. Keep GEO-207's release security work explicit;
no automatic scheduler, merge or publishing is configured.
