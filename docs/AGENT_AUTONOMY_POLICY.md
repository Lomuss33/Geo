# Agent autonomy and authorization

Owner policy adopted 2026-11-16. Maintainer: active task owner.

Agents may independently audit, research, run checks, create focused local
branches, fix bugs, implement compatible increments, and maintain documentation
and the backlog within [PRODUCT_VISION](PRODUCT_VISION.md).

The existing explicit repository rule remains: **do not commit, push, open a PR,
merge or publish unless the owner requests it**. The master's conditional class-A
examples do not revoke this narrower existing policy. Prepare reviewable local
work and continue other independent tasks. Do not ask for publishing permission
merely to finish ordinary local work.

The owner's 2026-11-19 request authorizes the bounded GEO-208 integration:
commit/push the prepared work, open a PR and merge after checks pass. It does not
waive data/security release gates or grant standing permission for future work.
CI and repository integration are separate from manual Pages publication.

Paid services, billing exposure, mandatory accounts/backend and hidden tracking
are excluded by the product constraints. Destructive changes to user files,
license changes, major compatibility changes and disputed legal decisions require
a concrete owner decision when research cannot resolve them. Preserve a fallback
and validate before changing portable data.

No scheduler, unattended auto-merge or background agent execution is configured.
Autonomy applies while a session is active. Record exact context in
[STATUS](STATUS.md) so the next session can resume without chat history.

Optional delegation requires a narrow task, explicit file ownership and honest
evidence. Use isolated checkout contexts for parallel edits. A shared dirty tree
is not an integration strategy; read-only feedback is not independent verification
of checks the reviewer did not run. No reviewer means `review`, never `done`.
