# GEO-150 Location keyframes and captioned clip authoring

## Status

- State: backlog
- Owner: unclaimed
- Branch: `geo/GEO-150-clip-authoring` (create when claimed)
- Parent: studio roadmap
- Dependencies: GEO-120

## Objective

Make a three-location 15-second story easy to author using the existing animation engine.

Read `docs/PRODUCT.md`, `docs/STUDIO_CONTRACTS.md`, and `AGENTS.md`.

## Deliverables

- [ ] Named location keyframes, transition/easing controls, and timed captions.
- [ ] A Balkans three-country template and landscape/square/portrait framing.
- [ ] Versioned timeline extension or migration documented before changing the timeline schema.

## Acceptance criteria

- [ ] Future time-story keyframes carry both camera pose and atlas year/layer
      state; preview never substitutes missing historical or imagery frames.

- [ ] An author can select three locations and preview a 15-second captioned sequence.
- [ ] Legacy command timelines retain deterministic saved-start-pose behavior.
- [ ] Scrubbing and playback agree at keyframes and annotation boundaries.
- [ ] Project round-trip retains timing, framing, keyframes, and captions; E2E covers authoring.

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
