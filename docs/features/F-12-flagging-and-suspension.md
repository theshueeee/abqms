---
id: F-12
title: Flagging & Suspension Review
spec_status: blocked
delivery_status: open
blocked_by: [OQ-10, OQ-21]
parent: docs/SPEC.md
related: [api/accounts.md, data-model/moderation.md, features/F-06-reschedule-and-cancel.md]
rules: [BR-02, BR-05, BR-07]
depends_on: [F-03, F-06]
last_verified: 2026-09-15
---

# F-12 — Flagging & Suspension Review

## Purpose

Give staff a compliance queue: review flagged accounts and either suspend or clear them.

## In scope

Automatic flagging (`BR-02` breach), staff-raised flags, the review queue, suspend, reinstate, and the
effect of suspension on the patient's capabilities.

## Out of scope

The reschedule logic that triggers flagging (`F-06`), analytics aggregation (`F-13`).

## Blockers

- `OQ-10` — `Patient.account_status` (`active`/`suspended`/`flagged`) and
  `SuspensionRecord.outcome` (`pending`/`suspended`/`reinstated`) have **no written mapping**, and two of
  the three documented signals (suspicious cancellations, override abuse) have **no numeric threshold**.
- `OQ-21` — whether suspension requires `admin` rather than any staff member is unstated.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-MOD-01` | A system trigger (e.g. the `BR-02` breach from `F-06`) creates a `SuspensionRecord` with `triggered_by = system`, `outcome = pending` | → `F-06` |
| `FR-MOD-07` | Staff can raise a flag manually with `triggered_by = staff` and a free-text reason | `PATCH /accounts/:id/suspend` |
| `FR-MOD-02` | `/accounts/flagged` lists accounts with an unreviewed record | `GET /accounts/flagged` |
| `FR-MOD-03` | Suspend sets `account_status = suspended`, stores `suspension_reason`, and records reviewer, timestamp and outcome | `PATCH /accounts/:id/suspend` |
| `FR-MOD-04` | Reinstate returns the account to `active` and records the same review fields | `PATCH /accounts/:id/reinstate` |
| `FR-MOD-05` | `admin_notes` is optional but persisted on both paths | both |
| `FR-MOD-06` | A suspended patient cannot log in, book, reschedule or register a walk-in | all patient routes |
| `FR-MOD-08` | Review actions are audited (`BR-06`) | → `F-15` |
| `FR-MOD-09` | Emergency-override frequency is available as an abuse signal for reviewers (`BR-05`) | → `F-13` |

## Acceptance criteria

1. **Given** a patient breaching the reschedule limit, **when** the flag commits, **then** an unreviewed
   record appears in `/accounts/flagged` and the account shows the corresponding status per `OQ-10`'s
   mapping.
2. **Given** a flagged account, **when** staff suspend it with notes, **then** `account_status` is
   `suspended`, `suspension_reason` is set, and reviewer fields are populated.
3. **Given** a suspended patient, **when** they attempt to book, **then** the request is refused.
4. **Given** a suspended account, **when** staff reinstate it, **then** the patient can book again and the
   record's outcome reflects reinstatement (not deletion).
5. **Given** a review action, **when** the audit trail is read, **then** the actor and timestamp are
   recorded.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | status ↔ outcome mapping transitions once `OQ-10` is fixed | none |
| Integration | `BR-02` breach → flag → suspend → reinstate cycle | `patient-repeat-rescheduler` |
| Integration | suspended patient blocked on every patient-facing write route | `patient-suspended` |
| Integration | audit rows for suspend and reinstate | `staff-assistant` |
| Negative | reinstate without a record; double suspend | `patient-suspended` |

## Open questions

`OQ-10` (blocks the mapping and two of three signals) · `OQ-21`.

## Commit scope

`feat(F-12): flagging, suspension review and reinstatement`