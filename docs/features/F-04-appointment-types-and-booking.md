---
id: F-04
title: Appointment Types & PM Booking
spec_status: blocked
delivery_status: open
blocked_by: [OQ-06, OQ-11, OQ-15, OQ-19]
parent: docs/SPEC.md
related: [api/appointments.md, data-model/scheduling.md, features/F-11-timeblock-management.md]
rules: [BR-01, BR-04]
depends_on: [F-02, F-03, F-11]
last_verified: 2026-09-15
---

# F-04 — Appointment Types & PM Booking

## Purpose

Let a patient book a pre-scheduled PM slot, with availability that respects duration, time-blocks and
the daily cap.

## In scope

Appointment-type reference data, slot generation/availability, booking creation, lifecycle entry
state, confirmation email trigger.

## Out of scope

Check-in and late handling (`F-05`), reschedule/cancel (`F-06`), walk-ins (`F-07`).

## Blockers

- `OQ-15` — **slot generation is unspecified**: how `default_duration_minutes`, the 15/doctor/day cap
  (`BR-01`), time-blocks and overlap prevention combine into bookable slots.
- `OQ-06` — AM/PM boundaries that decide whether booking is even allowed right now (`BR-04`).
- `OQ-11` — `pending` → `confirmed` transition trigger.
- `OQ-19` — no reference-data routes exist for appointment types, doctors or cancellation reasons.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-BOOK-01` | A booking is created with `booking_channel = online` and a valid `appointment_type_id` | `POST /appointments` |
| `FR-BOOK-02` | Already-taken slots are rejected | `POST /appointments` |
| `FR-BOOK-03` | Bookings exceeding the 15/doctor/day cap (`BR-01`) are rejected | `POST /appointments` |
| `FR-BOOK-04` | Bookings outside PM mode are rejected (`BR-04`) | `POST /appointments` |
| `FR-BOOK-05` | Slots overlapping a `TimeBlock` are rejected | `POST /appointments` |
| `FR-BOOK-06` | A successful booking automatically queues the confirmation email (`NFR-AUTO-01`) | `POST /appointments` → `F-14` |
| `FR-BOOK-07` | Patients can list **only their own** appointments; staff can filter by date and doctor | `GET /appointments` |
| `FR-BOOK-08` | A suspended patient cannot book | `POST /appointments` |
| `FR-BOOK-09` | Available slots are exposed to the booking UI | `GET /appointments/availability` (`OQ-19`) |

## Acceptance criteria

1. **Given** a doctor with 14 confirmed bookings on a date, **when** a 15th is booked, **then** it
   succeeds; **when** a 16th is attempted, **then** it is refused citing the daily cap.
2. **Given** an existing booking, **when** the same slot is booked again, **then** the second request is
   refused.
3. **Given** a doctor with a time-block covering 14:00–15:00, **when** a slot at 14:30 is requested,
   **then** it is unavailable.
4. **Given** a booking is created, **when** the transaction commits, **then** a confirmation-email job
   is enqueued exactly once.
5. **Given** patient A is authenticated, **when** patient A lists appointments, **then** patient B's
   appointments are absent.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | slot generation: duration, overlap, time-block exclusion, cap boundary (14/15/16) | `doctor-slots` |
| Unit | mode gate at AM/PM boundary (mock clock) | `clinic-hours` |
| Integration | book → row + email job ≤ 1 | `patient-booker` |
| Integration | double-book rejected; ownership enforced on list | `patient-booker`, `patient-other` |
| Negative | suspended patient booking refused | `patient-suspended` |

## Open questions

`OQ-06`, `OQ-11`, `OQ-15`, `OQ-19`.

## Commit scope

`feat(F-04): appointment types, slot availability and PM booking`