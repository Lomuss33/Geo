# GEO-204 MapLibre attribution security and dependency triage

## Status

- State: review
- Priority: P0
- Owner: Codex
- Branch: `geo/geo-204-renderer-security`
- Dependencies: GEO-190 advisory audit; follow-up to GEO-193
- PR: none; commit/push/PR/publication not requested.

## Why and starting evidence

Resolve a known critical runtime advisory before public release.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

MapLibre adapters and source/attribution boundary, dependency manifest/lock and
security tests; preserve visual/source functionality. Use the documented narrow
upstream backport rather than changing renderer major. Compatible changes to other
advisory chains are split into GEO-206 after actual parent-chain triage.

## Acceptance criteria

- [x] Read GHSA-jrc7-96c5-q579 and trace all external style/TileJSON/custom attribution paths in Headway, Borders and TimeAtlasMap.
- [x] Implement a documented reproducible upstream security backport; do not run audit fix --force or assume no setHTML means no exposure.
- [x] Use regression payloads to verify unsafe attributes/URLs never execute while legitimate required source credits remain available.
- [x] Run existing renderer/style/projection/camera/URL/import checks and state their limits. No real terrain/DEM or physical-device result is claimed.
- [x] Triage remaining npm advisories by runtime/build/dev paths and record lockfile/evidence. Compatible updates are explicitly split into GEO-206 and are not claimed complete here.
- [x] Preserve the renderer major; no renderer replacement or compatibility-changing upgrade was performed.

## Implementation and rollback

Start with one complete small pilot. Preserve existing assets/format decoders and
fallback paths until verified. Split further tasks if this scope cannot be fully
checked. No broad reformat, unapproved data publication or unrelated dependency
major changes.

## Verification

Observed on 2026-11-18, Windows, Node 24.11.1, Vite 8.1.6, MapLibre 5.21.0
with the backport:

| Check                                                                                       | Actual result                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci --ignore-scripts`                                                                   | PASS; deliberately installed original unpatched package for guard checks                                                                                     |
| `npm run verify:security`, `npm run build`, `npm run dev -- --host 127.0.0.1 --port 6004`   | Expected FAIL before patch; all reported missing security backport                                                                                           |
| `npm ci`                                                                                    | PASS; lifecycle applied all five reviewed file patches                                                                                                       |
| `npm run check`                                                                             | PASS; lint, 30 unit files / 232 tests, 8 Node data/security tests, publication guard, TypeScript and Pages build                                             |
| `npm run test:e2e`                                                                          | PASS; all 27 Chromium tests against production `/Geo/`, including attribution, renderer switches, share URLs, camera/playback, theme and atlas import/export |
| `npm run test:security:dev`                                                                 | PASS; 3 attribution entrances through optimized Vite dependencies at `/`                                                                                     |
| `GEO_E2E_FIREFOX=1 npx playwright test tests/attribution-control.spec.ts --project=firefox` | PASS; 1 installed-control DOM fixture, desktop Firefox 146.0.1; not a full map/device run                                                                    |
| `npm run patch:security` with an existing generated-cache probe                             | PASS; idempotent package verification and generated `node_modules/.vite` removed                                                                             |
| Lockfile comparison with entry snapshot                                                     | PASS; no dependency versions changed; exact MapLibre pin and install-script metadata only                                                                    |
| `npm run format`                                                                            | FAIL; same 72 pre-existing warnings; changed-file formatting checked separately                                                                              |
| `npm audit --json`                                                                          | 25 findings: 1 critical, 12 high, 11 moderate, 1 low; version-based MapLibre finding remains despite local mitigation                                        |
| LAN dev restart                                                                             | PASS; `npm run dev -- --host 192.168.0.167 --port 5173`, root HTTP 200 with Vite client                                                                      |

Negative baseline: 8 of the 10 installed-control unit cases failed before the
patch; actual Chromium canaries executed through Headway style, Headway TileJSON
and Borders custom metadata (counters 4, 4 and 3). After the patch, those payloads
are inert and required HTTPS credits remain.

Full Firefox renderer coverage, physical Android Firefox, manual desktop matrix,
geographic topology/DEM validation and performance budgets: NOT RUN. Existing
unit checks are not a complete visual style/terrain matrix. No source-rights or
publication approval is implied. No browser screenshot review was performed for
this nonvisual sanitizer change.

Local logs and command/exit/duration evidence: `.cache/geo-204/`; this task and the
linked audit are the portable summary. Independent verification remains pending.

Final documentation self-check: 26 task-changed files pass targeted Prettier;
76 Markdown documents / 141 local file links contain no missing targets.
`git diff --check` passes. Full-tree formatting debt remains as recorded above.

## Implementer self-check

- [x] Bounded attribution-backport scope complete; remaining package updates split into GEO-206
- [x] Checks and limitations recorded

## Reviewer verification

- [ ] Independent changes review
- [ ] Acceptance criteria confirmed
- Notes: pending; keep review distinct from implementation evidence.

## Handoff

Next: continue [GEO-206](../review/GEO-206-dependency-security.md), capture a fresh
audit, update compatible affected chains and repeat clean-install/check plus
production/dev attribution canaries. Read SECURITY before changing MapLibre or
install hooks. No owner decision blocks ordinary local follow-up. Do not mark
this task done without independent review or publish from these self-checks.

## Implementation decision

See [ADR 002](../../DECISIONS/002-maplibre-security-backport.md) and
[SECURITY](../../SECURITY.md). Pin 5.21.0; apply the upstream attribute snapshot fix
to the source and four non-worker bundles using reviewed original/patched hashes.
`postinstall` applies it, normal npm dev/build/test guard it, and repair clears
only generated Vite dependency cache. Unknown bytes/versions fail closed before
writes. Dependency bundle source-map comments are disabled to avoid stale mappings;
license notices and safe credits are preserved. No package-version advisory is
suppressed or falsely marked absent.

## Reproduced baseline

- Installed control tests before the patch: 8 failed, 2 passed (10 cases).
- Chromium production canaries before patch executed locally through Headway style,
  Headway TileJSON and Borders custom metadata (counters 4, 4 and 3).
- After patch: targeted 10 unit checks and complete clean-install, unit/Node,
  production Chromium, dev-app and Firefox DOM checks passed as recorded above.
- `npm explain` and source search established the remaining chains. Current audit
  metadata reports 25 findings, not the old 20; no dependency versions changed.
  See [the triage](../../audits/GEO-204-attribution-security.md). GEO-206 owns
  compatible follow-up dependency updates.
