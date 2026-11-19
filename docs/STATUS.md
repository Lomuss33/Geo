# Geo — current handoff

Updated: 2026-11-19. Maintainer: active task owner. Source of implementation truth:
working code and checks, not the roadmap. See [owner vision](PRODUCT_VISION.md),
[inventory](FEATURE_REGISTRY.md) and [audit](audits/GEO-190-reality-check.md).

## Repository and authorization

- Working branch: `geo/geo-208-verified-integration`.
- Prepared application work is committed as
  `f8dfd2d76cd6886f885d3a50bc6944ec5548f7c5`; documentation/CI is committed as
  `345aae95e15413ebc7a92966090cc6210ea28ea1`. Both are pushed in
  [integration PR #1](https://github.com/Lomuss33/Geo/pull/1).
  Earlier uncommitted work is preserved in ignored `.cache/geo-208/entry-work.zip`
  with a hash manifest, in addition to prior task snapshots. Inspect status before
  changing branches; historical task branches are aliases, not separate features.
- Remote main fetched on 2026-11-19 is
  `877a6c5233f72198c9bdac7b9ec1c6df4c60c02e`; local history also retains the two
  unpublished GEO-105/GEO-110 commits. No open PR existed at integration start.
- The owner explicitly requested committing to GitHub and merging on 2026-11-19.
  GEO-208 is authorized to push a reviewed integration PR and merge after checks
  pass. Source/security release gates remain; publication and future unattended
  work are not implied. No independent reviewer approval is claimed.

## Current work

GEO-208 integration is active. Fresh local `npm run check` passes on the staged
application tree (256 unit / 8 Node, lint and Pages build). All 117 candidate
files were screened for credential patterns and unexpectedly large files; no
findings. Public boundary assets are unchanged, and quarantined history remains
ignored/outside the public tree. PR/main CI is being added before push; Pages
release is manual, pending the existing source/security gates. Pages read-back
now confirms workflow publication instead of legacy branch-root publication;
no deployment was dispatched. The first remote install failed before testing
because npm 11.19.1 required a missing optional WASM runtime peer lock entry.
That lock-only repair adds one optional dev peer, preserves existing package
versions/integrities and retains the security backport. CI/release workflows now
pin Node 24.22.3, the documented security patch, instead of using the older runner
cache. Local Node/PATH are unchanged. Await corrected-head CI before merging;
follow [GEO-208](tasks/in-progress/GEO-208-verified-integration.md) and PR #1.

- GEO-190: owner constitution, reality audit, durable memory and executable backlog.
- GEO-191: first-party historical pilot held for component-rights review, preserved
  as ignored local research; guard blocks public-tree reintroduction. User atlas
  imports/persistence/export remain supported.
- GEO-192: Earth opens without mandatory onboarding; existing Help stays available.
- GEO-193: same-major Vite security maintenance and usable development port.
- GEO-204: exact-version/hash-locked upstream MapLibre attribution backport,
  install/build/dev guards, security canaries and remaining dependency triage.
- GEO-206: compatible affected-chain patches, full lock review and repeat
  clean-install/check/browser verification; remaining root findings are GEO-207.
- GEO-194: six-viewport Chromium/Firefox matrix, source-hashed country-scale
  fixtures, renderer failure/retry, saved Geo frame and editor readiness repairs.

Implementer self-check for these seven increments is complete; task files are in
`review/`. Independent verification is pending, so none is marked done.
GEO-194 preserves 98 inherited dirty/untracked files in its ignored entry archive
and hash manifest. Fiber is pinned to 9.8.2 for observed async failure recovery;
only Fiber, its-fine and a nested scheduler version record change. The exact
MapLibre backport is unchanged. The original intermittent ultrawide-width trigger
remains unconfirmed; an independent 840px cap now passes controlled full-width
faults and cold-open/resize checks. Full before/after evidence is in
[GEO-194](audits/GEO-194-regression-matrix.md).

## Latest checks

GEO-194 implementation runs completed on 2026-11-18, Windows / Node 24.11.1 /
Vite 8.1.6. LAN restart/browser metadata were verified on 2026-11-19.
Installed browsers: Chromium 145.0.7632.6 (SwiftShader) and Firefox 146.0.1
(WebGL 2/AMD ANGLE). See [exact commands and limits](tasks/review/GEO-194-regression-matrix.md).

| Check                                                                                                | Actual result                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --no-audit --no-fund`                                                                        | PASS; all five reviewed MapLibre patches applied                                                                                  |
| `npm run check`                                                                                      | PASS: lint, 33 unit files / 256 tests, 8 Node data/security tests, publication guard, TypeScript and Pages build                  |
| Production Chromium `/Geo/`                                                                          | PASS: all 47 E2E cases                                                                                                            |
| Development Chromium + Firefox `/`                                                                   | PASS: all 40 matrix cases                                                                                                         |
| Production Firefox `/Geo/`                                                                           | PASS: all 20 matrix cases                                                                                                         |
| Attribution through optimized dev dependencies                                                       | PASS: 3 canaries                                                                                                                  |
| Additional Firefox installed-control fixture                                                         | PASS: 1 DOM case                                                                                                                  |
| Source-tied geography                                                                                | PASS: 8 country-scale/hash cases; all fine-geometry reviews pending GEO-195/196                                                   |
| LAN preview, 2026-11-19                                                                              | PASS: HTTP 200, ready Earth/light theme at `http://192.168.0.167:5173/`; no page/console errors in the probe                      |
| Formatting and documentation                                                                         | 32 changed files pass targeted Prettier; full-tree check still reports 65 legacy warning files, down from 72 with no new warnings |
| npm audit after Fiber update, 2026-11-18                                                             | Still 13 package findings: 1 critical MapLibre version finding and 12 high reports from the unfixed picomatch chain               |
| Real Android, native soft keyboard/zoom/safe areas, remote Headway availability, performance budgets | NOT RUN                                                                                                                           |

[The regression audit](audits/GEO-194-regression-matrix.md) records initial failures,
repairs and final complete runs. Logs/traces/screenshots are ignored under
`.cache/geo-194/`. Mobile/landscape/desktop captures and the restored LAN light
viewer were visually inspected. Short-height editing still uses scrolling;
full density/touch ergonomics remain GEO-202. Controlled Headway styles do not
measure remote tile availability. These are implementer self-checks, not
independent review, physical-device evidence or remote CI/deployment success.

[GEO-206](audits/GEO-206-dependency-maintenance.md) retains its 59-record lock review
and earlier checks. [SECURITY](SECURITY.md) and
[GEO-204](tasks/review/GEO-204-renderer-security.md) retain the backport and remaining
advisory gates; recovery changes do not clear a version-based npm finding.

Earlier foundation evidence remains in [GEO-190](tasks/review/GEO-190-project-foundation.md):
222 unit / 4 Node / 23 Chromium checks, 2 optional local research fidelity tests,
default port 6003 plus root/cache-denial probes and five quarantined file hashes.
Those source/dev probes were observed on 2026-11-16, not rerun as part of GEO-204.
GEO-204 also verified missing-patch install/build/dev rejection and cache repair;
those negative-install probes were not rerun for unchanged installation code in
GEO-206. The publication guard and import behavior passed in the current checks.

## Release blockers and limits

1. Dependency security/review: the specific MapLibre attribute-iteration defect
   has a reproducible local upstream backport with before/after tests (GEO-204,
   independent review pending). npm still flags the upstream version as critical.
   GEO-206's compatible updates leave 13 package findings with two root advisory
   IDs: MapLibre and an unfixed picomatch ReDoS in development file-scanning
   chains. Vite/Vitest/TypeScript-ESLint propagate the latter. No fixed picomatch
   release was published at the 2026-11-18 audit; no blanket release clearance. Local Node
   24.11.1 also needs separate same-line runtime maintenance (GEO-207).
2. Historical Basemaps component rights/history review unresolved. Quarantined
   files are **not** for commit/deploy. See [source catalog](../data/catalog/README.md).
3. Modern border source versions and topology are not yet trustworthy enough for
   precision claims. No boundary rebuild until GEO-195 input pinning and GEO-196 QA.
4. Full-tree formatting debt and no current real Android Firefox/performance
   evidence. A traced local Borders load exceeded its unchanged 10s deadline;
   normal complete suites pass, but this is not a slow-network performance result.
   Desktop browser screenshots do not close those gaps.
5. Direct preference/draft storage calls can still fail when storage is denied
   (GEO-205). Theme/atlas catches do not prove whole-app resilience.
6. True DEM, integrated historical resolver, Learn evidence views, studio scenes,
   portable studio projects and media export are planned. Existing atlas JSON and
   camera timeline files are different formats, not implementations of all these.

## Next executable work

1. **GEO-205 storage resilience**: claim its ready task after inspecting this dirty
   tree. Inject denied reads/writes, quota errors and corrupt drafts; catch failures
   without hiding unsaved work or trapping Help. Preserve old keys/formats.
2. **GEO-207 residual security**: verify a current official Node 24 executable in
   project scope and recheck the unpatched picomatch advisory. Keep the release
   gate; no npm major downgrades, custom regex guesses or advisory suppression.
3. **GEO-195 immutable modern inputs**, then **GEO-196 topology**: no incidental
   generation of the ~100MB current data bundle.
4. GEO-197 registries and GEO-198 geographic view intent enable later unified
   workspaces. GEO-199 temporal/evidence contracts precede GEO-200 historical pilots.

Start with [TASKBOARD](tasks/TASKBOARD.md); task files define acceptance, ownership,
tests, dependencies and rollback. Existing GEO-120/130/140/150/160 remain in the
backlog with updated dependencies; don't start a competing tracker.

## Recovery and continuation

Entry work is preserved as `.cache/geo-190-baseline/working-tree.zip` plus hashes.
GEO-204 additionally preserved 84 inherited dirty/untracked files in
`.cache/geo-204/entry-work.zip` with `entry-manifest.json`. These local backups
are not portable release artifacts. Suspended pilot output is
in `.cache/research/historical-pilot/`; regenerate only with the explicit research
command and never copy to `public/`. Closing a local session does not authorize
unattended work. Record final checks and the exact next task before every handoff.

Development defaults to 6003, preview to 6001 and E2E to 6002. The earlier mobile
preview may use an explicit LAN `--port 5173` override; inspect listeners before
restarting and do not stop another project's localhost process. Development is
not public hosting. `npm run dev -- --host <LAN-IP> --port 5173` preserves that
local preview URL if the interface/port is still available.

On 2026-11-19 the GEO-194 continuation restored the requested LAN development
preview on `http://192.168.0.167:5173/` with Vite 8.1.6 and observed HTTP 200 plus
a ready Geo renderer in desktop Firefox. This is an
explicit interface/port override, not the new default or a production deployment.
No conflicting listener was observed at restart; no other process was stopped.
Background server lifetime is not guaranteed across host/session restarts.

Final GEO-194 documentation self-check: all 32 changed files pass targeted
Prettier; 82 Markdown documents / 163 local file links have no missing targets,
and `git diff --check` passes. All 83 inherited files outside the task scope remain
byte-identical; no public boundary assets changed. Full-tree formatting still
fails on 65 legacy files, seven fewer than the 72-file entry baseline, with no
new warning files. Do not reformat unrelated code to hide that debt.
