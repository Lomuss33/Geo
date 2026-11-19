# GEO-120 Portable projects and compatible view sharing

## Status

- State: backlog
- Owner: unclaimed
- Branch: `geo/GEO-120-portable-projects` (create when claimed)
- Parent: studio roadmap
- Dependencies: GEO-100, GEO-110, GEO-197, GEO-199

## Objective

Save and restore editable stories without accounts or a backend.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [ ] Validated geo-studio-project v1 JSON with selected observation snapshots.
- [ ] Project import/export UI and documented size/count limits.
- [ ] Versioned scope/selection view links with URL-size budget and file fallback.

## Acceptance criteria

- [ ] A camera project can embed/reference a validated time-atlas snapshot,
      selected year, geographic scope, perspective and visible layer IDs without
      dropping provenance or confusing atlas files with animation-only imports.

- [ ] Project export/import preserves scene, selection, observations, annotations, output settings, and timeline.
- [ ] Malformed or oversized imports leave the active draft unchanged.
- [ ] Existing Geo/Headway/Borders links and animation v1/v2 imports still work.
- [ ] Regression tests cover round trips, migrations, rejected future versions, and incompatible dataset references.

## Verification

Not run; implementation has not started. Required: `npm run check` and
`npm run test:e2e` for interaction/UI changes. Add focused contract/regression
tests and manual export inspection where the criteria require them.

## Implementer self-check

- [ ] Scope complete
- [ ] Verification logged
- Notes: pending implementation.

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed
- Notes: pending review.
