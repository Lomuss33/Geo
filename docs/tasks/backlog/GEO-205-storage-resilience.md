# GEO-205 Preference and draft storage resilience

## Status

- State: backlog
- Priority: P1
- Owner: unclaimed
- Branch: `geo/geo-205-storage-resilience` (create when claimed)
- Dependencies: GEO-192; preserve existing animation and atlas contracts.

## Evidence and scope

The audit found direct localStorage calls in App preference effects, Help
dismissal and viewerStore draft reads/writes. Theme and Time atlas have catches,
but they do not establish whole-app resilience when browser storage throws.
Do not claim session-only fallback universally.

## Acceptance criteria

- [ ] Denied reads at fresh startup retain usable Earth/default preferences.
- [ ] Denied writes do not trap Help or interrupt editing/playback; failed saves
      distinguish session state from persisted state and offer backup guidance.
- [ ] Preserve existing keys/formats and corrupt-but-recoverable data; no silent
      deletion or overwriting of user projects.
- [ ] Cover denied read/write, quota failure, corrupt draft, normal reload and
      session behavior across theme/help/animation/atlas boundaries.

## Verification and rollback

NOT RUN; no implementation. Use injected Storage failures and behavior tests,
then lint/unit/build/E2E. Keep helpers small; do not invent another project store
or pretend a failed write saved. Revert only this increment if needed.

## Review and handoff

Self-check pending; independent review pending. Update STATUS and TASKBOARD with
actual commands and remaining browser/device limits. Source rights/security gates
remain separate.
