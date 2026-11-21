---
id: API-APPOINTMENTS
title: API — Appointments
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/business-rules.md, data-model/scheduling.md, features/F-04-appointment-types-and-booking.md]
last_verified: 2026-11-21
---

# API — Appointments

Owns PM booking, check-in, reschedule, cancel and follow-up creation.

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/appointments` | patient: own only; staff: filterable by date/doctor | List bookings | `F-04` |
| `GET` | `/appointments/availability` | authenticated | List unoccupied PM slots for a date; optional doctor/type overrides | `F-04` |
| `POST` | `/appointments` | patient (own) / staff | Create a booking | `F-04` |
| `PATCH` | `/appointments/:id/reschedule` | owner / staff | Move a booking | `F-06` |
| `PATCH` | `/appointments/:id/cancel` | owner / staff | Cancel a booking | `F-06` |
| `POST` | `/appointments/:id/checkin` | owner (`OQ-21`) / staff | Check in for a booked slot | `F-05` |
| `POST` | `/appointments/:id/follow-up` | **staff only** | Create a follow-up booking | `F-16` |

## Requirements

- `FR-BOOK-01` Created bookings carry `booking_channel = online` and a valid `appointment_type_id`.
- `FR-BOOK-02` Booking must reject slots that are already taken.
- `FR-BOOK-03` The 15-patient-per-day cap is removed by `OQ-15`; it does not block F-04 bookings.
- `FR-BOOK-04` Booking must reject out-of-mode times (`BR-04`, PM only) in `Asia/Kuala_Lumpur`,
  `[12:00,17:00)`.
- `FR-BOOK-05` Booking must reject slots overlapping a `TimeBlock`.
- `FR-BOOK-06` A successful booking triggers the confirmation email automatically (`NFR-AUTO-01`).
- `FR-BOOK-10` The patient flow omits service/doctor; the API resolves the active default
  appointment type and doctor resource when ids are omitted.
- `FR-BOOK-11` Availability excludes PM slots that have already started in `Asia/Kuala_Lumpur`.
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

## F-04 request contract

- `GET /appointments/availability` requires `date` (`YYYY-MM-DD`, `Asia/Kuala_Lumpur`).
  `doctor_staff_id` and `appointment_type_id` are optional overrides. When omitted, the active
  default type and doctor resource are resolved server-side. The response is
  `{ slots, appointment_type, doctor }`, where each slot is `{ scheduled_datetime }`
  (`FR-BOOK-09`, `FR-BOOK-10`).
- Slots that have already started are excluded (`FR-BOOK-11`). This includes every slot on a past
  date.
- `POST /appointments` requires `scheduled_datetime`. `appointment_type_id` and `doctor_staff_id`
  remain accepted as optional overrides for staff flows. `patient_id` may only be supplied by staff
  (`FR-BOOK-01`, `FR-BOOK-10`).
- The request is not gated by the current clock; the scheduled time itself must be a future,
  30-minute-grid PM slot (`FR-BOOK-04`).
- An unknown/inactive appointment type returns `404 Appointment type not found`. A missing default
  doctor resource returns `404 Clinic doctor resource is not configured`.
- The seeded defaults are the `General Checkup` appointment type
  (`10000000-0000-4000-8000-000000000001`) and the `General Clinic Doctor` staff-linked placeholder
  (`20000000-0000-4000-8000-000000000001`, `OQ-02`).

## Status transitions

`pending` → `confirmed` → `checked_in` → `completed`, plus terminal `cancelled` / `no_show`.
The Successful F-04 bookings are created as `confirmed` (`OQ-11`). `QueueTicket.queue_status` is
projected after check-in and queue transitions.

## F-05 check-in contract

`POST /appointments/:id/checkin` takes no request body. The actor may be the owning patient or any
active staff member (`OQ-21`); a patient checking in another patient's appointment is refused.

The accepted window is `[scheduled_datetime, scheduled_datetime + 15 minutes]` and the boundary is
inclusive — a check-in at exactly +15:00 succeeds. The window opens at the scheduled time, so an
early check-in is refused. The window semantics are fixed in
`features/F-05-checkin-and-late-handling.md`.

| Outcome | Status | Body |
|---|---|---|
| Checked in | `200` | `{ appointment }` with `status = checked_in` |
| Window missed | `409` | `{ error, appointment, reschedule_required: true }`, `status = no_show` |
| Check-in not yet open | `409` | `{ error, appointment }` — early check-in |
| Already checked in | `409` | `{ error, appointment }` |
| Terminal status | `409` | `{ error, appointment }` — `cancelled` / `no_show` / `completed` |
| Not the owner | `403` | `{ error }` |
| Unknown id | `404` | `{ error }` |
| Malformed id | `400` | `{ error }` |

`no_show` is set lazily — only when a check-in is attempted after the window. An appointment nobody
attempts stays `confirmed`; the missing sweep is tracked as `OQ-24`. Every committed transition
writes an audit row on `/appointments/:id/checkin` with `details.outcome` of `checked_in` or
`no_show` (`BR-06` — audit failures never fail the request).