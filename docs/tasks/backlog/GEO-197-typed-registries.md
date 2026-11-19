# GEO-197 Minimal source layer style capability registries

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-197-typed-registries` (create when claimed)
- Dependencies: GEO-190/191; existing adapters

## Why and starting evidence

Let UI extend source-backed layers without mixing scope, workspace and renderer.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

new small domain modules plus adapter boundaries; avoid simultaneous central App/store rewrites.

## Acceptance criteria

- [ ] Introduce typed build-time source/layer/style/tool definitions with stable IDs and explicit available/limited/planned/unavailable reasons.
- [ ] Reuse existing Headway/Borders adapters; keep full geometry and GPU instances outside Zustand/React state.
- [ ] Retain source revision, rights/evidence status, time basis, zoom/LOD, legend and attribution requirements.
- [ ] Use one command per action across UI/shortcut entrances; no runtime plugin marketplace or empty framework directories.

## Implementation and rollback

Start with one complete small pilot. Preserve existing assets/format decoders and
fallback paths until verified. Split further tasks if this scope cannot be fully
checked. No broad reformat, unapproved data publication or unrelated dependency
major changes.

## Verification

NOT RUN; implementation has not started. Required: clean install when dependencies
change, lint, unit/data tests, production build, changed-file formatting, relevant
E2E and manual output inspection. Record physical-device vs emulated evidence,
rights/attribution review and any blocked checks explicitly.

## Implementer self-check

- [ ] Scope complete
- [ ] Checks and limitations recorded

## Reviewer verification

- [ ] Independent changes review
- [ ] Acceptance criteria confirmed
- Notes: pending; keep review distinct from implementation evidence.

## Handoff

Update STATUS, TASKBOARD, affected contracts and source review records. Leave
exact next commands/fixtures and unresolved owner decisions (or none).
