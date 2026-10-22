# Working on Geo

Geo is becoming a browser geography studio for exploring data, learning geography,
and creating shareable clips. Read these files before choosing implementation scope:

1. `docs/PRODUCT.md` — purpose, geographic scopes, and first complete workflow.
2. `docs/ROADMAP.md` — delivery order and deferrals.
3. `docs/STUDIO_CONTRACTS.md` — proposed data, project, sharing, and export contracts.
4. `docs/ARCHITECTURE.md` and `docs/tasks/TASKBOARD.md` — implementation and tasks.
5. `CONTRIBUTING.md` — task lifecycle, branch naming, and required checks.

## Execution

- Claim one ready task and read its dependencies and acceptance criteria. Use a
  focused `geo/<task-id>-<slug>` branch and update its evidence and taskboard.
- Progress within the authorized task without asking about routine implementation
  decisions. Record assumptions; ask when a missing decision blocks correctness
  or materially changes scope.
- A request for agentic preparation does not by itself request parallel agents.
- Never claim checks, browser verification, reviewer approval, or export support
  that has not been observed. Keep self-check and reviewer evidence distinct.
- Do not commit, push, publish, or open a PR unless requested by the user.

## Design constraints

- Preserve Geo, Headway, Borders, existing share URLs, and animation v1/v2 imports.
- Separate geographic scope (`balkans`, `europe`, `world`) from rendering mode and
  from Explore / Learn / Create workflows. They are different concepts.
- Prefer domain modules for scopes, datasets, projects, and exports rather than
  adding all studio behavior to `App.tsx` or the existing viewer store.
- Keep the browser and static GitHub Pages deployment sufficient for the initial
  workflow. Headway needs remote tiles; do not claim full offline support.
- Retain observation years, units, sources, coverage, and missing values. Never
  substitute zero for unavailable data or silently mix years in comparisons.
- Exports use the saved scene/timeline, preserve required attribution, and
  advertise only formats supported by the active browser.
- Validate imported file versions, types, finite numbers, identifiers, and resource
  limits before mutating state. Treat imported text as text, never executable HTML.

## Verification

- Follow `CONTRIBUTING.md`: lint, unit tests, production build; E2E for interaction
  or UI changes. Test contracts, migrations, imports, and export transformations.
- Verify Pages asset paths when changing loading or exports. Do not regenerate
  large boundary assets incidentally.
- Format documentation and verify links. Documentation-only work needs no new
  behavior tests or browser screenshots.
