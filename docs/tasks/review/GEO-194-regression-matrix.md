# GEO-194 Renderer and geographic regression matrix

## Status

- State: review (implementer evidence complete; independent review pending)
- Priority: P1
- Owner: Codex
- Branch: `geo/geo-194-regression-matrix`
- Entry: HEAD `6414025` plus 98 inherited dirty/untracked files preserved with hashes in ignored `.cache/geo-194/entry-work.zip` and `entry-manifest.json`.
- Dependencies: GEO-190/192; coordinate with GEO-204

## Why and starting evidence

Expand existing Playwright/camera tests without replacing the renderers.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

GEO-206 found an intermittent ultrawide editor-width assertion: one initial
production run measured 2544px where <=840px is required; the unchanged test then
passed three diagnostic repeats and a complete 27-test rerun. Source
CSS/component/test files and the emitted
CSS filename were unchanged. The cause is unconfirmed, not declared fixed by a
retry. Preserve this case while expanding stable readiness/layout checks; see
[GEO-206 evidence](../review/GEO-206-dependency-security.md).

## Scope and ownership

Regression tests/fixtures and the minimal renderer startup, saved-frame and editor
readiness repairs they exposed. Shared source assets and the MapLibre security
backport are unchanged; no boundary regeneration. Dependency recovery is limited
to the compatible Fiber 9.8.2 pin and its reviewed transitive changes.

## Acceptance criteria

- [x] Exercise Geo/Headway/Borders, outline compare, animations, renderer fallback and legacy URLs under / and /Geo/.
- [x] Cover 320x568, 390x844, 844x390, 1024x768, 1440x900 and larger desktop with theme and keyboard checks.
- [x] Establish source-tied geographic fixtures for Neum/Dubrovnik, islands, Brcko, Sava/Drina/Una, Neretva/Busko jezero and antimeridian; distinguish supported checks from pending geometry precision.
- [x] Add available Firefox desktop checks; record real Android Firefox as NOT RUN until actually tested on a device.

## Implementation and rollback

The pilot exposed uncaught renderer initialization failures. Geo now has a scene
error boundary and commit-time readiness notification; both MapLibre adapters
catch construction failures. The fallback card leaves the control shell usable.
The editor is independently capped at 840px and cannot open before its active
renderer is ready. Saved Geo frames bypass startup refitting and rotation
re-solving; malformed Geo URL values are rejected before startup restoration.

Rollback only this increment relative to the entry archive; preserve inherited
work, data and the exact MapLibre backport. Restore Fiber and its lock entries
together for a diagnostic rollback, which reintroduces the observed failure path.
No source assets, original format versions or historical claims were changed.

## Verification

Full implementation/browser runs completed on 2026-11-18; handoff and restored
LAN visual probe are 2026-11-19. Chromium 145.0.7632.6 uses SwiftShader;
Firefox 146.0.1 reports WebGL 2/AMD ANGLE. Commands, initial failures, fixture
limits and source pins are in [the audit](../../audits/GEO-194-regression-matrix.md).

| Check                                                                                             | Observed result                                                                                                              |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --no-audit --no-fund`                                                                     | PASS, 46.2s; all five MapLibre patches applied                                                                               |
| `npm run check`                                                                                   | PASS, 25.9s: lint, 33 unit files / 256 tests, 8 Node tests, publication guard, TypeScript and Pages build                    |
| `npm run test:e2e -- --trace off --reporter=line --max-failures=1`                                | PASS, all 47 production Chromium cases, 148.2s                                                                               |
| `GEO_MATRIX_DEV=1 npm run test:e2e:matrix -- --trace off --reporter=line --max-failures=1`        | PASS, 40 root-path Chromium/Firefox cases, 173.9s                                                                            |
| `npm run test:e2e:matrix -- --project=firefox --trace off --reporter=line --max-failures=1`       | PASS, 20 Pages Firefox cases, 61.8s                                                                                          |
| `npm run test:security:dev -- --trace off`                                                        | PASS, 3 optimized-dependency attribution cases, 6.2s                                                                         |
| `GEO_E2E_FIREFOX=1 npm run test:e2e -- attribution-control.spec.ts --project=firefox --trace off` | PASS, 1 Firefox attribution DOM case, 11.7s                                                                                  |
| Geography                                                                                         | 8 source-hash/country-scale cases pass; all six named fine-geometry reviews remain GEO-195/GEO-196                           |
| LAN restart and visual probe                                                                      | PASS, HTTP 200 / ready Geo / light theme; no page or console errors on 2026-11-19                                            |
| Formatting, local links and preservation                                                          | 32 changed files pass targeted Prettier; 82 Markdown documents / 163 local links pass; diff whitespace and scope checks pass |

The original intermittent width cause remains unconfirmed; the independent cap
passes a controlled full-width fault and four cold-open/resize cycles in both
browsers. A traced Borders load exceeded its unchanged 10s deadline despite HTTP
200 tiles; normal complete runs pass. That slow-load evidence remains a GEO-203
performance limit. No retries are hidden; the audit records all initial failures.

The full-tree `npm run format` check still fails on 65 legacy files, down from
72 with no new warning files. Only the seven already-touched source files were
removed from that warning set. All 83 inherited files outside this task scope are
byte-identical; public boundary assets are unchanged and blocked history assets
remain absent from public/dist. Detailed local preservation evidence is in
`handoff-verification.json` under the ignored task cache.

Visual self-check covers mobile viewer/editor, short-landscape and desktop editor,
plus the restored LAN light viewer. Short-height editing still uses scrolling;
density/full touch-target work remains GEO-202. Real Android Firefox, native zoom,
actual soft keyboard/safe areas, remote Headway availability and performance
budgets are NOT RUN. This does not clear source-rights or security release gates.

Ignored `.cache/geo-194/` retains entry hashes, logs, traces and screenshots.
`final-checks.json` records successful final command exits/durations; failed and
interrupted runs are separate. No independent review or remote CI is claimed.

## Implementer self-check

- [x] Bounded scope complete; physical-device and precision limits remain explicit
- [x] Checks and limitations recorded, including inherited formatting debt

## Reviewer verification

- [ ] Independent changes review
- [ ] Acceptance criteria confirmed
- Notes: pending; keep review distinct from implementation evidence.

## Handoff

Next local task: [GEO-205 storage resilience](../backlog/GEO-205-storage-resilience.md).
Inspect branch/dirty work, read its acceptance criteria, then inject denied reads,
denied/quota writes and corrupt drafts before changing persistence. Preserve all
old keys/formats and unsaved work. No owner decision blocks that local task.

Keep GEO-207 residual security, GEO-195/196 source/topology and physical Android
evidence separate. To restore the local preview, verify the listener/interface,
then run `npm run dev -- --host 192.168.0.167 --port 5173`. Do not commit, push,
publish or claim independent approval without the corresponding request/evidence.
