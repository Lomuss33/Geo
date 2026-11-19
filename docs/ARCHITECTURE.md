# Architecture

This file describes the existing viewer. The planned studio domains and portable
data/export requirements live in [STUDIO_CONTRACTS.md](STUDIO_CONTRACTS.md);
[PRODUCT.md](PRODUCT.md) defines release journeys. [PRODUCT_VISION](PRODUCT_VISION.md)
holds owner constraints; [FEATURE_REGISTRY](FEATURE_REGISTRY.md) records capability
status. Do not confuse this existing architecture with the target below.

## High-level stack

- UI shell: `React 19`
- Rendering: `Three.js` via `@react-three/fiber`
- Helper primitives: `@react-three/drei`
- State: `zustand`
- Build/deploy: `Vite` + GitHub Pages

## Scene graph

- `GlobeCanvas.tsx` owns the `Canvas`, camera bootstrap, lights, stars, and root scene composition.
- `Earth.tsx` renders the Earth sphere, emissive night map, and procedural cloud layer.
- `Atmosphere.tsx` adds a rim-lit additive atmosphere shell.
- `GlobeController.tsx` owns pointer input, camera distance, target interpolation, telemetry updates, and URL syncing.

## Control model

- Camera stays centered on the origin.
- The Earth group rotates instead of orbiting the camera.
- Left drag uses an arcball-style vector mapping for yaw/pitch.
- Right drag or `Shift+drag` rotates around the view axis for roll.
- Wheel changes camera distance within hard clamps.
- Double-click raycasts the sphere and animates the clicked point to screen center.

## State flow

- `geography.ts` defines versioned scope membership, country/source identities,
  search aliases, coverage, and mode-specific geographic frames.
- `geographyStore.ts` keeps explorer scope and selection separate from renderer
  state. `CountryExplorer.tsx` is memoized so viewer telemetry does not rerender
  the full catalog every frame.
- `geographyNavigation.ts` applies geographic frames using the active rendering
  mode and keeps existing Pages view sharing intact. Close-zoom country requests
  retain their surface anchor while approaching from the distant globe.

- `viewerStore.ts` holds current view, target view, telemetry, quality mode, and UI flags.
- `useViewportProfile.ts` derives the current shell mode, workspace mode, orientation, and legacy layout class from live viewport dimensions.
- `GlobeController.tsx` updates `view` and `targetView`.
- HUD components subscribe to narrow store slices so the overlay stays simple.
- URL serialization uses `?view=<base64url>` from `src/lib/viewState.ts`.
- Explicit Geo share views skip default responsive fitting. Controller hydration
  restores the full saved frame and captures its surface anchor for later input;
  it does not recenter the saved quaternion on every reload.
- Animation drafts are persisted per mode and now carry an explicit start pose.
- Workspace preview and playback always evaluate clip blocks from the draft start pose instead of capturing the live viewer state when the editor opens.
- Opening the animation editor requires the active renderer to be ready; the
  dock and application handler share this gate to prevent a boot-time open/close.

## Asset pipeline

- Runtime assets live in `public/assets/earth/`.
- Low-res Earth texture paints first.
- Balanced/high modes stream the higher-resolution texture after the initial frame.
- Clouds are generated procedurally in `src/lib/proceduralTexture.ts`.

## Performance strategy

- Quality modes adjust DPR, texture fidelity, and star count.
- Runtime imagery is local to avoid remote latency and Pages pathing issues.
- The placeholder Earth texture reduces time-to-first-frame.
- Future map overlays should prefer vector tiles or URL-backed GeoJSON, and point-heavy datasets should be clustered when vector tiling is not available.

## Files to inspect first

- Interaction issues: `src/scene/GlobeController.tsx`
- Coordinate math: `src/lib/geo.ts`
- View serialization: `src/lib/viewState.ts`
- Rendering fidelity: `src/scene/Earth.tsx`
- Visual shell styling: `src/styles/global.css`

## Current additions and known limits

- `timeAtlas.ts` validates the existing atlas v1 format and astronomical-year
  semantics; `TimeAtlasWorkspace` owns its local records and timeline. History
  time is independent of camera-animation time. It is not a studio project format.
- `theme.ts` / ThemeToggle and shared CSS provide persistent neutral light/dark
  surfaces. [DESIGN_SYSTEM](DESIGN_SYSTEM.md) defines component rules.
- `data/catalog/historical-basemaps.json` records a publication block;
  `scripts/data/check-public-data.mjs` enforces its absence from public assets.
  This single-source safety gate is not the planned full source/layer registry.
- Help is an opt-in dialog. Legacy dismissal storage remains compatible; no
  first-load modal is required after GEO-192.
- Geo uses a scene error boundary with Fiber 9.8.2's async configuration error
  forwarding; readiness is reported after scene commit. Headway/Borders catch
  synchronous MapLibre initialization errors.
  The failure card stays below the working control shell. Active renderer state
  is exposed on the scene host for readiness checks; canvas presence alone is
  insufficient. See [GEO-194](audits/GEO-194-regression-matrix.md).
- All three MapLibre adapters use the same installed package. GEO-204 applies a
  hash-locked upstream attribution sanitizer backport during install and verifies
  it before normal dev/test/build commands. No renderer API or source geometry
  changes. See [SECURITY](SECURITY.md) before updating this boundary.
- The border builder still samples/rounds polygon vertices and downloads mutable
  inputs. Camera bridges approximate scale and reset orientation. Earth color
  bump is not DEM. See [the audit](audits/GEO-190-reality-check.md).

## Target boundaries � migrate only for a concrete task

Keep one React/Vite modular monolith. Presentation emits application commands;
application navigation/selection/history services coordinate domain state;
renderers consume prepared scene/layer models; platform services handle static
assets, files and local persistence. Domain models do not import DOM/renderer
objects. A renderer does not persist projects; export does not mutate the live view.

Scope, workspace, renderer, cartographic style, layers and historical time are
independent. A GeographicViewIntent describes focus/scale/orientation separately
from renderer-specific camera state. Build-time typed source/layer/style/tool
registries and a capability resolver should extend the existing adapters, with
honest unavailable reasons. No runtime plugin marketplace or empty directory tree.

Session owns focus/selection/navigation, workspace UI owns panels/density/theme,
scene owns serializable camera/time/layers/annotations, project owns ordered scenes
and revisions, playback owns transient timing. Existing state is still broader;
separate responsibility incrementally rather than moving everything at once.
Keep large geometry, tiles, GPU resources and frequent camera frames outside
React/global store churn. No two permanently live heavy mobile WebGL scenes.

Contracts: [DATA_POLICY](DATA_POLICY.md), [OBSERVATIONS](OBSERVATIONS.md),
[TIME_ATLAS](TIME_ATLAS.md), [STUDIO_CONTRACTS](STUDIO_CONTRACTS.md). Scene/project,
historical-entity and full registry contracts remain planned and must preserve
existing imports/URLs. Work order is in [ROADMAP](ROADMAP.md) and the taskboard.
