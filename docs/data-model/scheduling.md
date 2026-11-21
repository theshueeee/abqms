---
id: DATA-SCHEDULING
title: Data Model — Scheduling
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/business-rules.md]
last_verified: 2026-11-21
---

# Data Model — Scheduling

Entities: `AppointmentType`, `Appointment`, `RescheduleLog`, `TimeBlock`.

## `AppointmentType`

| Field | Type | Notes |
|---|---|---|
| `appointment_type_id` | UUID (PK) | |
| `appointment_type` | String | e.g. "General Checkup", "Scaling" |
| `default_duration_minutes` | Int | Feeds slot generation — `OQ-15` |
| `is_active` | Boolean | |

## `Appointment`

| Field | Type | Notes |
|---|---|---|
| `appointment_id` | UUID (PK) | |
| `patient_id` | FK → `Patient` | Nullable for unregistered walk-ins? — `OQ-04` |
| `appointment_type_id` | FK → `AppointmentType` | |
| `doctor_staff_id` | FK → `Staff` | The assigned "doctor" record, managed as a staff-linked resource, not a login role (`OQ-02`) |
| `scheduled_datetime` | DateTime | |
| `booking_channel` | Enum(`online`, `walk_in`) | |
| `status` | Enum(`pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) | Authoritative status machine; successful F-04 bookings start as `confirmed` — `OQ-11` |
| `is_follow_up` | Boolean | |
| `parent_appointment_id` | FK → `Appointment` (self-ref, nullable) | Follow-up chains |
| `cancellation_reason_id` | FK → `CancellationReason` (nullable) | Nullable here but required by the cancel contract — enforced by a `CHECK` constraint (`OQ-09`) |
| `cancelled_by_patient_id` / `cancelled_by_staff_id` | FK (nullable) | Exactly one is set on cancellation — enforced by a `CHECK` constraint (`OQ-09`) |
| `walkin_full_name` / `walkin_phone` / `walkin_id_type` / `walkin_id_number` | String? | For unregistered walk-ins; overlaps `QueueTicket.ocr_*` |
| `created_at` / `updated_at` | DateTime | |

`Patient.reschedule_credits` and `Appointment.reschedule_count` were **dropped** by `OQ-03` — the
`RescheduleLog` table is the only store for `BR-02`.

Two `CHECK` constraints enforce the cancel contract at the database level (`OQ-09`):

- `Appointment_cancel_reason_required` — `status <> 'cancelled' OR cancellation_reason_id IS NOT NULL`
- `Appointment_cancel_actor_exclusive` — `status <> 'cancelled' OR num_nonnulls(cancelled_by_patient_id, cancelled_by_staff_id) = 1`

## `RescheduleLog`

| Field | Type | Notes |
|---|---|---|
| `reschedule_id` | UUID (PK) | |
| `appointment_id` | FK → `Appointment` | `ON DELETE CASCADE` |
| `patient_id` | FK → `Patient` | `ON DELETE CASCADE` |
| `old_scheduled_datetime` / `new_scheduled_datetime` | DateTime | |
| `reason` | String | Defaults to `"Patient requested reschedule"` |
| `rescheduled_at` | DateTime | Defaults to `now()` |

Feeds `BR-02` evaluation and is the **authoritative** store for the reschedule budget (`OQ-03`).
The budget counts rows with `rescheduled_at > now − 30 days` — a rolling window with an exclusive
lower bound, evaluated in UTC instants. Indexed on `(patient_id, rescheduled_at)` for that query.

## `TimeBlock`

| Field | Type | Notes |
|---|---|---|
| `block_id` | UUID (PK) | |
| `doctor_staff_id` | FK → `Staff` | |
| `blocked_by_staff_id` | FK → `Staff` | |
| `start_datetime` / `end_datetime` | DateTime | |
| `block_reason` | String | e.g. "Annual Leave", "Academic Duty" |
| `notes` | String? | |
| `created_at` | DateTime | |
| `deleted_at` | DateTime? | Set when a Dental Assistant releases the block; null means active |

Time ranges use half-open intervals `[start_datetime, end_datetime)`. Released blocks are excluded
from availability, overlap checks, and normal time-block listings.
They remain available through audit history. A block cannot overlap an appointment with status
`confirmed`, and appointment confirmation cannot overlap an active block (`OQ-07`).

## Slot generation

PM slots start every 30 minutes from 12:00 local time until a selected appointment duration fits
before 17:00. Active `TimeBlock` rows and existing pending/confirmed/checked-in appointments remove
overlapping slots. Slots that have already started in `Asia/Kuala_Lumpur` are never returned
(`FR-BOOK-11`). The 15-patient-per-day cap is removed by `OQ-15`.

## Check-in transitions

`POST /appointments/:id/checkin` moves an appointment to `checked_in` when the request arrives in
`[scheduled_datetime, scheduled_datetime + 15 minutes]`. The boundary is inclusive and the window
opens at the scheduled time, so an early check-in is refused.

A check-in attempted after the window moves the appointment to `no_show` and returns a reschedule
prompt. This transition is **lazy**: it happens only when someone attempts a check-in. An
appointment nobody attempts stays `confirmed` indefinitely, because no scheduled sweep exists yet —
that gap is tracked as `OQ-24` and is the natural responsibility of `F-14`.

A second check-in on an appointment already in `checked_in` is refused, so one check-in can never
produce more than one queue entry once the queue model lands.

## Default booking resources

The patient booking flow does not select a service or doctor. When `appointment_type_id` or
`doctor_staff_id` are omitted, the API resolves the active default `AppointmentType` (seeded
`General Checkup`) and the seeded staff-linked doctor resource `General Clinic Doctor`
(`20000000-0000-4000-8000-000000000001`). `StaffRole` has no doctor value, so the resource is a
placeholder row that cannot sign in — the model conflict stays tracked by `OQ-02`.