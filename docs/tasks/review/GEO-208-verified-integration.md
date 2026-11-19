# GEO-208 Integrate and publish verified repository work

## Status and authorization

- State: review (merged; implementer self-check complete, independent review pending)
- Owner: Codex
- Branch: `main`; integration branch `geo/geo-208-verified-integration` merged
- Owner request, 2026-11-19: "now lets merge things and commit to github. do smart!"
- Authorized: consolidate the prepared work, commit/push, create a PR and merge
  after checks pass. This is a bounded integration request, not continuing
  permission for future unattended commits or merges.
- Entry: local HEAD `6414025`, origin/main `877a6c5`; local history is ahead by two
  commits. Other local task branches point to those same commits; there are no
  separate feature histories to merge blindly.

## Scope

Integrate the prepared GEO-115/170/171/180/190/191/192/193/194/204/206 work, retaining
the original commits and honest review/source/security states. Commit application
code, required catalogs and guards together; keep product/evidence documentation
and CI/release policy reviewable in a separate commit. Do not include caches,
backups, dependencies, build output, credentials or quarantined historical data.

At entry GitHub Pages used legacy branch-root publication while the repository
contained a Vite deployment workflow. Pages now uses workflow publication and
release dispatch is explicit: merge is not security or source-rights approval.
Existing live content was not intentionally redeployed.
CI on PR/main runs clean installation, guards, lint/unit/data/build, production
Chromium, the development Chromium matrix and attribution canaries. Desktop
Firefox evidence remains the locally observed GEO-194 run, not new Linux coverage.

## Acceptance criteria

- [x] Prepared work reviewed and private/generated/quarantined files excluded.
- [x] Coherent commits pushed without rewriting existing local/remote history.
- [x] Exact integration tree passes local checks and GitHub PR CI.
- [x] PR merged into main only after checks pass; merge SHA and remote state recorded.
- [x] Pages publishing source/workflow aligned, automatic release held, and remaining gates explicit.

## Evidence

At entry remote main was `877a6c5`, with no open PR, branch protection or
auto-merge setting. Pages reported `build_type: legacy`, source main/root; the
latest custom deployment had failed while legacy publication succeeded.
Final merged/check results are recorded below. No new deployment or independent
review is claimed.

Previous final local evidence is in [GEO-194](../review/GEO-194-regression-matrix.md):
256 unit / 8 Node / 47 production Chromium / 40 dev Chromium+Firefox / 20 Pages
Firefox / 3 dev attribution / 1 Firefox DOM case. Existing formatting debt and
remaining MapLibre version/picomatch/runtime findings stay visible.

Fresh `npm run check` passes on 2026-11-19: 256 unit / 8 Node tests, lint,
publication guard, TypeScript and Pages build. The first integration commit is
`f8dfd2d76cd6886f885d3a50bc6944ec5548f7c5`: 59 interdependent application, test,
catalog/guard and configuration files. Remaining policy/docs/CI are a separate
commit. The 117-file candidate scan found no credential patterns or new/modified
files over 1MB; all staged paths were enumerated rather than blindly adding all.
The existing 65 formatting-warning files are outside the integration changes.
Local entry preservation is `.cache/geo-208/entry-work.zip` and its manifest.

The two retained commits were also inspected against remote main: they add
geographic scope/search and observation provenance. Their only public asset
changes are GDP/population profile metadata; no geometry/binary assets or
quarantined history are introduced. Their trees contain no cache, dependency,
build-output, environment or SSH-key paths.

