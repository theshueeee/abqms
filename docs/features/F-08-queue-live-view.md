---
id: F-08
title: Live Queue View (Patient-Facing)
spec_status: blocked
delivery_status: open
blocked_by: [OQ-17, OQ-18, OQ-16]
parent: docs/SPEC.md
related: [api/walkin-queue.md, data-model/queue.md, requirements/non-functional.md]
rules: [BR-04]
depends_on: [F-07]
last_verified: 2026-09-15
---

# F-08 — Live Queue View (Patient-Facing)

## Purpose

Give a walk-in patient real-time transparency: their position, how many patients are ahead, and an
estimated wait.

## In scope

Patient-facing live queue read, distance-to-turn, estimated wait, realtime delivery to the browser,
privacy scoping.

## Out of scope

Queue mutation (`F-09`, `F-10`), staff Master View.

## Blockers

- `OQ-18` — realtime transport is **undecided** (poll vs SSE vs WebSocket), including its auth and
  contract. `NFR-RT-01` only says it must "feel live".
- `OQ-17` — the estimated-wait formula is undefined; nothing in the spec derives a duration.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-QUEUE-01` | The patient sees their own ticket's position and status | `GET /queue/live/:doctor_staff_id` |
| `FR-QUEUE-02` | **Distance-to-turn** = number of tickets ahead in the same doctor's queue | `GET /queue/live/:doctor_staff_id` |
| `FR-QUEUE-03` | An estimated wait is shown, derived from `OQ-17`'s formula | same |
| `FR-QUEUE-04` | Updates reach the patient without manual refresh (`NFR-RT-01`) | per `OQ-18` |
| `FR-QUEUE-05` | The response never exposes other patients' identity data — counts and the caller's own ticket only | same |
| `FR-QUEUE-06` | The live view is scoped per doctor and per day | same |
| `FR-QUEUE-07` | An emergency override is reflected in the patient's view (`F-10`) | same |

## Acceptance criteria

1. **Given** a patient with 3 tickets ahead, **when** the live view is fetched, **then**
   `distance_to_turn = 3`.
2. **Given** the queue advances, **when** call-next succeeds, **then** the patient's view updates within
   the `NFR-RT-02` budget without a manual refresh.
3. **Given** patient A queries the queue, **when** the payload is inspected, **then** no other patient's
   name, ID or contact detail is present.
4. **Given** an emergency override jumps another patient ahead, **when** the view updates, **then**
   `distance_to_turn` increases accordingly and the position change is not silently swallowed.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | distance-to-turn counting, including ties and override bumps | `queue-ordering` |
| Unit | ETA formula boundaries (0 ahead, N ahead) once `OQ-17` is fixed | `queue-ordering` |
| Integration | live view reflects call-next within the realtime budget | `staff-assistant`, `queue-day` |
| Security | response contains no other-patient PII | `queue-day` |
| E2E | two browser sessions: staff calls next, patient view updates | `queue-day` |

## Open questions

`OQ-17` · `OQ-18` (both block the main requirements) · `OQ-16`.

## Commit scope

`feat(F-08): patient live queue view with distance-to-turn`