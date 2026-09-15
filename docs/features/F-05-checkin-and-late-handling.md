---
id: F-05
title: Check-in & Late Handling
spec_status: blocked
delivery_status: open
blocked_by: [OQ-14, OQ-21]
parent: docs/SPEC.md
related: [api/appointments.md, index/business-rules.md, features/F-06-reschedule-and-cancel.md]
rules: [BR-03]
depends_on: [F-04]
last_verified: 2026-09-15
---

# F-05 — Check-in & Late Handling

## Purpose

Enforce the 15-minute check-in window and route late arrivals into the reschedule prompt.

## In scope

Check-in inside the window, `no_show` handling, the reschedule prompt and its decline path, visible
status effect on the patient view.

## Out of scope

The reschedule transaction itself (`F-06`), AM walk-in registration (`F-07`).

## Blockers

- `OQ-21` — **who checks in?** Patients self-service or staff-only; the endpoint accepts either today.
- `OQ-14` — timezone, without which "within 15 minutes" is not a testable rule.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-CHKIN-01` | Check-in is accepted only within 15 minutes of `scheduled_datetime` (`BR-03`) | `POST /appointments/:id/checkin` |
| `FR-CHKIN-05` | Check-in sets `Appointment.status = checked_in` and is reflected in Master View | `POST …/checkin` → `F-09` |
| `FR-CHKIN-02` | Missing the window sets `no_show` and returns a reschedule prompt | `POST /appointments/:id/checkin` |
| `FR-CHKIN-03` | Declining the prompt cancels the appointment | `PATCH /appointments/:id/cancel` → `F-06` |
| `FR-CHKIN-04` | Check-in is rejected for `cancelled` / `no_show` / `completed` appointments | `POST …/checkin` |
| `FR-CHKIN-06` | Only the owning patient (if `OQ-21` allows) or staff may check in | `POST …/checkin` |

## Acceptance criteria

1. **Given** a confirmed appointment, **when** check-in happens 10 minutes after the slot time, **then**
   it succeeds and status becomes `checked_in`.
2. **Given** the same appointment, **when** check-in is attempted 16 minutes after the slot time, **then**
   it is refused and the status becomes `no_show` with a reschedule prompt in the response.
3. **Given** the prompt, **when** the patient declines, **then** the appointment is `cancelled` with an
   actor recorded.
4. **Given** a `cancelled` appointment, **when** check-in is attempted, **then** it is refused.
5. **Given** a successful check-in, **when** Master View is fetched, **then** the appointment appears as
   arrived without a page reload requirement (`NFR-RT-01`).

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | window boundary at exactly 15:00 minutes (inclusive/exclusive must be pinned by `OQ-14`) | `appointment-window` |
| Integration | check-in inside/outside window | `patient-booker` |
| Integration | decline → cancelled with actor | `patient-booker` |
| Integration | Master View reflects `checked_in` | `staff-assistant` |
| Negative | non-owner check-in; already-completed check-in | `patient-other` |

## Open questions

`OQ-14` (timezone — blocks a correct boundary test) · `OQ-21` (check-in actor).

## Commit scope

`feat(F-05): 15-minute check-in window and late handling`