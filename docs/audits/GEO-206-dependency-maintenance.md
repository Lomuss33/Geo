# GEO-206 dependency maintenance audit

Date: 2026-11-18. Branch: `geo/geo-206-dependency-security`; HEAD `6414025`
plus 96 inherited dirty/untracked files preserved in ignored `.cache/geo-206/`.
This is implementer evidence, not independent review or publication approval.

## Scope and method

A fresh baseline `npm audit --json` matched GEO-204: 25 affected-package findings
(1 critical, 12 high, 11 moderate, 1 low). `npm outdated --json` and
`npm outdated --all --json`, registry metadata and upstream advisories established
which compatible releases actually exist. No `audit fix`, override, renderer
replacement, geometry regeneration or publication was performed.

Only two direct development ranges changed: `vitest` to `^4.1.12` and
`typescript-eslint` to `^8.73.0`. Runtime patches are fflate 0.8.2 to 0.8.3,
three-stdlib's fflate 0.6.10 to 0.6.11, and protocol-buffers-schema 3.6.0 to 3.6.1.
Remaining changed records are their affected tooling chains. All 59 changed
package records are listed below; the root lock record only mirrors the two ranges.
No packages were removed; two development-only child packages were added.

Resolution commands, run without modifying installed packages or running lifecycle
scripts until the final clean install:

```sh
npm update --package-lock-only --ignore-scripts --no-audit --no-fund fflate protocol-buffers-schema
npm update --package-lock-only --ignore-scripts --no-audit --no-fund vitest typescript-eslint @babel/core @humanfs/node baseline-browser-mapping brace-expansion browserslist js-yaml undici zod
npm ci --no-audit --no-fund
```

MapLibre 5.21.0, its five-file hash specification/installer/canaries, Vite 8.1.6,
React/React DOM, Three/R3F/drei, Playwright, TypeScript, ESLint and jsdom package
records are unchanged. `npm ci` applied all five MapLibre patches again.

