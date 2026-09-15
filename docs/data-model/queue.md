---
id: DATA-QUEUE
title: Data Model — Queue
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/business-rules.md, features/F-09-master-view-call-next.md]
last_verified: 2026-09-15
---

# Data Model — Queue

## `QueueTicket`

| Field | Type | Notes |
|---|---|---|
| `ticket_id` | UUID (PK) | |
| `appointment_id` | FK → `Appointment` (1:1) | Non-null today, which blocks unregistered walk-ins — `OQ-04` |
| `patient_id` | FK → `Patient` | Same `OQ-04` concern |
| `doctor_staff_id` | FK → `Staff` | |
| `queue_date` | Date | Type is `Date` while other timestamps are `DateTime`; timezone policy undecided — `OQ-14` |
| `queue_number` | String | e.g. `B-014`; prefix origin and reset cadence undecided — `OQ-16` |
| `queue_status` | Enum(`waiting`, `called`, `in_progress`, `completed`, `no_show`) | Distinct from `Appointment.status`; see mapping note below |
| `is_emergency_override` | Boolean | |
| `override_reason` | String? | Mandatory when `is_emergency_override` (`BR-05`) |
| `override_by_staff_id` | FK → `Staff` (nullable) | |
| `original_position` / `current_position` | Int | Ordering tie-break rule missing — `OQ-13` |
| `checkin_method` | Enum(`ocr`, `manual`, `qr`) | |
| `ocr_id_type` / `ocr_id_number` | String? | Overlaps `Appointment.walkin_*` |
| `is_checkin_verified` | Boolean | |
| `called_at` / `arrived_at` / `completed_at` | DateTime? | |
| `created_at` / `updated_at` | DateTime | |

## Status mapping (two parallel state machines)

| Concept | `Appointment.status` | `QueueTicket.queue_status` |
|---|---|---|
| Booked, not yet arrived | `pending` / `confirmed` | *(no ticket)* |
| Arrived | `checked_in` | `waiting` |
| Called to room | `checked_in` | `called` |
| In consultation | `checked_in` | `in_progress` |
| Consultation finished | `completed` | `completed` |
| Did not arrive | `no_show` | `no_show` |

No DB constraint or written rule keeps these in sync — the owning feature (`F-09`) must define the
transition contract, and a schema-level fix may be needed (`OQ-11`).

## Ordering rules

- `original_position` is frozen at ticket issue.
- `current_position` changes on emergency override (`F-10`) and on every call-next (`F-09`).
- Missing: tie-break when two tickets share an issue timestamp, and concurrency safety when two
  staff members call next simultaneously — `OQ-13`.