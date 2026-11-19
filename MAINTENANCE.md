# Maintenance

## Support targets

Target full mobile capability, especially real Android Firefox, alongside Windows
Firefox and Chrome/Edge. GEO-194 adds desktop Chromium/Firefox renderer checks
with emulated viewport sizes and controlled Headway inputs; this is not a real
Android/device or remote-provider availability result. See
[STATUS](docs/STATUS.md) and [QA](docs/QA.md) before claiming release coverage.

## Regular cadence

- When a maintainer session is active: dependency/advisory check, smoke build and
  Pages deployment review. No recurring automation is configured.
- Monthly: manual QA pass in Edge, Chrome, and Firefox.
- Quarterly: texture and performance budget audit.

## Dependency workflow

1. Run `npm outdated` and `npm audit --json`; retain a compact evidence summary.
2. Triage exploitable production/dev paths first. Avoid `npm audit fix --force`;
   major renderer upgrades need their own compatibility evidence. Stop only this
   repo's dev process before `npm ci` on Windows if native bindings are locked.
3. Run `npm run check`.
4. Run `npm run test:e2e` after installing Playwright browsers if needed.
5. Update `THIRD_PARTY.md` if new runtime dependencies materially affect licensing or attribution.

MapLibre has a version/hash-locked local security backport. `npm ci` applies it;
`npm run verify:security` checks it without mutation. Read
[SECURITY](docs/SECURITY.md) before changing that dependency or disabling lifecycle
scripts. After a manual repair, restart the dev server so no old in-memory bundle
is used. The repair CLI clears only generated Vite dependency cache. Keep the
payload canaries through any future upstream replacement; do not suppress audit
findings or silently downgrade the renderer/toolchain to satisfy npm suggestions.

GEO-206 records the compatible patched chains and two remaining root advisories
in [the dependency audit](docs/audits/GEO-206-dependency-maintenance.md). picomatch
has no published fix as of 2026-11-18; its propagated dev-tool findings are not
cleared by upgrading Vite within the current line. Recheck upstream in an active
maintenance session and keep the release gate explicit. Node's built-in Undici
and OpenSSL are maintained through the executable, separately from npm undici.
The observed local Node 24.11.1 needs same-line runtime maintenance; validate an
official current 24 artifact in project scope before changing the environment.
See GEO-207; no global runtime update or new remote CI result is claimed.

## Asset refresh procedure

1. Review `docs/ASSETS.md` for approved NASA source URLs and naming rules.
2. Replace only optimized runtime assets inside `public/assets/earth/`.
3. Keep the placeholder map smaller than `100 KB` if possible.
4. Run `npm run build` and verify there are no broken asset paths under `/Geo/`.
5. Update `docs/ASSETS.md` with the new source URL, date, and file size.

## Performance budgets

- Default balanced mode should feel smooth on integrated desktop GPUs.
- Runtime Earth assets should stay under roughly `2.5 MB` combined unless a justified visual gain is documented.
- Investigate any production JS bundle warning increases before merging.

## Release checklist

- `npm ci`
- `npm run lint`
- `npm run test`
- `npm run test:data`
- `npm run verify:data`
- `npm run build`
- `npm run test:e2e`
- `npm run test:e2e:matrix` (desktop Chromium/Firefox; dev-root commands in QA)
- `npm run format` (record existing failures; format changed files explicitly)
- Manual browser/device verification against `docs/QA.md`
- Confirm share URLs restore the same view
- Confirm GitHub Pages pathing works under `/Geo/`

## Release authorization and data

Follow [AGENT_AUTONOMY_POLICY](docs/AGENT_AUTONOMY_POLICY.md): local work is allowed;
commit/push/PR/merge/deploy are not authorized without a request. PR/main CI does
not publish. The Pages deployment workflow requires manual dispatch from main
and explicit confirmation of completed release review. Keep the Pages source set
to GitHub Actions, not legacy branch-root publishing. Local tests and a merged PR
are not a successful deployment or a waiver of the source/security gates.

Review [DATA_POLICY](docs/DATA_POLICY.md) and the source catalog before adding assets.
Historical Basemaps research is quarantined outside public and must not be staged.
Do not rebuild the large border assets until immutable inputs and topology QA are
established. No paid services or automatic billing. Existing remote map providers
have availability/terms constraints; local Earth/Borders remain the fallback.

## Rollback

- Revert the offending commit.
- Redeploy via GitHub Actions.
- If the regression is asset-related, restore the previous files in `public/assets/earth/`.

## Troubleshooting priorities

- Blank canvas: check WebGL support, asset paths, and console texture-load errors.
- Wrong GitHub Pages asset URLs: check `vite.config.ts` `base` and public asset references.
- Interaction drift or snapping: inspect `src/scene/GlobeController.tsx` and `src/lib/math.ts`.
- Wrong coordinates or preset framing: inspect `src/lib/geo.ts` and `src/lib/constants.ts`.
- Visual degradation: inspect `src/scene/Earth.tsx`, asset file sizes, and quality-mode behavior.
