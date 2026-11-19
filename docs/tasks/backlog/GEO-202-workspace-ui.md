# GEO-202 Stable workspace zones density and localization

## Status

- State: backlog
- Priority: P2
- Owner: unclaimed
- Branch: `geo/geo-202-workspace-ui` (create when claimed)
- Dependencies: GEO-197, GEO-198; historical surfaces depend on GEO-199

## Why and starting evidence

Connect many capabilities while keeping the map primary and mobile tools complete.
Read PRODUCT_VISION, STATUS, ARCHITECTURE and DATA_POLICY first. The audited HEAD
is `6414025` plus uncommitted work; recheck it before implementation. Current
findings and source/advisory URLs are in the GEO-190 reality audit.

## Scope and ownership

UI components, CSS design tokens and workspace boundaries; coordinate existing feature tasks and preserve all renderer modes.

## Acceptance criteria

- [ ] Progressively introduce fixed header/context/primary/inspector/bottom zones without free docking or a rewrite.
- [ ] Keep Simple/Balanced/Advanced density separate from quality; advanced actions remain reachable and focus survives transitions.
- [ ] Use neutral square tokens, adequate type/44px touch targets, reduced motion, keyboard and safe-area/200% zoom checks.
- [ ] Introduce BCS Latin/English/German UI infrastructure separately from sourced entity-name languages; no placeholder Learn tabs without real evidence.
- [ ] Mobile Create has preview/scenes/properties/timeline/export views preserving one project/context.

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
