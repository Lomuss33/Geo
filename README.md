# Geo

Geo is a cinematic 3D Earth viewer for GitHub Pages. It uses `React 19`, `TypeScript`, `Vite`, `Three.js`, and `React Three Fiber` to deliver a desktop-first globe that can be rotated on all three axes with a mouse.

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
- Fullscreen toggle and onboarding overlay.
- Responsive layout that keeps desktop as the primary target.

## Local setup

```bash
npm install
npm run dev
```

Open the local Vite URL in Edge or another modern Chromium browser.

Local development uses:

`http://localhost:5173/`

## Project commands

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
npm run test:e2e
npm run check
```

For Playwright on a fresh machine:

```bash
npx playwright install chromium
```

## Deployment

- Local dev serves from `/`; Pages build and preview serve from `/Geo/`.
- `.github/workflows/deploy.yml` builds the site and deploys `dist/` to GitHub Pages.
- Push to `main` or trigger the workflow manually from the Actions tab.

### GitHub Pages setup

1. Push this repository to GitHub.
2. In `Settings -> Pages`, set `Source` to `GitHub Actions`.
3. Keep the default branch as `main`.
4. Push to `main` and wait for the `Deploy Geo` workflow to finish.

Notes:

- The Pages build base path is inferred from the GitHub repository name during Actions builds.
- Local development still uses `/`.
- If you publish this as `<user>.github.io`, the Pages base resolves to `/`.

## Docs map

- `MAINTENANCE.md`: release, dependency, and troubleshooting workflow.
- `CONTRIBUTING.md`: branch, task, and review rules.
- `THIRD_PARTY.md`: code licenses and NASA attribution.
- `docs/ARCHITECTURE.md`: rendering, control, and state flow.
- `docs/ROADMAP.md`: milestones and deferred features.
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
5. Open a PR using the repository template.
