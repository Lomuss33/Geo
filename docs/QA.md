# QA

## Core verification commands

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Manual browser matrix

- Edge on Windows 11: required
- Chrome desktop: required
- Firefox desktop: required

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
- While compare is pinned, dragging the selected country behind the globe hides the projected outline and leaves the fallback compare chip usable.
- Opening the animation editor shows Geo start-pose fields for latitude, longitude, distance, roll, and FOV.
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
- Onboarding can be reopened from Help.

## Accessibility checks

- All visible controls are keyboard focusable.
- Buttons have readable labels.
- Reduced-motion mode removes non-essential motion.
- HUD text remains legible over the scene.

## Visual checks

- Atmosphere rim is visible on the globe edge.
- Night illumination is visible on dark hemispheres.
- Cloud layer remains subtle and not opaque.
- No major panel overlap on narrow mobile widths.
