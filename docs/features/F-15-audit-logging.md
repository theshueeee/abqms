---
id: F-15
title: Audit Logging
spec_status: blocked
delivery_status: open
blocked_by: [OQ-08, OQ-22]
parent: docs/SPEC.md
related: [api/audit.md, data-model/audit-notification.md, requirements/non-functional.md]
rules: [BR-06, BR-07]
depends_on: [F-03]
last_verified: 2026-09-15
---

# F-15 — Audit Logging

## Purpose

Record every meaningful action silently and in the background, so the system is accountable without
ever slowing down or exposing itself to users.

## In scope

The cross-cutting write path for audit events, non-HTTP event coverage, the read endpoint, filtering
and retention.

## Out of scope

Analytics aggregation (`F-13`) — audit data is an operational trail, not a metric source.

## Blockers

- `OQ-08` — `AuditLog.action` is `Enum(POST, PATCH, DELETE, GET)`, so `LOGIN`, `PASSWORD_RESET`,
  `CRON_REMINDER_SENT`, `SYSTEM_FLAG` and `EMERGENCY_OVERRIDE` have no faithful representation. `user_id`
  is a bare `String` with no actor-type discriminator, so a patient ID and a staff ID are
  indistinguishable.
- `OQ-22` — retention period and any redaction policy for `details` are undefined.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-AUDIT-01` | Every mutating request writes exactly one audit row with actor, action, resource and timestamp | all |
| `FR-AUDIT-02` | Logging is **silent and non-blocking**: a logging failure must not fail the request and must not appear in any UI response (`BR-06`, `NFR-AUD-01`) | all |
| `FR-AUDIT-03` | Non-HTTP events are representable (login, password reset, cron send, automatic flag, override) — requires an action-namespace change (`OQ-08`) | — |
| `FR-AUDIT-04` | The actor's type (patient vs staff) is resolvable from every entry (`OQ-08`) | `GET /audit-logs` |
| `FR-AUDIT-05` | `details` records enough context to reconstruct what changed, with no secrets or password material | all |
| `FR-AUDIT-06` | `GET /audit-logs` is staff/admin only (`BR-07`) | `GET /audit-logs` |
| `FR-AUDIT-07` | Supports filtering by actor, action, resource and date range | `GET /audit-logs` |
| `FR-AUDIT-08` | Entries are immutable — no update or delete route exists | — |

## Acceptance criteria

1. **Given** any mutating request, **when** it completes, **then** exactly one audit row exists for it.
2. **Given** the audit sink is forced to fail, **when** a booking request is made, **then** the booking
   still succeeds and no error surfaces to the caller (`BR-06`).
3. **Given** a patient login, **when** the trail is read, **then** the entry identifies the event as a
   login by a patient actor, not an ambiguous POST.
4. **Given** a patient session, **when** `/audit-logs` is requested, **then** the response is `403`.
5. **Given** an audit payload, **when** inspected, **then** no password or token value is present.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | event-shaping function for each action type, including non-HTTP events | none |
| Integration | each mutating route emits exactly one row (route sweep driven by `api/*` inventory) | `staff-assistant` |
| Resilience | audit sink failure does not affect the response or status code | `db-failpoint` |
| Security | staff-only read; no secret material in `details` | `patient-booker` |
| Integration | filters return the expected subsets | `audit-seed` |

## Open questions

`OQ-08` (blocks `FR-AUDIT-03`/`04`) · `OQ-22`.

## Commit scope

`feat(F-15): silent audit logging and audit trail reader`