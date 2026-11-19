# GEO-160 Browser image and clip exports

## Status

- State: backlog
- Owner: unclaimed
- Branch: `geo/GEO-160-media-exports` (create when claimed)
- Parent: studio roadmap
- Dependencies: Feasibility after GEO-095; delivery after GEO-130, GEO-140, GEO-150

## Objective

Complete the Balkans journey with clean stills and browser-supported captioned video.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [ ] Early feasibility report for Geo/Headway/Borders canvas capture, remote tiles, and overlay composition.
- [ ] PNG and verified WebM export; runtime MIME detection and conditional MP4.
- [ ] 16:9, 1:1, 9:16 presets, loading readiness, progress, cancel, and resource cleanup.

## Acceptance criteria

- [ ] Export matches saved project framing/timing and includes captions, legend, and attribution.
- [ ] Editing controls are absent and requested dimensions match actual output.
- [ ] Unsupported codecs and unreadable/failed tile capture produce clear fallbacks without destroying drafts.
- [ ] File extension matches actual container; inspect a playable three-country 15-second export.
- [ ] End-to-end journey includes project/data export, restored view URL, and media playback; record tested browsers.

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
