# GEO-208 Integrate and publish verified repository work

## Status and authorization

- State: in-progress
- Owner: Codex
- Branch: `geo/geo-208-verified-integration`
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

GitHub Pages is currently configured for legacy branch-root publication while
the repository contains a Vite deployment workflow. Align Pages with workflow
publication and keep release dispatch explicit: merge is not a security or
source-rights approval. Existing live content is not intentionally redeployed.
CI on PR/main runs clean installation, guards, lint/unit/data/build, production
Chromium, the development Chromium matrix and attribution canaries. Desktop
Firefox evidence remains the locally observed GEO-194 run, not new Linux coverage.

## Acceptance criteria

- [x] Prepared work reviewed and private/generated/quarantined files excluded.
- [x] Coherent commits pushed without rewriting existing local/remote history.
- [ ] Exact integration tree passes local checks and GitHub PR CI.
- [ ] PR merged into main only after checks pass; merge SHA and remote state recorded.
- [ ] Pages publishing source/workflow aligned, automatic release held, and remaining gates explicit.

## Evidence

In progress. GitHub auth is available. Remote main was fetched and remains
`877a6c5`; no open PR, no branch protection, no auto-merge setting. Pages reports
`build_type: legacy`, source main/root. The latest custom Deploy Geo run failed
while the separate legacy Pages publication succeeded. No new deployment or
independent review is claimed.

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
Linux clean-install/test success remains pending on the repaired PR head.

CI and the manual release workflow now pin Node 24.22.3, as linked by the
[official security release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases),
instead of accepting the older cached runner artifact. This does not update local
Node 24.11.1/PATH or close GEO-207's broader maintenance work.

## Self-check and reviewer verification

- [ ] Integration scope and actual checks recorded.
- [ ] Remote commits/PR/merge and release disposition verified.
- [ ] Independent review (separate from CI and implementer self-check).

## Handoff

Finish integration and record exact GitHub URLs and commit/check outcomes.
Preserve source review blocks and the MapLibre hash guards. Do not mark earlier
tasks done merely because their code is merged. Next implementation is GEO-205;
security maintenance remains GEO-207 before release.
