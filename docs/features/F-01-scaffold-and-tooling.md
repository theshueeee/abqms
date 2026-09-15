---
id: F-01
title: Scaffold & Tooling
spec_status: blocked
delivery_status: open
blocked_by: [D-01, D-02, D-03, D-04]
parent: docs/SPEC.md
related: [api/_conventions.md, requirements/open-questions.md]
last_verified: 2026-09-15
---

# F-01 — Scaffold & Tooling

## Purpose

Establish the runnable skeleton every later feature is built on: repo layout, config, database
connection, test runner, and a health endpoint.

## In scope

Repo/app layout, local environment configuration, test tooling, Prisma + first migration, HTTP server
with `GET /api/health`.

## Out of scope

Any domain behaviour (auth, booking, queue, analytics).

## blockers

`D-01`…`D-04` in `requirements/open-questions.md` must be answered first — frontend framework, repo
layout, test framework, and deployment/CI target. This is the only feature in the spec blocked by
*stack* decisions rather than domain questions. (`D-05` OCR provider and `D-06` email integration are
recorded there too, but they block `F-07` and `F-14`, not the scaffold.)

## Requirements

- `FR-SCAF-01` Repository layout matches `D-02` (single app vs `apps/api` + `apps/web`).
- `FR-SCAF-02` Local configuration is read from environment variables with a committed example file
  and **no secrets in the repo**.
- `FR-SCAF-03` A test runner is configured and `npm test` (or equivalent) runs a passing suite.
- `FR-SCAF-04` Prisma is connected to a development database and an initial migration applies cleanly
  from scratch on a fresh clone.
- `FR-SCAF-05` `GET /api/health` returns 200 with a minimal JSON body and requires no auth.
- `FR-SCAF-06` Documented one-command local start procedure.

## Acceptance criteria

1. **Given** a fresh clone and configured `.env`, **when** the documented setup commands run, **then**
   the database schema is created with no manual steps.
2. **Given** the server running, **when** `GET /api/health` is called, **then** the response is
   `200` with a JSON body.
3. **Given** the repo, **when** the test command runs, **then** the suite passes and exits non-zero on
   failure.
4. **Given** the repository contents, **when** searched for credential patterns, **then** no secret
   values are committed.

## Test plan

| Level | What | Fixture |
|---|---|---|
| Smoke | health route returns 200 | none |
| Build | migration applies on an empty database | `preflight-db` |
| Config | app refuses to boot with a missing required env var | none |

## Commit scope (single commit)

`chore(F-01): scaffold app, prisma baseline, test runner, health route` — update `traceability.md`
row for `F-01` to `tested` only after the suite passes.