TypeScript-ESLint 8.73.0 itself declares minimatch `^11.0.1`; the nested 10.2.4 to
11.0.9 change follows that reviewed parent range, with no forced override.
Keeping minimatch 10.2.6 would not fix
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
The ESLint-side minimatch 3.1.5 is outside that advisory's affected range and
remains, with brace-expansion patched on its compatible 1.x line. Both fflate
lines use the upstream [ZIP64 fixes](https://github.com/advisories/GHSA-px8p-9vwx-vf98).
Vitest/mocker 4.1.12 contains the
[manual mock registration fix](https://github.com/advisories/GHSA-qxg6-89mg-rqv8)
as well as the earlier redirect-path fix.

## Re-audit and remaining paths

The updated-lock audit reports 13 affected-package findings: 1 critical and 12
high, no moderate/low. `npm audit --omit=dev --json` after clean installation
reports only MapLibre (1 critical). These counts are package-chain reports,
not 13 distinct exploited bugs or proof of a safe release.

- MapLibre's upstream version finding remains. The GEO-204 local snapshot fix is
  verified independently of the version-range report; it is not suppressed.
- All 12 remaining high package findings derive from one unfixed
  [picomatch ReDoS advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
  Registry latest is 4.0.7 and the advisory lists no patched version as of this
  audit. Vite, Vitest, tinyglobby/fdir and TypeScript-ESLint propagate that chain;
  the updated Vitest mocker and minimatch advisories are no longer root findings.
- No application module imports picomatch or accepts file-glob input. Installed
  usage is development file scanning/configuration/testing, not country search
  or user atlas validation. This limits the observed path; it is not an exemption
  for untrusted project/configuration input or all transitive execution paths.
- npm proposes downgrading Vite to 6.2.7, Vitest to 3.1.4 and TypeScript-ESLint
  to 8.47.0 in its resolver output. Those are not validated fixes. A Vite 8.3.8
  bump also depends on affected picomatch, so it does not close this root issue.
  No such major downgrade, advisory suppression or unreviewed custom sanitizer
  was introduced.
- fflate and protobuf-schema remain production-transitive, now patched. Source
  searches still find no direct app ZIP/protobuf-schema compiler entry; the
  dependency graph is not equated with the code bytes embedded inside an already
  built MapLibre bundle. Existing attribution/render/import checks must still pass.
- npm undici 7.30.2 belongs to jsdom test tooling; Zod belongs to React Hooks lint
  tooling. Neither is Geo's user-file validator or a new production backend.

## Node runtime is separate

Observed executable: Node 24.11.1, built-in Undici 7.16.0, OpenSSL 3.5.4.
Updating the npm undici package does not update those built-ins. The official
[November 2026 security release](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
provides Node 24.22.3 with runtime/security dependency updates. No system runtime,
PATH, version manager or other project's process was changed here. The static
Pages app has no production Node backend; local dev/test and the build host still
need current supported runtime maintenance. GitHub Actions selects the 24 line,
but no new remote run was observed. Do not treat that setting as proof of the
installed patch level or of CI success.

A separate follow-up should verify an official same-line Node 24.22.3-or-newer
artifact and its checksum, use a project-scoped executable first, repeat clean
install/check/canaries, then record adoption. A MapLibre 6.x migration is optional
separate renderer compatibility work: validate all adapters/styles/projections,
legacy URLs/imports and attribution before removing the backport as a whole.

## New development dependencies and notices

`@humanfs/types` 0.15.0 (Apache-2.0 package metadata) is a types-only child of the
existing humanfs chain. `@isaacs/nonrecursive-glob-match` 1.1.0 is a child of
minimatch 11; its included `LICENSE.md` is BlueOak-1.0.0, also used by the existing
minimatch family. Existing package license metadata did not change. These are
lint/development dependencies, not newly imported runtime packages. Preserve
license notices when distributing dependencies; upstream labels are not a full
component or publication audit. See [THIRD_PARTY](../../THIRD_PARTY.md).

## Complete version-change ledger

Paths below omit `node_modules/`; nested paths are kept to distinguish versions.
`new` means a newly resolved development dependency. This table was reviewed
against the entry lockfile; no unrelated renderer, framework or asset update is
included.

| Package path                                                        | Entry version | Resolved version | Chain              |
| ------------------------------------------------------------------- | ------------- | ---------------- | ------------------ |
| `@babel/code-frame`                                                 | 7.29.0        | 7.29.7           | dev                |
| `@babel/compat-data`                                                | 7.29.0        | 7.29.7           | dev                |
| `@babel/core`                                                       | 7.29.0        | 7.29.13          | dev                |
| `@babel/generator`                                                  | 7.29.1        | 7.29.14          | dev                |
| `@babel/helper-compilation-targets`                                 | 7.28.6        | 7.29.13          | dev                |
| `@babel/helper-globals`                                             | 7.28.0        | 7.29.7           | dev                |
| `@babel/helper-module-imports`                                      | 7.28.6        | 7.29.7           | dev                |
| `@babel/helper-module-transforms`                                   | 7.28.6        | 7.29.14          | dev                |
| `@babel/helper-string-parser`                                       | 7.27.1        | 7.29.14          | dev                |
| `@babel/helper-validator-identifier`                                | 7.28.5        | 7.29.7           | dev                |
| `@babel/helper-validator-option`                                    | 7.27.1        | 7.29.7           | dev                |
| `@babel/helpers`                                                    | 7.29.2        | 7.29.14          | dev                |
| `@babel/parser`                                                     | 7.29.2        | 7.29.14          | dev                |
| `@babel/template`                                                   | 7.28.6        | 7.29.7           | dev                |
| `@babel/traverse`                                                   | 7.29.0        | 7.29.14          | dev                |
| `@babel/types`                                                      | 7.29.0        | 7.29.14          | dev                |
| `@humanfs/core`                                                     | 0.19.1        | 0.19.2           | dev                |
| `@humanfs/node`                                                     | 0.16.7        | 0.16.8           | dev                |
| `@humanfs/types`                                                    | new           | 0.15.0           | dev                |
| `@isaacs/nonrecursive-glob-match`                                   | new           | 1.1.0            | dev                |
| `@typescript-eslint/eslint-plugin`                                  | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/eslint-plugin/node_modules/ignore`              | 7.0.5         | 7.0.16           | dev                |
| `@typescript-eslint/parser`                                         | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/project-service`                                | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/scope-manager`                                  | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/tsconfig-utils`                                 | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/type-utils`                                     | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/types`                                          | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/typescript-estree`                              | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/typescript-estree/node_modules/brace-expansion` | 5.0.4         | 5.0.13           | dev                |
| `@typescript-eslint/typescript-estree/node_modules/minimatch`       | 10.2.4        | 11.0.9           | dev                |
| `@typescript-eslint/typescript-estree/node_modules/semver`          | 7.7.4         | 7.8.6            | dev                |
| `@typescript-eslint/utils`                                          | 8.57.1        | 8.73.0           | dev                |
| `@typescript-eslint/visitor-keys`                                   | 8.57.1        | 8.73.0           | dev                |
| `@vitest/expect`                                                    | 4.1.0         | 4.1.12           | dev                |
| `@vitest/mocker`                                                    | 4.1.0         | 4.1.12           | dev                |
| `@vitest/pretty-format`                                             | 4.1.0         | 4.1.12           | dev                |
| `@vitest/runner`                                                    | 4.1.0         | 4.1.12           | dev                |
| `@vitest/snapshot`                                                  | 4.1.0         | 4.1.12           | dev                |
| `@vitest/spy`                                                       | 4.1.0         | 4.1.12           | dev                |
| `@vitest/utils`                                                     | 4.1.0         | 4.1.12           | dev                |
| `baseline-browser-mapping`                                          | 2.10.9        | 2.11.38          | dev                |
| `brace-expansion`                                                   | 1.1.12        | 1.1.22           | dev                |
| `browserslist`                                                      | 4.28.1        | 4.29.6           | dev                |
| `caniuse-lite`                                                      | 1.0.30001780  | 1.0.30001826     | dev                |
| `chai`                                                              | 6.2.2         | 6.3.0            | dev                |
| `electron-to-chromium`                                              | 1.5.321       | 1.5.490          | dev                |
| `fflate`                                                            | 0.8.2         | 0.8.3            | runtime-transitive |
| `js-yaml`                                                           | 4.1.1         | 4.3.2            | dev                |
| `node-releases`                                                     | 2.0.36        | 2.0.65           | dev                |
| `protocol-buffers-schema`                                           | 3.6.0         | 3.6.1            | runtime-transitive |
| `semver`                                                            | 6.3.1         | 6.3.2            | dev                |
| `three-stdlib/node_modules/fflate`                                  | 0.6.10        | 0.6.11           | runtime-transitive |
| `tinyrainbow`                                                       | 3.1.0         | 3.2.0            | dev                |
| `typescript-eslint`                                                 | 8.57.1        | 8.73.0           | dev                |
| `undici`                                                            | 7.24.5        | 7.30.2           | dev                |
| `update-browserslist-db`                                            | 1.2.3         | 1.4.0            | dev                |
| `vitest`                                                            | 4.1.0         | 4.1.12           | dev                |
| `zod`                                                               | 4.3.6         | 4.6.7            | dev                |

## Verification and handoff

The [task evidence](../tasks/review/GEO-206-dependency-security.md) records
actual clean-install, check, browser, formatting and LAN-preview results. Final
27 Chromium checks, 3 dev canaries and 1 Firefox DOM fixture passed. An initial
ultrawide width failure, followed by 3 unchanged diagnostic passes and a complete
passing rerun, remains an unconfirmed cause for GEO-194; no app/test fix is claimed.
Local machine logs/audit JSON/lock comparisons are ignored in `.cache/geo-206/`; this document is the
portable version and reachability record. Independent review, full Firefox map,
physical Android Firefox and performance budgets are not implied by these checks.
