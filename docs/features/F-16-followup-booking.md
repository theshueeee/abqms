---
id: F-16
title: Follow-up Booking
spec_status: blocked
delivery_status: open
blocked_by: [OQ-15]
parent: docs/SPEC.md
related: [api/appointments.md, data-model/scheduling.md, features/F-04-appointment-types-and-booking.md]
rules: [BR-01, BR-08]
depends_on: [F-04]
last_verified: 2026-09-15
---

# F-16 — Follow-up Booking

## Purpose

Let staff schedule the clinician's follow-up appointment at the end of a consultation, chained to the
original visit.

## In scope

Staff-only follow-up creation, parent linkage, chain visibility, cap counting.

## Out of scope

Patient self-booking (`F-04`), any clinical content.

## Blockers

- `OQ-15` — whether a follow-up **counts against** the 15/doctor/day cap (`BR-01`) is undecided. Admin
  clinics often exempt follow-ups, and the answer changes slot generation in `F-04`.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-FUP-01` | Only staff may create a follow-up (`BR-08` — doctors never use the system) | `POST /appointments/:id/follow-up` |
| `FR-FUP-02` | The new appointment sets `is_follow_up = true` and `parent_appointment_id` to the originating visit | same |
| `FR-FUP-03` | A follow-up is only created against an existing `completed` appointment | same |
| `FR-FUP-04` | The follow-up is subject to slot availability and the cap rules decided in `OQ-15` | same |
| `FR-FUP-05` | Chains are traversable: the patient (and staff) can see a follow-up's originating visit and vice versa | `GET /appointments` |
| `FR-FUP-06` | Creating a follow-up triggers the same confirmation email as a normal booking (`NFR-AUTO-01`) | → `F-14` |
| `FR-FUP-07` | A follow-up cannot itself be the parent of more than the spec permits — chain depth policy is undecided (`OQ-15`) | same |

## Acceptance criteria

1. **Given** a completed appointment, **when** staff create a follow-up, **then** the new row has
   `is_follow_up = true` and `parent_appointment_id` pointing at the original.
2. **Given** an appointment that is not `completed`, **when** a follow-up is attempted, **then** it is
   refused.
3. **Given** a patient session, **when** it attempts to create a follow-up, **then** the response is
   `403`.
4. **Given** a follow-up, **when** the patient lists their appointments, **then** the linkage to the
   originating visit is present.
5. **Given** the cap for the day is reached, **when** a follow-up is requested, **then** the outcome
   matches the `OQ-15` decision (counted or exempt) and the test asserts that specific behaviour.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | cap arithmetic with follow-ups counted and exempt (two cases, one enabled by `OQ-15`) | `doctor-slots` |
| Unit | chain assembly for depth 1 and depth 2 | `followup-chain` |
| Integration | completed visit → follow-up created with correct parent | `staff-assistant` |
| Integration | confirmation email enqueued for the follow-up | `email-stub` |
| Negative | non-completed parent; patient actor | `patient-booker` |

## Open questions

`OQ-15`.

## Commit scope

`feat(F-16): staff-initiated follow-up booking with parent linkage`