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

## MapLibre security backport

MapLibre GL JS 5.21.0 is BSD-3-Clause licensed. GEO-204 applies the upstream
[attribute-snapshot security fix](https://github.com/maplibre/maplibre-gl-js/commit/1da69f3cd913a39fa948708e01478663bf48bc27)
locally on installation, preserving copyright/license notices and required map
credits. It does not change the upstream package version or claim a new release.
The original package notice remains at `node_modules/maplibre-gl/LICENSE.txt`.
See [SECURITY](docs/SECURITY.md) for exact file hashes, verification, disabled
dependency bundle source-map comments and the future removal procedure.

## NASA imagery attribution

Geo ships with optimized derivatives of NASA Earth imagery for runtime use. NASA imagery is not released under the project’s MIT software license; it remains subject to NASA media usage guidance.

Current included Earth assets:

- `earth-day-5400.jpg`: derived from NASA Blue Marble Next Generation base map, May composite.
- `earth-day-1024.jpg`: local downscaled placeholder derived from the same NASA source.
- `earth-night-3600-gray.jpg`: derived from NASA Black Marble 2016 grayscale map.

Required attribution language for docs or project pages:

`Earth imagery courtesy of NASA Earth Observatory / NASA Earth Science. No endorsement implied.`

## Historical boundary research - not published

The earlier local pilot selected Andre Ourednik's
[Historical Basemaps](https://github.com/aourednik/historical-basemaps/tree/4b5039e50d8d2464b065bd76ad6086cd4597108d)
at revision `4b5039e50d8d2464b065bd76ad6086cd4597108d`. Its upstream GPL-3.0
notice was retained, but contributing-map redistribution rights have not been
established. The owner requires a production hold. The existing five research
files and their notices were preserved unchanged in ignored local cache; no
historical geometry is redistributed in the default runtime build.

This is not a conclusion that the upstream license is invalid. It distinguishes
an upstream notice from completed component-rights review. See the
[source catalog](data/catalog/README.md), [DATA_POLICY](docs/DATA_POLICY.md) and
[pilot notes](docs/HISTORICAL_PILOT.md). Never relabel these data as MIT or stage
quarantined source geometry for publication. User-imported atlas files are
private author-supplied records and retain their source/license metadata.

## Asset notes

- The procedural cloud layer is generated at runtime by project code.
- Replacement assets must be documented in `docs/ASSETS.md`.

## Development dependency notices

GEO-206 updates existing security-affected chains without introducing a direct
runtime dependency or changing existing package license metadata. Two new
development-only children are resolved: `@humanfs/types` 0.15.0 declares Apache-2.0
and `@isaacs/nonrecursive-glob-match` 1.1.0 includes a BlueOak-1.0.0 `LICENSE.md`.
The latter is used by minimatch 11; that license was already used by the installed
minimatch family. Preserve the included notices and
[Blue Oak license link](https://blueoakcouncil.org/license/1.0.0) when redistributing
dependency copies. The types package's Apache metadata and its parent humanfs
license are recorded as observed evidence, not a complete component-rights audit.
These lint dependencies are not newly imported by the Pages application. See
[the version ledger and scope](docs/audits/GEO-206-dependency-maintenance.md).