Pages was switched via the GitHub API to `build_type: workflow` on 2026-11-19;
read-back confirms workflow publication with existing site status `built`.
No deployment was dispatched. This removes the legacy branch-root publication
path before merging the new manual-only deployment workflow. Configuration
follows [GitHub's publishing-source guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

PR: [#1](https://github.com/Lomuss33/Geo/pull/1). The first two integration commits
are `f8dfd2d` (application/guards/tests) and `345aae9` (policy/docs/CI). Local source
preservation, 116-file targeted formatting and 83 Markdown / 166 local links pass.
The two retained commits and the new application commit were screened: 115
changed historical blobs contain no credential patterns.

The [first CI run](https://github.com/Lomuss33/Geo/actions/runs/44483769219) failed
at clean installation, before tests: npm 11.19.1 (runner Node 24.22.2) required a
missing optional `@emnapi/runtime@1.11.3` peer entry. Generating the lock with that
npm version adds exactly that optional dev peer and changes only 26 peer-role
annotations; no existing package version, URL or integrity changes. Its tarball
integrity matches registry metadata. Normal strict `npm ci --dry-run` under
npm 11.19.1 passes, and the installed MapLibre hash verification still passes.
That initial repair was subsequently verified by the successful CI run below.

CI and the manual release workflow now pin Node 24.22.3, as linked by the
[official security release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases),
instead of accepting the older cached runner artifact. This does not update local
Node 24.11.1/PATH or close GEO-207's broader maintenance work.

## Self-check and reviewer verification

The [second CI run](https://github.com/Lomuss33/Geo/actions/runs/44484457854)
passed clean installation/backport application, lint, 256 unit / 8 Node tests,
publication guard and Pages build on Node 24.22.3. It failed when installing
Chromium: the ubuntu-latest image had moved to 26.04, which Playwright 1.58.2
does not support. Both CI and manual release jobs now pin Ubuntu 24.04, present
in that installed Playwright version's dependency/host-platform tables. This
keeps the verified browser package and uses its supported OS; no engine or data
upgrade is hidden in the runner repair. The successful full run below closes the
remote browser verification for this integration.

- [x] Integration scope and actual checks recorded.
- [x] Remote commits/PR/merge and release disposition verified.
- [ ] Independent review (separate from CI and implementer self-check).

## Handoff

The [third CI run](https://github.com/Lomuss33/Geo/actions/runs/44490633975) reached
production browser testing on Ubuntu 24.04 and passed 46/47 cases. The 1600px
theme test hit its aggregate 30s limit while performing the atlas-opening click,
after the light/dark contrast checks, reload and both viewer screenshots. The
failure log reports a visible, enabled, stable button, not interception; its
uploaded dark screenshot was inspected. No functional defect or performance
budget success is inferred from that timing alone.

The theme spec now separates light-theme persistence/reload from dark contrast
and atlas inheritance, each in a fresh browser context at 1600/390/320px. All
original contrast, rectangle, selected-country and mobile 44px assertions remain;
the normal 30s test and 5s expectation limits are unchanged. Atlas dark-theme
inheritance is now explicitly asserted before toggling light. Screenshots use
per-test output paths. Local lint and all six focused production theme cases
pass (28.9s total). The complete production suite now has 50 cases. Only test
structure/documentation changed in that repair.

### Final remote verification and merge

[CI run 44492505708](https://github.com/Lomuss33/Geo/actions/runs/44492505708)
succeeded on exact PR head `0d522b71ed3d64f76cdfcf35b8101b33a02f3553`, using
Ubuntu 24.04, Node 24.22.3 and npm 11.19.1:

- Clean installation and the exact MapLibre backport succeeded.
- Lint, 33 unit files / 256 tests, 8 Node tests, publication guard, TypeScript and
  Pages build passed.
- All 50 production Chromium cases, 20 development Chromium matrix cases and
  3 optimized-dependency attribution cases passed.
- The optional Macroscope correctness check was SKIPPED. It is not independent
  reviewer approval; no comments/reviews blocked merge.

[PR #1](https://github.com/Lomuss33/Geo/pull/1) was merged at
2026-11-19 09:17:14 UTC as
`f6ad04527651c625d18a54585f9799414a7cd259`, with a merge commit preserving the two
earlier commits and all five integration/repair commits. The merge tree was
verified identical to the tested PR head, and local main was fast-forwarded to
origin/main. No force-push, branch deletion or historical rewrite was used.

Pages read-back remains `build_type: workflow`, status `built`; the merged
deployment workflow has only manual dispatch, restricted to main with explicit
release-review confirmation. No deployment was dispatched. Source/security and
physical-device gates remain open, and earlier tasks remain in review.

The follow-up handoff changes only STATUS, TASKBOARD and this task's location/
evidence. It receives documentation formatting/link/whitespace checks, not a
claim of a new runtime test result. Runtime/test/workflow/data trees stay identical
to the merged, CI-verified tree. Next implementation is GEO-205; GEO-207 remains
before release. The bounded commit/merge request is fulfilled; future unrelated
commits/pushes/publication still require their own authorization.
