---
id: API-APPOINTMENTS
title: API — Appointments
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/business-rules.md, data-model/scheduling.md, features/F-04-appointment-types-and-booking.md]
last_verified: 2026-09-15
---

# API — Appointments

Owns PM booking, check-in, reschedule, cancel and follow-up creation.

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/appointments` | patient: own only; staff: filterable by date/doctor | List bookings | `F-04` |
| `POST` | `/appointments` | patient (own) / staff | Create a booking | `F-04` |
| `PATCH` | `/appointments/:id/reschedule` | owner / staff | Move a booking | `F-06` |
| `PATCH` | `/appointments/:id/cancel` | owner / staff | Cancel a booking | `F-06` |
| `POST` | `/appointments/:id/checkin` | owner (`OQ-21`) / staff | Check in for a booked slot | `F-05` |
| `POST` | `/appointments/:id/follow-up` | **staff only** | Create a follow-up booking | `F-16` |

## Requirements

- `FR-BOOK-01` Created bookings carry `booking_channel = online` and a valid `appointment_type_id`.
- `FR-BOOK-02` Booking must reject slots that are already taken.
- `FR-BOOK-03` Booking must enforce the hard cap (`BR-01`, 15/doctor/day) — scope of who counts is
  undecided (`OQ-15`).
- `FR-BOOK-04` Booking must reject out-of-mode times (`BR-04`, PM only) — boundaries undecided (`OQ-06`).
- `FR-BOOK-05` Booking must reject slots overlapping a `TimeBlock`.
- `FR-BOOK-06` A successful booking triggers the confirmation email automatically (`NFR-AUTO-01`).
- `FR-CHKIN-01` Check-in is accepted only inside the 15-minute window (`BR-03`).
- `FR-CHKIN-02` Missing the window moves the appointment to `no_show` and prompts a reschedule.
- `FR-CHKIN-03` Declining the reschedule cancels the appointment.
- `FR-RESCH-01` Reschedule is rejected once `BR-02` is breached (fewer than 5 per rolling 30 days).
- `FR-RESCH-02` Every reschedule writes a `RescheduleLog` row.
- `FR-RESCH-03` Breaching `BR-02` flags the account (handoff to `F-12`).
- `FR-RESCH-04` Cancel **requires** `cancellation_reason_id` even though the column is nullable
  today (`OQ-09`).
- `FR-RESCH-05` Cancellation records exactly one actor: `cancelled_by_patient_id` or
  `cancelled_by_staff_id`.
- `FR-FUP-01` Follow-up creation sets `is_follow_up = true` and `parent_appointment_id`.

## Status transitions

`pending` → `confirmed` → `checked_in` → `completed`, plus terminal `cancelled` / `no_show`.
The `pending` → `confirmed` trigger is undefined (`OQ-11`); sync with `QueueTicket.queue_status` is
described in `data-model/queue.md`.