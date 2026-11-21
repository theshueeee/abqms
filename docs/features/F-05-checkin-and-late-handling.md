---
id: F-05
title: Check-in & Late Handling
spec_status: blocked
delivery_status: built
blocked_by: [F-06, queue model]
parent: docs/SPEC.md
related: [api/appointments.md, index/business-rules.md, features/F-06-reschedule-and-cancel.md]
rules: [BR-03]
depends_on: [F-04]
last_verified: 2026-11-21
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

Resolved: `OQ-14` (timezone) and `OQ-21` (check-in actor). Remaining blockers are dependency
blocks, not open questions:

- `F-06` — the reschedule transaction and `PATCH /appointments/:id/cancel` do not exist yet, so the
  decline path (`FR-CHKIN-03`) cannot be completed.
- The **queue model** — `QueueTicket` does not exist in the data model, so a check-in cannot yet
  create or project a queue entry (`FR-CHKIN-05`). The `queue_number` format is also undecided
  (`OQ-16`).

## Decision

Resolved on 2026-11-21, alongside `OQ-14` and `OQ-21`:

- **Window.** Check-in is accepted in `[scheduled_datetime, scheduled_datetime + 15 minutes]`. The
  boundary is **inclusive**: a check-in at exactly +15:00 succeeds, and one millisecond later fails.
- **No early check-in.** The window opens at the scheduled time. A patient arriving before their
  slot is refused rather than checked in early.
- **Late arrival.** Missing the window sets `status = no_show` and returns a reschedule prompt.
- **`no_show` is lazy.** The transition happens only when a check-in is attempted after the window.
  An appointment nobody attempts is never swept to `no_show` and remains `confirmed`; no scheduler
  exists in the codebase yet, and this gap is tracked as `OQ-24`.
- **Repeat check-in.** A second check-in on an already-`checked_in` appointment is refused with
  `409`, so that a single check-in can never create more than one queue entry once the queue model
  lands.
- **Actor.** The owning patient or any active staff member (`dental_assistant`, `admin`) may check
  in (`OQ-21`).

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-CHKIN-01` | Check-in is accepted only within 15 minutes of `scheduled_datetime` (`BR-03`) | `POST /appointments/:id/checkin` |
| `FR-CHKIN-05` | Check-in sets `Appointment.status = checked_in` and is reflected in Master View | `POST …/checkin` → `F-09` — **blocked**: no queue model yet |
| `FR-CHKIN-02` | Missing the window sets `no_show` and returns a reschedule prompt | `POST /appointments/:id/checkin` |
| `FR-CHKIN-03` | Declining the prompt cancels the appointment | `PATCH /appointments/:id/cancel` → `F-06` — implemented; the `no_show → cancelled` decline transition is permitted (`OQ-25`) |
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
| Unit | window boundary at exactly 15:00 minutes — inclusive at +15:00.000, refused at +15:00.001 | `appointment-window` |
| Integration | check-in inside/outside window | `patient-booker` |
| Integration | decline → cancelled with actor | `patient-booker` — **deferred to `F-06`** |
| Integration | Master View reflects `checked_in` | `staff-assistant` — **deferred to the queue slice** |
| Negative | non-owner check-in; already-completed check-in | `patient-other` |
| Negative | early check-in before the scheduled time | `patient-booker` |
| Negative | repeat check-in on a `checked_in` appointment | `patient-booker` |
| Integration | audit row written for a `checked_in` and a `no_show` transition | `patient-booker` |

## Open questions

None outstanding for the implemented slice. The `no_show` sweep gap (appointments nobody attempts
stay `confirmed`) is recorded as `OQ-24`.

## Implementation status

The check-in endpoint `POST /appointments/:id/checkin` is implemented with the window, actor,
terminal-state and repeat-check-in rules above, and is covered by API integration tests. The
decline path (`FR-CHKIN-03`) is implemented by `F-06` — cancelling a `no_show` appointment is the one
permitted terminal transition (`OQ-25`). The Master View projection (`FR-CHKIN-05`) remains blocked on
`F-06` and the queue model respectively.

## Commit scope

`feat(F-05): 15-minute check-in window and late handling`