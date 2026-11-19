# GEO-090 Studio preparation

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-090-studio-preparation`
- Parent: studio roadmap
- Dependencies: repository investigation and agreed product direction

## Objective

Prepare actionable agent guidance, product boundaries, data/export contracts,
and implementation tasks for a browser geography studio focused on Balkans,
Europe, and World. Do not implement studio runtime features in this task.

## Deliverables

- [x] Root AGENTS.md with repository entry points and execution/verification guidance.
- [x] Product brief and proposed observation/project/export contracts.
- [x] Updated README and roadmap reflecting existing versus planned capabilities.
- [x] Eight dependency-ordered implementation tasks and taskboard links.
- [x] Baseline audit, including an explicit repair task for existing failures.

## Acceptance criteria

- [x] A contributor can identify the first complete Balkans journey.
- [x] Geographic scopes, rendering modes, and user workflows are distinct.
- [x] Export contracts preserve provenance and define browser format fallbacks.
- [x] Existing URLs and timeline imports have explicit compatibility requirements.
- [x] Tasks include acceptance criteria, dependencies, and verification expectations.
- [x] No runtime changes, generated boundary assets, or new dependencies introduced.

## Verification

Commands run during preparation:

```text
npm run check
npm run test
npm run build
npx prettier --write <changed markdown files>
npx prettier --check <changed markdown files>
git diff --check
```

Additional check: Python inspection of relative Markdown links in changed documents
and taskboard-to-task coverage. Exact changed-file lists are available in git status.

Results:

- `npm run check`: fails at lint with 12 errors and 1 warning; it does not reach
  unit tests or build. These findings predate this documentation-only change.
- `npm run test` independently: 22 files and 174 tests passed.
- `npm run build` independently: passed; existing 2.36 MB minified JavaScript chunk
  warning (approximately 650 KB gzip) and plugin timing warning remain.
- Changed Markdown formatting, relative links across 16 files, backlog/taskboard
  coverage, and `git diff --check`: passed.
- No E2E or manual browser run: no UI or interaction changes made.

Baseline lint findings:

- Nine undefined Node/runtime globals across `scripts/borders/*.mjs`.
- One synchronous effect-state update in `src/components/BordersLegend.tsx`.
- Two promise callback errors and one dependency warning in `src/scene/BordersMap.tsx`.

GEO-095 owns baseline repair before studio implementation. No rules were suppressed
and no application fixes were folded into preparation.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Balkans membership is documented as a proposed launch collection, with
  Türkiye whole-country statistics and Kosovo source aliases explicitly handled.
  Europe membership is an explicit GEO-100 deliverable. Studio contracts remain
  proposed until validated runtime modules are implemented.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: independent reviewer verification pending; task intentionally remains in review.
