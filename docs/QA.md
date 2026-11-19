# QA

## Core verification commands

```bash
npm ci
npm run lint
npm run test
npm run test:data
npm run verify:data
npm run verify:security
npm run build
npm run test:e2e
npm run test:e2e:matrix
npm run format
```

## Evidence and target matrix

[STATUS](STATUS.md) records actual runs. Target full capability on real Android
Firefox, Windows Firefox and Chrome/Edge. Record browser, OS, physical device vs
emulation, viewport and commands separately. No physical Android test has been
observed in the foundation work; its gate remains NOT RUN.

Required layout cases: 320x568, 390x844, 844x390, 1024x768, 1440x900 and a larger
desktop. Test orientation, 200% zoom, long names/localized text, safe areas and
keyboard opening. GEO-194 automates all six viewport sizes in desktop Chromium
and Firefox, plus 2560px editor bounds, touch/orientation and reduced-keyboard-size
simulation. Native zoom, actual soft keyboard/safe areas and physical-device
coverage remain separate. Exact commands and fixture limits are in
[the regression audit](audits/GEO-194-regression-matrix.md).

No benchmark target is achieved merely by passing UI tests. Measure cold/warm
loads, transfer, frame p95, style switch, memory proxy and tile failures before
comparing to provisional desktop/mobile budgets. Desktop simulation does not
replace a real Android Firefox measurement.

Owner targets below are **unmeasured hypotheses**, not release results:

| Metric                                     | Desktop target   | Real Android Firefox target       |
| ------------------------------------------ | ---------------- | --------------------------------- |
| First useful map                           | <=2.5s           | <=5s at controlled ~3Mbps / 150ms |
| Navigation / frame p95                     | ~60 FPS / <=20ms | ~30 FPS / <=40ms                  |
| Ready-data style switch                    | <=400ms          | <=800ms                           |
| Mandatory tile failures in controlled test | 0                | 0                                 |
| Explore JS heap orientation                | ~300MiB          | ~150MiB                           |

Use these to design GEO-203 measurements, not to remove important geometry or claim
device compatibility. Heap is a proxy, not total GPU memory. Source cautions are
in [the research leads](research/SOURCE_SHORTLIST.md).

## Manual checks

- Local dev loads from `/` with no missing textures.
- Preview / Pages loads from `/Geo/` with no missing textures.
- Left drag rotates smoothly.
- `Shift+drag` or right drag rolls the view.
- Mouse wheel zooms without clipping through the globe.
- Double-click recenters the clicked location.
- `R` resets the view.
- In Geo compare mode, picking Brazil, Greenland, the UK, or Japan pins a live outline that stays registered to the country coastline while zooming.
- While compare is pinned, left drag, right drag, and `Shift+drag` keep moving the globe and the pinned outline follows the country instead of staying screen-centered.
- While compare is pinned, starting a drag directly over the projected outline still rotates the globe and the pinned outline follows the country.
- While compare is pinned, starting a drag over the compare label copy still rotates the globe, while the compare buttons remain clickable.
- While compare is pinned, starting a drag over empty gap space inside the action row still rotates the globe unless the pointer is directly on a button.
- While compare is pinned on a mobile-width layout, the wrapped action row still only blocks direct button hits.
- While compare is pinned, dragging the selected country behind the globe hides the projected outline and leaves the fallback compare chip usable.
- While compare is pinned and the fallback chip is visible, starting a drag over the fallback copy still rotates the globe.
- `Release outline` returns compare to `armed`.
- `Done` returns compare to `off`.
- `Cancel` from armed compare returns compare to `off`.
- Opening the animation editor shows Geo start-pose fields for latitude, longitude, distance, roll, and FOV.
- Open editor remains disabled during renderer startup/failure and becomes usable
  after successful initialization or retry; a cold click must not flash and close it.
- Large desktop viewports (`1600x900` or similar) open in dual-rail mode with both rails visible and a comfortable scene center.
- Mid-size desktop/tablet viewports (`1366x768`, `1024x768`) use the compact single-rail shell so only one rail is open at a time.
- Short landscape viewports (`844x390`) keep the workspace in stacked mode instead of letterboxing the editor.
- Editing and applying the Geo start pose updates the locked workspace preview without requiring live camera movement.
- The animation workspace keeps camera interaction locked while open and explains that clips evaluate from the saved start pose.
- Desktop animation editing opens inside a bounded centered frame instead of stretching edge-to-edge.
- Playback shows an overlay with current time, total duration, a visible stop control, and `Esc` still stops playback.
- Importing a legacy version-1 animation hex upgrades it to a working draft with the default Europe / Africa start pose.
- Local dev interaction does not append `?view=` automatically.
- Share link reproduces the same view after reload.
- Quality switching changes fidelity without breaking interaction.
- Fullscreen enter/exit works.
- Headway attribution remains visible, and compact zoom/compass controls only appear in non-persistent shells.
- A fresh visit opens Earth without a required modal. Help opens the brief on
  demand; theme, keyboard scrolling, Tab loop, Escape and focus return work.

## Accessibility checks

- Select Balkans / Europe / World without changing Geo / Headway / Borders mode.
- Search by country code or alias (for example HRV / Hrvatska / Croatia); Tab to
  the result and Enter to navigate. Typing must not trigger viewer shortcuts.
- Croatia navigation from a distant globe approaches Croatia's surface anchor;
  the latitude must not drift to North Africa during the camera transition.
- Selecting Kosovo reports missing bundled globe-outline coverage and leaves
  the camera unchanged. Regional and district coverage are shown separately.
- Narrowing the scope retains in-scope explorer selections and explains cleared
  out-of-scope selections. Frozen/playback state disables explorer navigation.

- All visible controls are keyboard focusable.
- Buttons have readable labels.
- Reduced-motion mode removes non-essential motion.
- HUD text remains legible over the scene.

## Visual checks

- Atmosphere rim is visible on the globe edge.
- Night illumination is visible on dark hemispheres.
- Cloud layer remains subtle and not opaque.
- No major panel overlap on narrow mobile widths.

## Data and geography gates

- Blocked source packages must be absent from public/ and the Pages output.
- Private imports remain usable when a first-party source is suspended; failures
  do not overwrite saved data. Source claims, terms and modified text survive export.
- Test BCE/CE conversion, source-specific intervals and snapshot gaps. A modern
  basemap beneath historical data is identified as a modern reference.
- The source-hashed geographic regression manifest covers Neum/Dubrovnik,
  islands/enclaves, Brcko, Sava/Drina/Una, Neretva/Busko jezero and antimeridian at
  country scale. Fine coast/district/river/lake/holes/seams accuracy still needs
  immutable inputs and topology QA in GEO-195/GEO-196. Existing coarse projection
  tests do not establish that precision.
- Future DEM checks need known heights, vertical datum, NoData, encoding and tile
  continuity across the Dinarides/Adriatic region. Current optical bump is not DEM.
- Renderer security, attribution and external-provider failure behavior are release
  gates; passing the unit suite does not settle dependency advisories.

Attribution security changes also need `npm run test:security:dev` to exercise
Vite's optimized dependencies, plus the production canaries included in E2E.
The optional Firefox DOM/control fixture is documented in [SECURITY](SECURITY.md);
it does not establish Firefox rendering or Android device coverage by itself.
The separate GEO-194 desktop Firefox matrix exercises renderers and shell using
local geometry and a controlled Headway style, not remote-provider availability.
