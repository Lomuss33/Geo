# Contributing

## Workflow rules

- Every change must reference a task ID.
- Use `geo/<task-id>-<slug>` for branch names.
- Keep PRs focused on one task or one tightly related temp-task set.
- Do not move a task to `done/` without completing both verification sections in the task markdown.
- Start with `AGENTS.md` and `docs/STATUS.md`; preserve dirty work and reconcile
  actual HEAD with documentation. An existing renderer/source is not proof that
  all new publication or compatibility requirements are satisfied.
- Follow `docs/AGENT_AUTONOMY_POLICY.md`: do not commit, push, open PRs, merge or
  publish without a request. Local feature work does not require routine approval.
- Before handoff update STATUS, TASKBOARD and exact task evidence, separating
  self-check from independent review and physical-device testing from emulation.

## Required checks

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:data` and `npm run verify:data`
- `npm run test:e2e` for interaction or UI changes
- `npm run format`; if legacy debt remains, record it and check changed files
  explicitly rather than reformatting unrelated code or generated geometry.

Use Node 24 and `npm ci` to reproduce the lockfile. Keep source data out of the
initial bundle, verify rights/geometry/time separately, and keep research output
outside public assets. See `docs/DATA_POLICY.md`. A full source rebuild is not a
normal lint/build step.

## Task rules

- Major tasks use `GEO-###`.
- Temporary subtasks use `TMP-GEO-###-NN-slug`.
- If scope grows, split a temp task instead of overloading the parent task.
- Update `docs/tasks/TASKBOARD.md` in the same PR when task status changes.

## Review expectations

- Review should focus on regressions, controls, asset handling, and GitHub Pages compatibility.
- Include exact commands run in the PR body.
- Include screenshots or a short video for visible UI or interaction changes when practical.

## Commit guidance

- Prefer small, reviewable commits.
- Keep messages explicit, for example: `GEO-040 implement URL-synced globe controller`.
