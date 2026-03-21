# GEO-020 Asset Pipeline

## Status

- Owner: Codex
- Branch: `main`
- Parent: none
- Dependencies: `GEO-001`

## Objective

Ship optimized Earth imagery and document provenance and replacement rules.

## Deliverables

- [x] NASA day and night textures stored locally
- [x] Low-res placeholder generated
- [x] Asset documentation added

## Acceptance criteria

- [x] Runtime assets stay in `public/assets/earth/`
- [x] Docs record source URLs and file sizes

## Verification

```bash
npm run build
```

## Implementer self-check

- [x] Scope complete
- [x] Verification logged
- Notes: Current runtime imagery is documented in `docs/ASSETS.md`.

## Reviewer verification

- [x] Changes inspected
- [x] Acceptance criteria confirmed
- Notes: Runtime asset sizes are appropriate for GitHub Pages.
