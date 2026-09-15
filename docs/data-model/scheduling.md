---
id: DATA-SCHEDULING
title: Data Model — Scheduling
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/business-rules.md]
last_verified: 2026-09-15
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
| `status` | Enum(`pending`, `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`) | `pending` → `confirmed` transition rules undecided — `OQ-11` |
| `is_follow_up` | Boolean | |
| `parent_appointment_id` | FK → `Appointment` (self-ref, nullable) | Follow-up chains |
| `reschedule_count` | Int | Duplicates `Patient.reschedule_credits` — `OQ-03` |
| `cancellation_reason_id` | FK → `CancellationReason` (nullable) | Nullable here but required by the cancel contract — `OQ-09` |
| `cancelled_by_patient_id` / `cancelled_by_staff_id` | FK (nullable) | Exactly one should be set on cancellation |
| `walkin_full_name` / `walkin_phone` / `walkin_id_type` / `walkin_id_number` | String? | For unregistered walk-ins; overlaps `QueueTicket.ocr_*` |
| `created_at` / `updated_at` | DateTime | |

## `RescheduleLog`

| Field | Type | Notes |
|---|---|---|
| `reschedule_id` | UUID (PK) | |
| `appointment_id` | FK → `Appointment` | |
| `patient_id` | FK → `Patient` | |
| `old_scheduled_datetime` / `new_scheduled_datetime` | DateTime | |
| `reason` | String | |
| `rescheduled_at` | DateTime | |

Feeds `BR-02` evaluation (rolling 30-day count) — `OQ-03`.

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

**Gap:** no `is_active` / soft-delete field, yet `DELETE /timeblocks/:id` exists — `OQ-07`.

## Slot generation (unspecified)

`AppointmentType.default_duration_minutes` + `BR-01` (15/doctor/day) + `TimeBlock` exclusions +
overlap prevention must jointly define bookable slots. No algorithm is specified — `OQ-15`.