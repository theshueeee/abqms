---
id: F-04
title: Appointment Types & PM Booking
spec_status: complete
delivery_status: tested
blocked_by: []
parent: docs/SPEC.md
related: [api/appointments.md, data-model/scheduling.md, features/F-11-timeblock-management.md]
rules: [BR-01, BR-04]
depends_on: [F-02, F-03, F-11]
last_verified: 2026-11-20
---

# F-04 — Appointment Types & PM Booking

## Purpose

Let a patient book a pre-scheduled PM slot, with availability that respects duration and time-blocks.

## In scope

Appointment-type reference data, slot generation/availability, booking creation, lifecycle entry
state, confirmation email trigger.

## Out of scope

Check-in and late handling (`F-05`), reschedule/cancel (`F-06`), walk-ins (`F-07`).

## Resolved decisions

- `OQ-06`: PM booking is allowed in `Asia/Kuala_Lumpur` from 12:00 inclusive to 17:00 exclusive.
- `OQ-11`: `Appointment.status` is authoritative; a successful F-04 booking is stored as `confirmed`.
- `OQ-15`: the 15-patient-per-day cap is removed; slots use a 30-minute PM grid and fit appointment duration.
- `OQ-19`: F-04 exposes availability and read-only appointment-type/doctor reference routes.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-BOOK-01` | A booking is created with `booking_channel = online` and a valid `appointment_type_id` | `POST /appointments` |
| `FR-BOOK-02` | Already-taken slots are rejected | `POST /appointments` |
| `FR-BOOK-03` | The removed 15-patient-per-day cap does not block booking | `POST /appointments` |
| `FR-BOOK-04` | Bookings outside PM mode are rejected (`BR-04`) | `POST /appointments` |
| `FR-BOOK-05` | Slots overlapping a `TimeBlock` are rejected | `POST /appointments` |
| `FR-BOOK-06` | A successful booking automatically queues the confirmation email (`NFR-AUTO-01`) | `POST /appointments` → `F-14` |
| `FR-BOOK-07` | Patients can list **only their own** appointments; staff can filter by date and doctor | `GET /appointments` |
| `FR-BOOK-08` | A suspended patient cannot book | `POST /appointments` |
| `FR-BOOK-09` | Available slots are exposed to the booking UI | `GET /appointments/availability` (`OQ-19`) |

## Acceptance criteria

1. **Given** a doctor with 15 or more existing bookings on a date, **when** an overlapping slot is not
   taken, **then** the booking can succeed; the daily count is not enforced.
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
| Unit | slot generation: duration, overlap, and time-block exclusion | `doctor-slots` |
| Unit | mode gate at AM/PM boundary (mock clock) | `clinic-hours` |
| Integration | book → row + email job ≤ 1 | `patient-booker` |
| Integration | double-book rejected; ownership enforced on list | `patient-booker`, `patient-other` |
| Negative | suspended patient booking refused | `patient-suspended` |

## Open questions

Resolved by `OQ-06`, `OQ-11`, `OQ-15`, and `OQ-19`.

## Commit scope

`feat(F-04): appointment types, slot availability and PM booking`