# GEO-194 regression matrix

Implementation checks: 2026-11-18; handoff/LAN probe: 2026-11-19. Windows,
Node 24.11.1, Vite 8.1.6. Local HEAD is
`6414025aee75c2d967a092e581a8734a375e71fc` plus the preserved dirty tree on
`geo/geo-194-regression-matrix`. This is implementer evidence; independent review,
remote CI and publication have not occurred. See [STATUS](../STATUS.md).

## Bounded changes and observed failures

- Tests now require the active renderer's ready state, a visible canvas and, for
  Borders, rendered features. A fallback or empty canvas cannot satisfy readiness.
- Forced WebGL initialization failure initially broke all three renderers. Fiber
  9.5.0 left async configuration rejection outside the scene boundary; MapLibre
  constructor errors escaped the adapters. Fiber is pinned to 9.8.2 and the Geo
  scene has an error boundary; Headway/Borders catch constructor failures.
  A second run exposed the failure backdrop blocking Help. It now sits below the
  control shell and only the failure card accepts pointer events.
- Readiness notification moved from Fiber's configuration callback to a guarded
  scene commit effect after development runs logged React cross-root update
  warnings. Failed initialization cannot emit readiness from an unmounted scene.
- Inspected published Fiber 9.5.0/9.6.0/9.6.1/9.7.0 bundles lacked the async
  configuration rejection handler present in 9.8.2. Only three package version
  records change: Fiber 9.5.0 to 9.8.2, its-fine 2.0.0 to 2.1.1, and a nested
  scheduler 0.28.0. React 19.2.4 and the exact MapLibre version/backport stay in
  place. [Fiber's Canvas documentation](https://r3f.docs.pmnd.rs/api/canvas)
  explains the error-boundary/fallback contract; installed source inspection and
  before/after browser cases establish this specific repair.
- GEO-206's intermittent 2544px editor failure was not reproduced by ordinary
  cold-load diagnostics; its original cause remains unconfirmed. An independent
  `max-width: 840px` now protects the bounded frame even if its fluid width becomes
  full-screen. A controlled `width: 100vw` probe measured 2560px before the cap;
  the regression test checks the cap after four cold opens and resize cycles.
  This proves the bound without claiming to identify the original trigger.
- A Firefox orientation assertion measured a rail partway through its intentional
  180ms transform. Diagnostics showed right edge 513.7px while moving, then
  360.65px after completion. Geometry checks await finite animations on the
  element/ancestors before applying the same strict viewport bounds.
- Stronger share checks exposed actual startup changes to an explicit Geo frame:
  distance 2.4 became 5.6184, then every copied/reopened frame rotated further.
  Valid explicit Geo views bypass default startup fitting. Controller hydration
  keeps the complete frame and seeds future controls from its saved surface
  anchor. Browser checks compare the outgoing pose/zoom to the incoming payload
  and then require an identical view payload after a native share round trip.
- Geo payload validation rejects malformed tuples, zero quaternions and non-finite
  or wrongly typed distance/FOV values before treating a URL as an explicit saved
  frame. Malformed links retain the responsive default launch behavior.
- Opening an animation editor before Geo finishes initializing could briefly open
  and immediately close it. The dock now disables that action until the active
  renderer is ready, and the application handler enforces the same condition.
  A dock behavior test verifies disabled-to-ready activation; failed-GL browser
  cases also check that editing becomes available after successful recovery.

## Reproducible browser coverage

`playwright.regression.config.ts` runs 20 cases in each browser. Run sequentially
with the normal one-worker configuration to avoid competing GPU workloads:

```powershell
$env:GEO_MATRIX_DEV = '1'
npm run test:e2e:matrix
Remove-Item Env:GEO_MATRIX_DEV
npm run test:e2e
npm run test:e2e:matrix -- --project=firefox
npm run test:security:dev
$env:GEO_E2E_FIREFOX = '1'
npm run test:e2e -- attribution-control.spec.ts --project=firefox
Remove-Item Env:GEO_E2E_FIREFOX
```

Development matrix uses `/` on 6005, production uses the built `/Geo/` on 6002.
The default production suite also discovers all new Chromium cases. Existing
attribution dev cases use 6004. Servers use strict ports and no existing-server
reuse; they must not replace another project's listener.

| Area              | Automated coverage                                                                                                                 | Limit                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Viewports         | 320x568, 390x844, 844x390, 1024x768, 1440x900, 1600x900; cold 2560x1080 editor                                                     | Desktop browser viewport emulation                                            |
| Shell             | Both themes, square controls, Help keyboard/focus return, country search, editor open/close, horizontal bounds                     | No native browser 200% zoom or device safe-area result                        |
| Orientation/input | Portrait/landscape and reduced 390x420 viewport, retained search/theme, touch taps in narrow cases                                 | Reduced viewport is not a real soft keyboard                                  |
| Renderers         | Geo, Headway, Borders ready; Headway's five looks/credits; local Borders features                                                  | Controlled Headway background style has no remote tiles/fonts/sprites         |
| Failure/recovery  | Three blocked-GL startups/retries, two unavailable styles/Geo fallback, Geo context loss/recovery                                  | Controlled faults, not a provider availability measurement                    |
| Legacy behavior   | Mode/view/map/profile/focus URLs, actual outgoing camera values, native Geo re-share stability, animation v1/v2 import/play/Escape | Clipboard is stubbed to capture app output; OS clipboard permissions untested |
| Compare           | Actual Brazil globe pick, pinned outline, release/cancel                                                                           | No new precision claim for coarse outlines                                    |

Chromium 145.0.7632.6 uses Playwright's bundled desktop browser with SwiftShader WebGL.
Installed desktop Firefox is 146.0.1 and reports WebGL 2/AMD ANGLE on this machine.
Touch configuration in Firefox reports coarse pointer support but not a physical
Android device. Physical Android Firefox, iOS, a manual Edge matrix, native zoom,
safe areas/DPR and performance budgets remain NOT RUN.

## Geographic evidence

[The fixture manifest](../../tests/fixtures/geographic-cases.json) pins the installed
country index, ADM2 manifest and world-atlas 2.0.2 geometry by SHA-256.
[Eight unit cases](../../src/lib/geographicRegression.test.ts) verify input hashes,
actual coverage metadata, finite country camera frames, coarse outline projection
at 320px/1440px, and real multipart Fiji geometry on both antimeridian sides.
The observation year stays null; upstream release/rights review remains GEO-195.

| Named case                | Supported assertion                                  | Still pending                              |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| Neum/Dubrovnik            | HRV/BIH catalog, country frame and coarse projection | Narrow corridor/coastline source precision |
| Adriatic islands/enclaves | HRV/BIH country context and coarse projection        | Small islands, enclaves and holes          |
| Brcko                     | BIH coverage/country frame                           | District geometry and interpretation       |
| Sava/Drina/Una            | BIH/HRV/SRB country handoff                          | River alignment and epoch                  |
| Neretva/Busko jezero      | BIH/HRV country context                              | Dated hydrography/water state              |
| Antimeridian              | Real Fiji multipart/wrapped geometry and projection  | Seam/topology precision                    |

All fine-geometry reviews explicitly remain GEO-195/GEO-196. These cases are
regression baselines, not historical evidence, hydrographic data or a rights audit.
No boundary assets were rebuilt and no quarantined history package was published.

## Runs and handoff

Clean install passed in 46.2s and applied all five MapLibre patches. Initial dev
pilot: 1/5 passed, exposing three real initialization failures plus one incorrect
test label. The repaired pilot passed 6/6. First complete dev matrix: 37/40 passed;
two compare selectors and transition synchronization were corrected. A 12-case
follow-up passed 10/12 and exposed the Geo zoom defect. After zoom repair, both
Geo cases exposed rotation drift; the complete frame repair then passed both
browser share/round-trip cases. Failures are retained, not dismissed by retries.

An additional traced dev run passed 36/40. Exact pose restoration invalidated the
compare test's old close-view center-ray assumption in both browsers; the pick
fixture now uses an overview frame whose center is inside Brazil. Chromium's
1024px Borders case hit the existing 10s render deadline: all four local z1 tile
responses were HTTP 200 but took 9.8-11.5s with tracing. The four-open cold-editor
case hit its aggregate test timeout during navigation; it now has 120s for the
composite sequence, with the same geometry assertions. The original 10s product
deadline and renderer readiness assertions were not relaxed. Complete normal
runs use tracing off; the slow traced-load result remains a performance limit,
not a repaired provider or geometry claim. Performance work remains GEO-203.

The first normal run passed 39/40. Its Chromium orientation case decided whether
to open the drawer before React applied the new layout's rail-reset effect.
The test now waits for the observed orientation class and the following commit
paint before opening controls; the stored input assertion is unchanged. Three
explicit diagnostic repeats per browser passed (6/6), followed by the full runs
below. This synchronization is separate from waiting for rail CSS transitions.

First complete Pages run: 43/47 passed. Two failures expected the inactive globe
payload to remain byte-identical in map modes, although existing Pages live sync
derives that counterpart from the authoritative map frame. Tests retain strict
dev URL preservation and now validate the active outgoing map frame on Pages.
The cold-editor failure exposed the premature editor-opening path repaired above.
The injected Geo recovery case also let WebGL become available before clicking
Retry; the button disappeared before the click completed. Two unchanged focused
diagnostics passed, which alone did not establish a repair. The controlled fault
now remains active through Help and is released by the retry button's native
capture listener in the same click; readiness and absence of page errors are
still required after that explicit action.

Final complete runs passed without Playwright retries or skipped cases. Each
normal browser run used `--trace off`; the production/matrix suites used
`--reporter=line --max-failures=1`, so a complete passing count requires every
case to run. `final-checks.json` records actual successful exits/durations:

| Final check                              | Result                                                                                                                                      | Duration                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `npm run check`                          | 33 unit files / 256 tests, 8 Node tests, lint, publication guard, TypeScript and Pages build PASS                                           | 25.9s                             |
| Production Chromium                      | 47/47 PASS                                                                                                                                  | 148.2s                            |
| Development Chromium + Firefox           | 40/40 PASS                                                                                                                                  | 173.9s                            |
| Pages Firefox                            | 20/20 PASS                                                                                                                                  | 61.8s                             |
| Optimized dev attribution entrances      | 3/3 PASS                                                                                                                                    | 6.2s                              |
| Firefox installed attribution control    | 1/1 PASS                                                                                                                                    | 11.7s                             |
| Restored LAN preview, 2026-11-19         | HTTP 200, ready Geo, light theme, no page/console errors                                                                                    | Functional probe, not a benchmark |
| Formatting, local links and preservation | 32 changed files formatted; full-tree check retains 65 legacy warnings; 82 Markdown documents / 163 local links, scope and diff checks pass | —                                 |

Representative mobile viewer/editor, short-landscape and desktop editor captures
were inspected. Final production 320px and Firefox 844x390 editor captures were
also checked, along with the restored 1600x900 LAN light viewer. Frames stay within
horizontal bounds; short-height editing relies on scrolling in the current
stacked frame. This does not close GEO-202's density/full touch-target audit.
The final dev log has no observed React cross-root update warnings after moving
readiness notification to scene commit; Three's deprecated Clock warning remains.

Full-tree formatting still fails on 65 legacy files. Comparison with GEO-206's
72-file warning set shows seven removed warnings (the already-touched dock test,
view-state files and four renderer/controller files), with no introduced warning
files. All 32 files changed by this increment pass targeted formatting. Link and
scope checks cover 82 Markdown documents / 163 local links, no missing targets,
83 byte-identical inherited files outside scope and no public asset changes.
`git diff --check` passes; blocked historical assets remain outside public/dist.

Ignored logs, traces, geometry attachments and screenshots are under
`.cache/geo-194/`. The entry archive/manifest preserve 98 inherited dirty/untracked
files. The host restart cancelled the LAN dev server; completed test logs and
exit records survived, and the LAN server was restarted and probed on 2026-11-19.
Nothing was committed, pushed, merged or deployed. Remaining security gates in
[GEO-206](GEO-206-dependency-maintenance.md) and [SECURITY](../SECURITY.md) still
apply; this renderer recovery update does not clear npm advisories.
