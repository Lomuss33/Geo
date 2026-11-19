# Geo

Geo is a free public geography/history atlas and creative browser studio, built
with React, TypeScript, Three.js/R3F and MapLibre. It opens directly into realistic
3D Earth; Explore, Learn and Create are the long-term connected workflows. Global
coverage is the foundation, with extra geographical and historical depth in the
Balkans. The UI is rectangular and monochrome with dark/light themes.

Start with the [owner vision](docs/PRODUCT_VISION.md),
[current status](docs/STATUS.md), [capability inventory](docs/FEATURE_REGISTRY.md)
and [agent instructions](AGENTS.md). Studio projects, true terrain and media
exports remain planned. No account, paid API or mandatory backend is required.

## Live target

Deploy as a GitHub Pages project site:

`https://<your-user>.github.io/Geo/`

## Current feature set

- Realistic Earth presentation using local NASA imagery.
- Full 3-axis mouse interaction.
- Double-click recentering on visible points.
- Shareable exact-view URLs with `?view=<base64url>`.
- Quality modes: `performance`, `balanced`, `high`.
- Cinematic HUD with live latitude, longitude, altitude, roll, and day/night status.
- Fullscreen toggle and opt-in keyboard-accessible Help.
- Responsive viewer rails and mobile editing foundations; real Android Firefox
  compatibility is a target, with device verification still pending.
- Headway detailed map and Borders atlas with GDP/population profiles.
- Country outline comparison and administrative boundary exploration.
- Animation editor with saved start poses, playback, and timeline hex import/export.
- Balkans / Europe / World catalog scopes, country search with aliases, and coverage-aware navigation.
- Validated GDP/population observations with source years, provenance, and mixed-year warnings.
- A separate Time atlas workspace with sourced record authoring, year filtering,
  GeoJSON/dated XYZ layer adapters, and portable atlas JSON. The 1900/1938 research
  pilot is suspended for component-rights review and excluded from publication;
  private imports remain supported. No dated imagery provider is bundled.

## Local setup

```bash
npm ci
npm run dev
```

Open the local Vite URL in a modern browser. For LAN testing, use
`npm run dev -- --host 0.0.0.0` and the printed network URL. This is a development
server, not a public deployment.

Local development uses:

`http://localhost:6003/`

`npm run preview` uses port `6001`; browser tests use a separate preview on `6002`
(`GEO_E2E_PORT` can override it) so a running dev server is never reused as a
production preview. Preview serves
`http://localhost:6001/Geo/`. Both servers fail clearly if their configured port is
occupied instead of silently moving to another port.

The old dev default `6000` is browser-blocked and was superseded in GEO-193.
Development now defaults to `6003`, preview to `6001`, and E2E preview to `6002`.
An explicit `--port` override is supported. Strict ports avoid silently reaching
another project. Do not disable browser port restrictions or Vite host checks.

## Project commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:e2e
npm run check
npm run verify:data
npm run format
```

For Playwright on a fresh machine:

```bash
npx playwright install chromium
```

## Source and release gates

Read [DATA_POLICY](docs/DATA_POLICY.md) and the [source catalog](data/catalog/README.md).
`npm run build` checks blocked publication paths before creating the Pages bundle.
Historical research is optional and ignored: `npm run build:history -- --research`
and `npm run test:history:research`. Do not commit or publish quarantined geometry.
Current dependency/security and formatting blockers are recorded in STATUS;
passing local checks does not mean a public release is approved.

MapLibre's attribution fix is applied automatically by `npm ci`; normal dev,
test and build commands verify it. Read [SECURITY](docs/SECURITY.md) before
upgrading the pinned package or using `--ignore-scripts`. Attribution tests cover
both the Pages build and `npm run test:security:dev` at the dev root.

## Deployment

- Local dev serves from `/`; Pages build and preview serve from `/Geo/`.
- `.github/workflows/ci.yml` verifies PRs and `main` without publishing.
- `.github/workflows/deploy.yml` publishes `dist/` only on explicit manual dispatch
  from `main`, with `release_reviewed` confirmed after the source/security release
  gates are resolved. Pushing or merging alone does not authorize a release.
- Agents require an explicit request before commit/push/PR/merge/deploy; no
  unattended auto-merge is configured.

### GitHub Pages setup

1. Push this repository to GitHub.
2. In `Settings -> Pages`, set `Source` to `GitHub Actions`.
3. Keep the default branch as `main`.
4. Pass PR CI and merge the verified changes.
5. After release review and an explicit publication request, manually run
   `Deploy Geo` on `main` with `release_reviewed` confirmed. Check the workflow
   result before claiming a deployed site.

Notes:

- The Pages build base path is inferred from the GitHub repository name during Actions builds.
- Local development still uses `/`.
- If you publish this as `<user>.github.io`, the Pages base resolves to `/`.

## Docs map

- `docs/PRODUCT_VISION.md`: enduring owner constraints.
- `docs/STATUS.md`: verified state, blockers and next work.
- `docs/FEATURE_REGISTRY.md`: implemented, partial, planned and blocked capabilities.
- `docs/DATA_POLICY.md` and `data/catalog/`: provenance, rights and publication gates.
- `docs/DESIGN_SYSTEM.md`: neutral rectangular UI contract.
- `docs/AGENT_AUTONOMY_POLICY.md`: session work and publishing authorization.
- `MAINTENANCE.md`: release, dependency, and troubleshooting workflow.
- `CONTRIBUTING.md`: branch, task, and review rules.
- `THIRD_PARTY.md`: code licenses and NASA attribution.
- `docs/ARCHITECTURE.md`: rendering, control, and state flow.
- `docs/ROADMAP.md`: milestones and deferred features.
- `docs/PRODUCT.md`: studio purpose, geographic scopes, and first complete journey.
- `docs/GEOGRAPHIC_SCOPES.md`: scope membership, identity mappings, and coverage limitations.
- `docs/OBSERVATIONS.md`: observation schema, source timestamps, and comparison policy.
- `docs/TIME_ATLAS.md`: temporal perspectives, layer format, authoring and coverage limits.
- `docs/HISTORICAL_PILOT.md`: historical source revision, date gaps, processing and licensing.
- `docs/STUDIO_CONTRACTS.md`: proposed data, project, sharing, and export contracts.
- `AGENTS.md`: repository guidance for agent work.
- `docs/QA.md`: verification matrix and manual checks.
- `docs/ASSETS.md`: exact Earth texture sources and replacement rules.
- `docs/tasks/README.md`: how contributors claim work and close tasks.

## Repo structure

```text
.
|-- .github/
|-- docs/
|-- public/assets/earth/
|-- src/
|-- tests/
|-- README.md
|-- MAINTENANCE.md
|-- CONTRIBUTING.md
|-- THIRD_PARTY.md
`-- vite.config.ts
```

## Contribution quickstart

1. Read `docs/tasks/TASKBOARD.md`.
2. Claim a task file from `docs/tasks/backlog/` or split a new temp task under `docs/tasks/temp/`.
3. Create a branch named `geo/<task-id>-<slug>`.
4. Implement, verify, and update the task markdown with evidence.
5. Update STATUS and the taskboard. Open a PR only when requested, using the
   repository template; independent reviewer evidence is required for `done`.
