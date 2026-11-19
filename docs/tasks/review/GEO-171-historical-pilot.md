# GEO-171 Historical boundary pilot

## Status

- State: review
- Owner: Codex
- Branch: `geo/GEO-171-historical-pilot`
- Dependencies: GEO-170

## Objective

Curate one regional boundary dataset at multiple documented dates.

Read `docs/TIME_ATLAS.md` and `docs/PRODUCT.md`.

## Acceptance criteria

- [x] Record original source, license, geometry processing, date semantics and geographic/time gaps.
- [x] Use stable IDs for historical polities; do not assume modern ISO codes establish historical identity.
- [x] Verify before/within/after interval rendering and clearly mark approximate or disputed interpretations.

## Verification

Source review: upstream README and GPL-3.0 license inspected; source pinned to
4b5039e50d8d2464b065bd76ad6086cd4597108d. Approximate snapshots only; no exact-day
or intervening-year assertion and no independent scholarly review claimed.

`npm run build:history` produced 14 features (7 per snapshot), 147482 bytes with
license text. Original selected geometry and source properties are preserved,
with pinned source URLs and upstream-file SHA-256 hashes. Tests read actual asset
bytes rather than Vite JSON modules to avoid toolchain float reserialization.

Final verification:

- `npm run check`: lint clean; 29 files / 223 application tests passed; one
  data-builder test passed; TypeScript and production build passed. Existing
  large-bundle warning remains.
- `npm run test:e2e`: all 22 Chromium tests passed in 1.1 minutes, including
  pilot loading, exact snapshot/gap filtering, license-preserving export, and
  existing viewer, mobile, startup and concurrently added theme coverage.
- The locally running dev server returned HTTP 200 for the pilot asset.
- Source geometry equality, pinned source references, zero coverage outside the
  two snapshot years and full-license retention were checked offline.
- Async regression tests verify that records imported during a pending pilot
  download are retained and closing a download cannot overwrite later data.
- Formatting, documentation links and diff whitespace checks passed.

Existing GEO-170/GEO-115 and concurrent monochrome/theme edits were preserved;
they are not claimed as this task's implementation. No commit, push or publishing
is part of this continuation.

## Implementer self-check

- [x] Scope complete
- [x] Verification logged

## Reviewer verification

- [ ] Changes inspected
- [ ] Acceptance criteria confirmed

## Superseding source-policy decision (2026-11-16)

GEO-191 preserves this technical research but suspends first-party publication
pending component-rights review. The GPL notice/hash/source-fidelity checks above
do not constitute that review. Output moved unchanged to ignored local research;
private atlas files are retained. See DATA_POLICY and the source catalog. This
record stays review-pending and must not be called an approved shipped dataset.
