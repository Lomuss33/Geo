# GEO-207 Remaining glob advisory and Node runtime maintenance

## Status

- State: backlog
- Priority: P1 before a new public release; independent mobile/regression work may proceed
- Owner: unclaimed
- Branch: `geo/geo-207-toolchain-security` (create when claimed)
- Dependencies: GEO-204/206 self-check evidence and integrity-locked MapLibre patch

## Evidence and bounded pilots

The 2026-11-18 [GEO-206 audit](../../audits/GEO-206-dependency-maintenance.md)
leaves two root advisory IDs: the locally patched MapLibre version finding and
picomatch GHSA-fc5q-39xc-vjpf, which has no published fixed version. Its 12 high
package reports are development/tooling chains, not 12 independently reproduced
application exploits. npm's suggested Vite/Vitest/TypeScript-ESLint downgrades
are unverified and must not be applied automatically.

The machine uses Node 24.11.1 (built-in Undici 7.16.0 / OpenSSL 3.5.4). The official
November security release provides Node 24.22.3. npm undici 7.30.2 does not patch
the executable. Geo's deployed application is static, but dev/build tooling still
requires runtime maintenance.

Claim one pilot at a time: a verified project-scoped same-line Node update is
feasible independently; a picomatch fix needs fresh upstream evidence. Do not
alter global PATH, a version manager or other projects incidentally. A renderer
major migration is separate compatibility work, not a shortcut for this task.

## Acceptance criteria

- [ ] Capture current registry/advisory/runtime evidence and preserve the lock
      and MapLibre checks; distinguish changed metadata from changed packages.
- [ ] Verify an official current Node 24 artifact and published checksum in an
      ignored project-specific cache, observe its built-in versions and repeat
      clean install/check/security/E2E before adopting it for this project.
- [ ] Recheck for a published picomatch fix or reviewed upstream backport;
      reproduce the relevant failure safely with bounded resources before a
      local patch. Preserve legitimate globs and every dependent tool contract.
- [ ] If no fix is available, retain the explicit release gate and exact next
      evidence needed; do not suppress or label the advisory resolved.
- [ ] Any proposed major tool/renderer replacement includes a concrete isolated
      compatibility plan and follows the owner policy before adoption.

## Verification and rollback

NOT RUN; no implementation claimed. Use the previously supported executable as
a project-local fallback while validating the newer one. Never roll back the
MapLibre patch or overwrite user projects to make maintenance checks pass.

## Review and handoff

Implementer and independent verification pending. Update STATUS, SECURITY and
TASKBOARD with exact observed versions, checks and remaining root findings. No
scheduler, automatic global install, commit, push or publication is implied.
