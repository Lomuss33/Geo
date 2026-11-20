# Geo — current handoff

Updated: 2026-11-20. Maintainer: active task owner. Source of implementation truth:
working code and checks, not the roadmap. See [owner vision](PRODUCT_VISION.md),
[inventory](FEATURE_REGISTRY.md) and [audit](audits/GEO-190-reality-check.md).

## Repository and authorization

- Working branch: `main`.
- [PR #1](https://github.com/Lomuss33/Geo/pull/1) merged on 2026-11-19 as
  `f6ad04527651c625d18a54585f9799414a7cd259`. Its tree matches the tested PR head
  `0d522b71ed3d64f76cdfcf35b8101b33a02f3553`. Local main was fast-forwarded to
  origin/main; the follow-up handoff commit changes documentation only.
- Existing GEO-105/GEO-110 commits and all five integration/repair commits were
  preserved. No force-push, history rewrite or unrelated branch deletion occurred.
  Earlier working files remain preserved in ignored `.cache/geo-208/entry-work.zip`
  and prior task snapshots; inspect actual status before starting new work.
- The owner's 2026-11-19 commit/GitHub/merge request is fulfilled. It does not
  authorize unrelated future commits/pushes, recurring automation or publication.
  Independent reviewer approval and source/security release clearance are not
  inferred from a merge. Earlier tasks remain in review.

## Current work

GEO-208 integration is merged; see its
[final evidence](tasks/review/GEO-208-verified-integration.md) and
[successful CI run](https://github.com/Lomuss33/Geo/actions/runs/44492505708).
The exact PR head passed clean install/backport verification, lint, 256 unit /
8 Node tests, publication guard, TypeScript/build, all 50 production Chromium
cases, 20 development Chromium matrix cases and 3 dev attribution canaries.
The optional Macroscope correctness check was skipped, not reviewer approval.

CI/release jobs now pin Node 24.22.3 and Ubuntu 24.04. The optional WASM peer lock
entry is repaired without changing existing package versions/integrities. Theme
persistence and atlas inheritance use six independent cases with their original
30s test budgets and assertions. Initial install/runner/theme failures remain
recorded in GEO-208. Local Node 24.11.1/PATH are unchanged.

No quarantined geometry, caches, dependencies, build output or credential files
were committed. Geometry assets are unchanged; retained GEO-110 changes affect
GDP/population observation-profile metadata. Pages read-back confirms workflow
publication; deployment is manual from main with explicit release-review
confirmation. No deployment was dispatched. The following handoff edits affect
only STATUS, TASKBOARD and the integration task, not runtime/test/workflow/data
files; their CI evidence remains the exact merged PR head.

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

GEO-208 final PR checks on 2026-11-19 used Ubuntu 24.04, Node 24.22.3 and npm
11.19.1. These are CI/implementer results; no independent human review or new
physical-device verification is claimed.

| Check                                                                                           | Actual result                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Clean CI installation                                                                           | PASS; MapLibre backport applied and verified with the repaired lockfile                             |
| `npm run check`                                                                                 | PASS: lint, 33 unit files / 256 tests, 8 Node tests, publication guard, TypeScript and Pages build  |
| Production Chromium `/Geo/`                                                                     | PASS: all 50 cases                                                                                  |
| Development Chromium `/`                                                                        | PASS: all 20 matrix cases                                                                           |
| Optimized dev attribution                                                                       | PASS: all 3 cases                                                                                   |
| Optional Macroscope check                                                                       | SKIPPED; not independent review                                                                     |
| Local focused theme split                                                                       | PASS: all 6 cases with unchanged 30s budgets; lint and formatting pass                              |
| Earlier desktop Firefox                                                                         | GEO-194 evidence retained: 20 Pages / 20 dev matrix / 1 DOM case on Windows; no Linux Firefox claim |
| Formatting                                                                                      | 116 parseable integration files passed targeted Prettier; 65 unrelated legacy warning files remain  |
| Merge                                                                                           | PR #1 merged as `f6ad045`, tree equal to tested `0d522b7`; original commits preserved               |
| Pages                                                                                           | Workflow publishing configured; no deployment dispatched                                            |
| Real Android, native keyboard/zoom/safe areas, remote Headway availability, performance budgets | NOT RUN                                                                                             |

[The integration evidence](tasks/review/GEO-208-verified-integration.md) records all
failed runs and repairs. [GEO-194](audits/GEO-194-regression-matrix.md) retains the
source-hashed country-scale cases, renderer/camera before-and-after checks and
Windows viewport/visual evidence. No precision claim is added by CI. Fine geometry
remains GEO-195/196, density/touch ergonomics GEO-202 and performance GEO-203.

The historical source stays quarantined with its public-tree guard. The
[GEO-206 audit](audits/GEO-206-dependency-maintenance.md),
[security policy](SECURITY.md) and [GEO-204 evidence](tasks/review/GEO-204-renderer-security.md)
retain the remaining advisory/review gates. The last recorded npm audit still
reports the upstream MapLibre version and unfixed picomatch chain; the local
backport is not a claim of zero vulnerabilities. No new audit clearance, remote
Pages deployment or approval of blocked data is claimed.

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

Earlier GEO-194 documentation self-check (before integration): all 32 changed files pass targeted
Prettier; 82 Markdown documents / 163 local file links have no missing targets,
and `git diff --check` passes. All 83 inherited files outside the task scope remain
byte-identical; no public boundary assets changed. Full-tree formatting still
fails on 65 legacy files, seven fewer than the 72-file entry baseline, with no
new warning files. Do not reformat unrelated code to hide that debt.

## PC retirement backup verification (2026-11-20)

Owner requested Git preservation before erasing this PC. Fetched origin and
pushed main; GitHub reported everything up to date at
`dfe8a368a9ed7ee78f9f62c273cc3c0e8841d858`. Remote read-back matched local HEAD.
The working tree was clean, no stashes existed, and no local branch commits
were absent from the fetched remote refs. This GEO-208 handoff note is a
subsequent documentation-only commit under the same explicit push request.

Clone `https://github.com/Lomuss33/Geo.git` on the replacement machine, use
Node 24 and `npm ci`, then follow CONTRIBUTING and this status. Next executable
task remains GEO-205; no new runtime checks or release approval are claimed.

Git does not preserve ignored `.cache/` archives, quarantined research,
dependencies/build outputs, or browser local storage. Export wanted atlas and
animation projects from the browser before wiping the PC and copy any wanted
private research backups to separate storage. Quarantined archives must not be
added to the public repository. No deployment was requested or dispatched.
