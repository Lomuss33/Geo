# Architecture

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

- `viewerStore.ts` holds current view, target view, telemetry, quality mode, and UI flags.
- `useViewportProfile.ts` derives the current shell mode, workspace mode, orientation, and legacy layout class from live viewport dimensions.
- `GlobeController.tsx` updates `view` and `targetView`.
- HUD components subscribe to narrow store slices so the overlay stays simple.
- URL serialization uses `?view=<base64url>` from `src/lib/viewState.ts`.
- Animation drafts are persisted per mode and now carry an explicit start pose.
- Workspace preview and playback always evaluate clip blocks from the draft start pose instead of capturing the live viewer state when the editor opens.

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
