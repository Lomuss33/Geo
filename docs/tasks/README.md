# Task Workflow

## Status folders

- `backlog/`: ready to claim
- `in-progress/`: actively being implemented
- `review/`: waiting for verification
- `done/`: self-check and reviewer verification both completed
- `temp/`: scoped subtasks spawned from a parent task

## How to claim work

1. Move the task markdown into `in-progress/`.
2. Add your name and branch in the task file.
3. Create temp subtasks if the task grows beyond one focused deliverable.
4. Keep acceptance criteria and verification commands current.

## Closing rules

- Parent tasks cannot move to `done/` until temp tasks are resolved or explicitly deferred.
- “Done” requires:
  - implementer self-check completed
  - reviewer verification completed
  - `TASKBOARD.md` updated

## Evidence expectations

- Commands actually run
- Browser or environment used
- Any known residual risk
