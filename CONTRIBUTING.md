# Contributing

## Workflow rules

- Every change must reference a task ID.
- Use `geo/<task-id>-<slug>` for branch names.
- Keep PRs focused on one task or one tightly related temp-task set.
- Do not move a task to `done/` without completing both verification sections in the task markdown.

## Required checks

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e` for interaction or UI changes

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
