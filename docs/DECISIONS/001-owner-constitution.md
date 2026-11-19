# ADR 001 — Adopt the owner constitution incrementally

Date: 2026-11-16. Status: accepted owner direction, implementation incremental.
Owner: project owner; implementation steward: active task owner.

## Context

The supplied `GEO_MAIN_AGENT_MASTER_PROMPT.md` v1.0 supersedes older desktop-first
and Balkans-only release emphasis. Local HEAD differs from public main and has
substantial uncommitted viewer, history and UI work. A rewrite or reset would lose
working functionality. Older assertions about licenses and coverage are not proof.

## Decision

- [PRODUCT_VISION](../PRODUCT_VISION.md) holds enduring owner constraints;
  [STATUS](../STATUS.md) holds verified current state. PRODUCT defines release
  journeys, ARCHITECTURE current/target boundaries, and TASKBOARD executable work.
- Keep Geo/R3F and Headway/Borders/MapLibre. Scope, workspace, renderer, style,
  layers and historical time stay independent. Do not create empty framework
  directories or migrate every store as preparation.
- Quarantine unresolved first-party historical data, preserving local research
  and user imports. An upstream license notice is insufficient component review.
- Open directly into Earth, with Help opt-in. Preserve the existing help dialog,
  renderer fallback, URLs, imports and themes.
- Preserve the narrower existing no-commit/push/PR/publish rule. No unattended
  execution or auto-merge has been authorized or configured.

## Consequences

The historical pilot's prior technical evidence remains useful but does not grant
publication approval. Re-enable it only after source-specific review. Legacy
task records retain their historical evidence and receive explicit supersession
notes instead of being silently reset. New work is split into focused GEO tasks
with independent review still required for `done`.
