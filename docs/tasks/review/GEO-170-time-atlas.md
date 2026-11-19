# GEO-170 Time atlas foundation

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-170-time-atlas`
- Dependencies: existing viewer, scopes, and observation provenance

## Objective

Preserve Earth as the starter screen and add an extensible geography-through-time
workspace for borders, people/rulers, culture, and dated imagery.

## Deliverables

- [x] Separate lazy-loaded workspace with map, timeline, perspectives and scope.
- [x] Validated dated GeoJSON and XYZ raster-frame contracts, sources and uncertainty.
- [x] Sourced location authoring, local persistence and atlas import/export.
- [x] Explicit modern reference map and empty historical coverage states.
- [x] Product/roadmap update and focused historical-content follow-up tasks.
- [x] Final verification and evidence.

## Verification

- `npm run check`: lint clean, 217 tests in 28 files passed, one data-builder
  test passed, TypeScript and production build passed. Existing large main-bundle
  warning remains. The final browser run rebuilt the Pages output successfully.
- Focused temporal validator/workspace tests: 18 passed.
- `npm run test:e2e`: all 19 Chromium tests passed in 1 minute, including
  the existing startup popup, camera, Borders URLs and animation flows.
- After adding tile-loading feedback and waiting for physical map tiles before
  screenshot capture, all three temporal browser tests passed again in 19.6 seconds.
- Final App/temporal unit regression run: 45 tests passed; final lint passed.
- Desktop and mobile test PNGs were inspected; they depict explicitly fictional
  fixtures. Desktop framing, real physical reference tiles, date selection, mobile
  overflow, marker authoring, rejected duplicate imports, persistence and file
  export were verified. Images are generated test artifacts, not bundled content.
- Changed-file formatting, relative documentation links and diff whitespace checks
  passed. No new dependency or boundary-asset regeneration.
- Initial concurrent browser runs timed out under software WebGL contention.
  The repository configuration now serializes WebGL browser tests. A broad unit
  selector for the existing Atlas map style was scoped to its Layout section to
  distinguish it from the new Time atlas button.
- Existing startup-popup edits, global CSS edits and smoke-test edits were already
  present on entry. They are preserved and not claimed as this task's work.
- The running development server uses port 6001. Browser tests now use a separate
  production preview on 6002 and do not reuse arbitrary existing servers; this
  prevents testing local-dev URL behavior as though it were the Pages build.

## Scope limits

No real historical datasets or dated imagery provider are bundled. Author-entered
confidence and sources are not independent historical verification. Layer periods
are yearly/inclusive; astronomical years support BCE. Atlas JSON transfers layers,
not camera animations, hosted links, or video. Storage is per browser/device/origin.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: no independent review claimed.
