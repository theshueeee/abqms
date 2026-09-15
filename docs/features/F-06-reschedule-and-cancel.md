---
id: F-06
title: Reschedule & Cancellation
spec_status: blocked
delivery_status: open
blocked_by: [OQ-03, OQ-09, OQ-19]
parent: docs/SPEC.md
related: [api/appointments.md, data-model/scheduling.md, features/F-12-flagging-and-suspension.md]
rules: [BR-02, BR-03]
depends_on: [F-04, F-05, F-12]
last_verified: 2026-09-15
---

# F-06 — Reschedule & Cancellation

## Purpose

Move or cancel a booking while enforcing the reschedule budget and capturing reasons for compliance.

## In scope

Reschedule with `BR-02` enforcement and logging, the `BR-02` breach → flag handoff, cancellation with a
required reason and a single recorded actor.

## Out of scope

The compliance review workflow itself (`F-12`), slot availability generation (`F-04`).

## Blockers

- `OQ-03` — **two competing mechanisms** model the same rule: `Patient.reschedule_credits` (decremented,
  resets on a rolling window) vs `Appointment.reschedule_count`. Which is authoritative must be decided
  before the limit is testable.
- `OQ-09` — the cancel contract **requires** `cancellation_reason_id` but the column is nullable, so
  the constraint is unenforced at the database level.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-RESCH-01` | Reschedule is refused once **5 or more** reschedules fall within the trailing 30 days (`BR-02`) | `PATCH /appointments/:id/reschedule` |
| `FR-RESCH-02` | Every successful reschedule writes a `RescheduleLog` (`old`, `new`, `reason`, `rescheduled_at`) | `PATCH …/reschedule` |
| `FR-RESCH-06` | The new slot must itself be valid (not taken, not blocked, within the cap) | `PATCH …/reschedule` |
| `FR-RESCH-03` | Breaching `BR-02` flags the account and enqueues it for compliance review | → `F-12` |
| `FR-RESCH-04` | Cancellation requires a valid `cancellation_reason_id`; missing/invalid values are refused | `PATCH /appointments/:id/cancel` |
| `FR-RESCH-05` | Cancellation records exactly one actor: `cancelled_by_patient_id` **or** `cancelled_by_staff_id` | `PATCH …/cancel` |
| `FR-RESCH-07` | Cancelling an already-terminal appointment is refused | `PATCH …/cancel` |
| `FR-RESCH-08` | Patients may only act on their own appointments | both |

## Acceptance criteria

1. **Given** 4 reschedules in the trailing 30 days, **when** a 5th is requested, **then** it succeeds
   and a `RescheduleLog` row is written.
2. **Given** 5 reschedules in the trailing 30 days, **when** a 6th is requested, **then** it is refused
   and the account is flagged with `triggered_by = system`.
3. **Given** a reschedule made 31 days after an earlier one, **when** the trailing window is evaluated,
   **then** the earlier one no longer counts.
4. **Given** a cancel request without `cancellation_reason_id`, **when** posted, **then** it is refused
   and the appointment remains unchanged.
5. **Given** a staff-initiated cancel, **when** it commits, **then** `cancelled_by_patient_id` is null
   and `cancelled_by_staff_id` is set (and vice versa).

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | rolling-30-day window evaluation at 29/30/31 days and at counts 4/5/6 | `reschedule-history` |
| Unit | actor assignment: exactly one of the two FKs set | none |
| Integration | reschedule → log row + appointment datetime updated | `patient-booker` |
| Integration | breach → `SuspensionRecord` with `triggered_by = system`, `outcome = pending` | `patient-repeat-rescheduler` |
| Negative | invalid/missing cancellation reason; cancel twice; other patient's appointment | `patient-other` |

## Open questions

`OQ-03` (authoritative mechanism — blocks the unit tests above) · `OQ-09` · `OQ-19` (reason list route).

## Commit scope

`feat(F-06): reschedule limits, reschedule logging and cancellation with reason`