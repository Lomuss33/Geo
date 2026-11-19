# GEO-190 reality check — 2026-11-16

Maintainer: Codex, local self-check. No independent review, push or deployment.

## Repository observed

- Entry branch: `geo/geo-180-monochrome-ui`; work branch:
  `geo/geo-190-project-foundation`.
- Local HEAD: `6414025aee75c2d967a092e581a8734a375e71fc` (GEO-110), two commits
  ahead of observed public main `877a6c5233f72198c9bdac7b9ec1c6df4c60c02e`.
- Entry tree already contained viewer/UI/atlas/pilot changes: 45 changed or
  untracked files. Byte/hash snapshot and ZIP preserved under ignored
  `.cache/geo-190-baseline/`. Do not reset or broadly stage this tree.
- `AGENTS.md` already exists, contrary to the older research snapshot. Updated
  it rather than creating a competing workflow. Package lock was present and
  unchanged by the successful baseline `npm ci`.
- GitHub repository API confirms public repo, default `main`, Pages enabled,
  zero open PRs at inspection. No branch protections or live page content audited.

Latest observed [Deploy Geo run](https://github.com/Lomuss33/Geo/actions/runs/39073350359)
failed at **Lint**; tests/build/deploy were skipped. A prior run for the same
public SHA succeeded. Neither result verifies the newer local working tree or
proves that the currently served Pages site matches it.

## Baseline actually run before behavior changes

Windows / PowerShell / Node 24.11.1, lockfile dependencies; Playwright desktop
Chromium using SwiftShader and the `/Geo/` production preview.

| Command                                              | Result                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm ci`                                             | PASS after stopping this repo's Vite process; initial attempt hit a Windows locked native binding |
| `npm run lint`                                       | PASS                                                                                              |
| `npm run test`                                       | PASS: 29 files, 223 tests                                                                         |
| `npm run test:data`                                  | PASS: 1 metric-builder test                                                                       |
| `npm run build`                                      | PASS; large bundle/plugin-timing warnings                                                         |
| `npm run format`                                     | FAIL: pre-existing formatting warnings in 83 files                                                |
| `npm run test:e2e`                                   | PASS: 23 Chromium tests                                                                           |
| `npm audit --json`                                   | 25 advisories: 1 critical, 10 high, 13 moderate, 1 low; detailed local report retained            |
| Real Android Firefox / Windows Firefox / manual Edge | NOT RUN                                                                                           |

Local logs and baseline screenshots are in `.cache/geo-190-baseline/`; this
summary is the portable evidence, not a promise those local files survive cloning.
One exploratory lint run encountered the agent's temporary unpacked backup because
ESLint did not ignore `.cache/`; the backup was verified into ZIP before the real
baseline rerun. The source tree itself passed. GEO-190 adds a cache ignore.

## Stack and assets observed

Locked: React 19.2.4, Three 0.183.2, R3F 9.5.0, MapLibre 5.21.0, Zustand 5.0.12,
Vite 8.0.1, Vitest 4.1.0, Playwright 1.58.2. Versions are audit inputs, not a
recommendation to keep vulnerable versions. The initial public tree contained
3,784 files / 102,744,507 bytes; this is a filesystem sum, not download size,
runtime memory or a benchmark. The quarantined pilot comprised five files /
290,752 bytes including source subsets, notice and metadata.

## Confirmed findings, not inferred precision

| Finding                           | Actual code                                                                                                  | Consequence / task                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Mutable modern input              | `scripts/borders/_shared.mjs` uses `/api/current/gbOpen/ALL/` and Natural Earth `master`                     | GEO-195 immutable edition/hash contract before rebuild             |
| Vertex sampling and rounding      | `simplifyRing`, ADM0 220 / ADM1 96 / ADM2 64 point targets; precision 3/4                                    | GEO-196 topology-aware process; no fresh geometry validity claimed |
| Existing tile constraints         | `build-tiles.mjs`: maxZoom 6, tolerance 0, extent 4096                                                       | Higher zoom alone cannot repair lost source detail                 |
| Optical bump                      | `Earth.tsx` uses the day color texture as bumpMap                                                            | Not elevation/DEM; GEO-201 source-gated relief                     |
| Approximate handoff               | `modeBridge.ts`/`bordersBridge.ts`: distance/zoom anchors, heading reset                                     | GEO-198 explicit view intent and roundtrip tolerances              |
| External map dependencies         | Headway public style references OpenFreeMap raster/vector/fonts/sprites; TimeAtlasMap uses its modern raster | No full offline claim; failure behavior/attribution require checks |
| First-load blocker                | viewerStore initially had `showOnboarding: true`                                                             | GEO-192 opt-in Help, preserving keyboard/URL behavior              |
| Historical publication assumption | public pilot carried GPL notice and hashes but no component-rights audit                                     | GEO-191 quarantine, publication guard, preserve private imports    |
| Security advisories               | MapLibre <=6.4.0 sanitizer/attribution XSS; Vite 8.0.1 dev-server advisories                                 | GEO-193 same-major Vite fix; GEO-204 renderer security remediation |

The pinned Historical Basemaps README and LICENSE were fetched from GitHub. A
GPL-3.0 notice is present; README Credits describe mixed-source adaptation.
Component redistribution approval remains unresolved under the owner's policy.
This is not a legal finding that a particular polygon is infringing.

The [MapLibre advisory](https://github.com/advisories/GHSA-jrc7-96c5-q579)
describes unsafe third-party attribution HTML and a fix in 6.4.1. Geo uses
attribution controls with external map metadata; do not declare this safe merely
because Geo has no `setHTML` calls. A major renderer update requires compatibility
work, not `npm audit fix --force`. The [Vite advisory](https://github.com/advisories/GHSA-p9ff-h696-f583)
specifically affects network-exposed dev servers. No exploit testing against a
public service was performed.

## Documentation drift and decisions

README/MAINTENANCE were desktop-first, described a blocked browser port as the dev
default and did not reflect current UI/history work. PRODUCT/ROADMAP understated
global history/physical geography and lacked permanent constraints. QA lacked a
real-device evidence distinction. Existing task evidence is retained; source-rights
approval for GEO-171 is explicitly superseded. See
[ADR 001](../DECISIONS/001-owner-constitution.md) and [STATUS](../STATUS.md).

No geometry assets were regenerated. No scientific boundary-accuracy, geodesic,
DEM-height, performance budget or Android result is established by this audit.
