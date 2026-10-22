# Roadmap

## Viewer foundation delivered

- Foundation and GitHub Pages-ready build configuration
- Cinematic single-page app shell
- Realistic 3D Earth rendering with atmosphere and cloud layer
- Full 3-axis mouse interaction
- URL-synced view sharing
- HUD telemetry, presets, fullscreen, and onboarding
- Unit tests, smoke E2E scaffold, and deployment workflow

Since the initial viewer release, the code also includes Headway, Borders,
GDP/population profiles, outline comparison, and command-timeline animation editing.

## Studio delivery sequence

Scope: [PRODUCT.md](PRODUCT.md). Contracts: [STUDIO_CONTRACTS.md](STUDIO_CONTRACTS.md).
Execution status: [tasks/TASKBOARD.md](tasks/TASKBOARD.md).

1. **GEO-090 — Preparation:** agent guidance, product brief, contracts, backlog,
   and baseline checks. No studio runtime behavior introduced.
   **GEO-095** restores the failing verification baseline before feature work.
2. **GEO-100 — Scopes and search:** versioned Balkans/Europe/World collections,
   coverage-aware country search, selection, and framing.
3. **GEO-110 — Observations:** source years, provenance, common-year comparisons,
   and missing-data behavior.
4. **GEO-120 — Projects and sharing:** validated JSON, observation snapshots,
   migration, and compatible versioned view links.
5. **GEO-130 — Data exports:** selected CSV observations and GeoJSON geometry.
6. **GEO-140 — Learn:** sourced comparison cards and one guided Balkans lesson.
7. **GEO-150 — Authoring:** location keyframes, captions, and a three-country template.
8. **GEO-160 — Media:** capture feasibility, PNG, verified WebM, aspect presets,
   and conditional MP4.

GEO-100 and GEO-110 are independent foundations after GEO-095. GEO-120 depends on both.
Investigate capture feasibility before committing to a capture design; full media
delivery depends on project and clip authoring contracts.

## First release gate

Complete the PRODUCT.md journey: three Balkan countries, sourced population
comparison, explanation, 15-second sequence, JSON/data export, view link, and a
browser-supported captioned clip. The initial scope is Balkans; Europe and World
reuse the workflow with declared data coverage and later curated lesson expansion.

GDP per capita and density follow explicit source-year and formula rules. Improve
touch authoring, accessibility, and performance based on observed workflow gaps.

## Deferred

Accounts, cloud persistence, collaboration, backend short links, live feeds,
comprehensive historical series, paid APIs, terrain, server video rendering,
and guaranteed MP4 across browsers are outside the first release.
