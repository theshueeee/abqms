# Update traceability and related documentation

Use this workflow whenever code, schema, configuration, tests, or documentation changes.

## Source-of-truth order

1. Read `docs/SPEC.md`, `docs/index/business-rules.md`, and `docs/index/roles-and-rbac.md`.
2. Read the owning `docs/features/F-NN-*.md` file and its cited API/data-model documents.
3. Use `docs/requirements/open-questions.md` for any affected `OQ-NN` or `D-NN`.
4. Keep delivery status in `docs/traceability.md`; do not duplicate requirements there.

## Required synchronization

- Update the owning feature's requirements, acceptance criteria, test plan, and verification date.
- Update directly affected `docs/api/*.md` and `docs/data-model/*.md` files.
- Update the feature-board row and every affected `FR-*` row in `docs/traceability.md`.
- Update `docs/PROGRESS.md` in the same task with the change, validation result, delivery status, and
  next logical task.
- Update `docs/requirements/open-questions.md` only when a decision changes; never invent an answer.

## Status and validation

Use only `open`, `specified`, `built`, `tested`, or `shipped`. Move a feature to `tested` only
after every test-plan item in scope passes. Keep a feature blocked when an open question or missing
route still prevents delivery, even if its implemented slice is tested.

Before committing, run the smallest relevant test/typecheck/build commands, review the final diff
for documentation/code disagreement, confirm no secrets are included, and record the exact
validation commands in the progress log.
