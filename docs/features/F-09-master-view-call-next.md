---
id: F-09
title: Master View & Call-Next
spec_status: blocked
delivery_status: open
blocked_by: [OQ-05, OQ-11, OQ-13, OQ-18]
parent: docs/SPEC.md
related: [api/walkin-queue.md, data-model/queue.md, requirements/non-functional.md]
rules: [BR-04, BR-06]
depends_on: [F-03, F-07]
last_verified: 2026-09-15
---

# F-09 — Master View & Call-Next

## Purpose

The staff dashboard for the AM queue, and the single-click action that moves the queue forward.

## In scope

Waiting / in-progress / completed grouping, room-capacity pause check, the one-click call-next action
and its status transitions, realtime sync, concurrency safety.

## Out of scope

Emergency overrides (`F-10`), registration (`F-07`).

## Blockers

- `OQ-05` — "check room capacity (pause if full)" has **no room or capacity entity** and no route.
- `OQ-13` — queue ordering has no tie-break rule and no concurrency guard, so two simultaneous
  call-next actions can corrupt `current_position`.
- `OQ-11` — the contract that keeps `Appointment.status` and `QueueTicket.queue_status` in sync is
  undefined (see the mapping table in `data-model/queue.md`).
- `OQ-18` — realtime transport for the dashboard.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-MASTER-01` | Tickets are grouped as waiting / in-progress / completed for the current day | `GET /queue/master-view` |
| `FR-MASTER-02` | **Call next** is a single action: previous → `Completed`, next → `Ongoing` | `POST /queue/call-next` |
| `FR-MASTER-03` | Call-next also updates the linked `Appointment.status`, per `OQ-11` | `POST /queue/call-next` |
| `FR-MASTER-04` | Both surfaces reflect the change without a manual refresh (`NFR-RT-01`) | per `OQ-18` |
| `FR-MASTER-05` | The room-capacity check can pause acceptance of new calls when full (`OQ-05`) | `GET /queue/master-view` |
| `FR-MASTER-06` | Concurrent call-next requests cannot double-advance the queue or skip a ticket (`OQ-13`) | `POST /queue/call-next` |
| `FR-MASTER-07` | Calling next with an empty queue returns a clear no-op response, not an error | `POST /queue/call-next` |
| `FR-MASTER-08` | Only staff may read Master View or call next (`BR-07`) | both |
| `FR-MASTER-09` | Every call-next is audited silently (`BR-06`) | → `F-15` |

## Acceptance criteria

1. **Given** a queue of 5 waiting tickets, **when** staff presses call next once, **then** exactly one
   request is issued, the previous ticket is `completed` and the new one is `in_progress`.
2. **Given** two staff sessions, **when** both call next at the same moment, **then** exactly one ticket
   advances and no ticket is skipped or duplicated.
3. **Given** an empty queue, **when** call next is pressed, **then** the response is a no-op with no
   state change.
4. **Given** a successful call-next, **when** a patient's live view is open, **then** it updates within
   the `NFR-RT-02` budget.
5. **Given** a non-staff session, **when** Master View is requested, **then** the response is `403`.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | next-patient selection, including emergency overrides and ties | `queue-ordering` |
| Unit | status transition matrix (queue status × appointment status) | `queue-day` |
| Integration | call-next happy path; empty-queue no-op | `queue-day` |
| Concurrency | two parallel call-next calls advance exactly one ticket (transaction/row-lock proof) | `queue-day` |
| Integration | realtime propagation to a subscribed client | `queue-day` |
| Negative | assistant-less session (patient) refused on both routes | `patient-booker` |

## Open questions

`OQ-05` · `OQ-11` · `OQ-13` · `OQ-18`.

## Commit scope

`feat(F-09): master view and single-click call next`