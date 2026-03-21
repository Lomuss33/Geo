# Third-Party Software and Assets

## Code license

- Project code: `MIT`, see `LICENSE`.

## Core runtime dependencies

- `react`
- `react-dom`
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand`
- `@fontsource/space-grotesk`
- `@fontsource/sora`
- `@fontsource/chivo-mono`

See `package-lock.json` for the full transitive dependency graph and resolved versions.

## NASA imagery attribution

Geo ships with optimized derivatives of NASA Earth imagery for runtime use. NASA imagery is not released under the project’s MIT software license; it remains subject to NASA media usage guidance.

Current included Earth assets:

- `earth-day-5400.jpg`: derived from NASA Blue Marble Next Generation base map, May composite.
- `earth-day-1024.jpg`: local downscaled placeholder derived from the same NASA source.
- `earth-night-3600-gray.jpg`: derived from NASA Black Marble 2016 grayscale map.

Required attribution language for docs or project pages:

`Earth imagery courtesy of NASA Earth Observatory / NASA Earth Science. No endorsement implied.`

## Notes

- The procedural cloud layer is generated at runtime by project code.
- Replacement assets must be documented in `docs/ASSETS.md`.
