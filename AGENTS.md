# Working on Geo

Geo is a free, static, global geography/history atlas and creation studio with
especially deep Balkan support. It starts with realistic 3D Earth. Owner decisions
are in [PRODUCT_VISION](docs/PRODUCT_VISION.md); do not infer capabilities from it.

Read before choosing implementation scope:

1. [STATUS](docs/STATUS.md) — verified work, blockers, exact next actions.
2. [PRODUCT_VISION](docs/PRODUCT_VISION.md) and [PRODUCT](docs/PRODUCT.md) — permanent
   constraints and the release journey.
3. [ARCHITECTURE](docs/ARCHITECTURE.md), [DATA_POLICY](docs/DATA_POLICY.md) and
   [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) — implementation and contracts.
4. [QA](docs/QA.md), [MAINTENANCE](MAINTENANCE.md) and
   [CONTRIBUTING](CONTRIBUTING.md) — checks, authorization and task lifecycle.
5. [TASKBOARD](docs/tasks/TASKBOARD.md) and [ROADMAP](docs/ROADMAP.md) — execution
   order. [FEATURE_REGISTRY](docs/FEATURE_REGISTRY.md) distinguishes implemented
   capabilities from targets.

## Execution

- Claim one ready task and read its dependencies and acceptance criteria. Use a
  focused `geo/<task-id>-<slug>` branch and update its evidence and taskboard.
- Progress within the authorized task without asking about routine implementation
  decisions. Record assumptions; ask when a missing decision blocks correctness
  or materially changes scope.
- A request for agentic preparation does not by itself request parallel agents.
- Start by inspecting actual HEAD, branch, dirty files and current tasks; preserve
  other work. Follow owner direction or select the highest-value feasible task.
- On every stop, update STATUS and the task evidence with checks actually run,
  blockers and the next executable step. Work only while a session is active;
  no scheduler, unattended merge or perpetual execution is configured.
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
- No paid services, billing risk, mandatory account, API key or backend. No silent
  remote tracking. Follow [the autonomy policy](docs/AGENT_AUTONOMY_POLICY.md).
- UI is monochrome, square and usable on mobile; map data may be colored. Keep
  workspace, renderer, style, layers, scope and historical time separate.
- Preserve original historical claims, date precision, source IDs, alternative
  interpretations and uncertainty. Never invent polygons or interpolate borders
  into alleged historical facts. Modern physical geography is a dated reference.
- Source rights, technical validity, historical review and publication approval
  are separate gates. An upstream license label alone is not a component audit.
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
- Before changing MapLibre or installation scripts, read [SECURITY](docs/SECURITY.md).
  Keep the exact-version/hash backport checks and attribution canaries intact;
  an npm version advisory is not automatically cleared by a local backport.
- Format documentation and verify links. Documentation-only work needs no new
  behavior tests or browser screenshots.
