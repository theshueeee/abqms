---
id: F-06
title: Reschedule & Cancellation
spec_status: complete
delivery_status: tested
blocked_by: []
parent: docs/SPEC.md
related: [api/appointments.md, data-model/scheduling.md, data-model/moderation.md, features/F-12-flagging-and-suspension.md, features/F-05-checkin-and-late-handling.md]
rules: [BR-02, BR-03]
depends_on: [F-04, F-05, F-12]
last_verified: 2026-11-22
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

None. `OQ-03`, `OQ-09` and the `OQ-19` reference-data slice were decided on 2026-11-22; the
`FR-CHKIN-03` conflict with `FR-RESCH-07` was resolved by `OQ-25`.

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
| `FR-RESCH-09` | The patient's remaining `BR-02` allowance is readable so the UI can show policy limits | `GET /appointments/policy-limits` |

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

## Decisions

- **`OQ-03` (2026-11-22):** `RescheduleLog` is the authoritative store for `BR-02`. The budget counts
  rows with `rescheduled_at > now − 30 days` — a rolling window with an exclusive lower bound,
  evaluated in UTC instants. `Patient.reschedule_credits` and `Appointment.reschedule_count` were
  dropped. `BR-02` itself is unchanged: the 5th reschedule succeeds, the 6th inside the window is
  refused. No semester concept exists.
- **`OQ-09` (2026-11-22):** `cancellation_reason_id` and the two actor columns stay nullable, and two
  PostgreSQL `CHECK` constraints enforce the contract when `status = 'cancelled'`: a reason is
  required, and exactly one actor FK is set.
- **`OQ-19` (partial, 2026-11-22):** `GET /cancellation-reasons` is added as authenticated read-only
  reference data.
- **`OQ-10` (narrow slice, 2026-11-22):** a `BR-02` breach writes
  `SuspensionRecord(triggered_by = system, outcome = pending)` and sets
  `Patient.account_status = flagged`. Review, suspension and reinstatement stay with `F-12`.
- **`OQ-25` (2026-11-22):** cancelling a `no_show` appointment is the only permitted terminal
  transition. It is used exclusively by the `FR-CHKIN-03` decline path, uses the seeded
  `is_system` cancellation reason, and audits with `details.path = "decline_reschedule"`. Every other
  cancel on a terminal appointment is refused.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | rolling-30-day window evaluation at 29/30/31 days and at counts 4/5/6 | `reschedule-history` |
| Unit | actor assignment: exactly one of the two FKs set | none |
| Integration | reschedule → log row + appointment datetime updated | `patient-booker` |
| Integration | breach → `SuspensionRecord` with `triggered_by = system`, `outcome = pending` | `patient-repeat-rescheduler` |
| Negative | invalid/missing cancellation reason; cancel twice; other patient's appointment | `patient-other` |

## Verification

`apps/api/test/reschedule-cancel.integration.test.ts` — 16 tests covering the window boundary, the
4/5/6 counts, the breach flag, taken/blocked/off-grid/out-of-PM slots, reason validation, actor
exclusivity, double cancel, the `no_show` decline path, and the policy-limits read model.

## Open questions

None blocking. `OQ-10` (thresholds for the other two moderation signals) and `OQ-19` (pagination,
versioning, rate limits) stay open for their owning features.

## Commit scope

`feat(F-06): reschedule limits, reschedule logging and cancellation with reason`