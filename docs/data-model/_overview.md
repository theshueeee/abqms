---
id: IDX-DATA-OVERVIEW
title: Data Model Overview (ERD)
status: active
parent: docs/SPEC.md
related: [data-model/patient-staff.md, data-model/scheduling.md, data-model/queue.md, data-model/moderation.md, data-model/audit-notification.md]
last_verified: 2026-09-15
---

# Data Model — Overview

Prisma-oriented entity model. **Schema facts live only in this directory.** Entity detail is split
by domain; this file holds the ERD, the relationship summary and the conventions.

## Entity map

| Domain file | Entities |
|---|---|
| `data-model/patient-staff.md` | `Patient`, `Staff` |
| `data-model/scheduling.md` | `AppointmentType`, `Appointment`, `RescheduleLog`, `TimeBlock` |
| `data-model/queue.md` | `QueueTicket` |
| `data-model/moderation.md` | `SuspensionRecord`, `CancellationReason` |
| `data-model/audit-notification.md` | `AuditLog` + proposed-but-unspecified tables |

## Relationship summary

- `Patient` 1—N `Appointment`, `QueueTicket`, `RescheduleLog`, `SuspensionRecord`
- `Staff` 1—N `Appointment` (as doctor), `QueueTicket` (as override actor), `TimeBlock`
- `Staff` 1—N `Staff` (self-reference via `provisioned_by`)
- `Appointment` 1—1 `QueueTicket`
- `Appointment` N—1 `AppointmentType`
- `Appointment` 1—N `RescheduleLog`
- `Appointment` self-reference via `parent_appointment_id` (follow-up chains)
- `Appointment` N—1 `CancellationReason` (nullable)

## Conventions

- Primary keys are `UUID`.
- Every entity carries `created_at` / `updated_at` unless noted otherwise.
- Timestamps are stored as `DateTime`; **timezone policy is undecided** — `OQ-14`.
- Enums are Prisma enums; the current value sets are low-level facts and changing one is a spec change.
- Soft-delete policy is **undecided** — `OQ-07` (currently `TimeBlock` has no soft-delete field but a
  `DELETE` endpoint exists).

## Known model-level conflicts

| # | Conflict | Open question |
|---|---|---|
| 1 | `Patient` has no unique IC / Matric No. column, yet login is specified as IC or Matric No. | `OQ-01` |
| 2 | `Appointment.doctor_staff_id → Staff`, but `Staff.role` excludes doctors and `BR-08` says doctors don't use the system | `OQ-02` |
| 3 | `Patient.reschedule_credits` vs `Appointment.reschedule_count` both model `BR-02` | `OQ-03` |
| 4 | `QueueTicket.appointment_id` is a non-null 1:1, but unregistered walk-ins have no `Patient`/`Appointment` | `OQ-04` |
| 5 | No room/capacity entity exists although `F-09` requires a capacity check | `OQ-05` |
| 6 | `cancellation_reason_id` is nullable in the model but required by the cancel contract | `OQ-09` |
| 7 | No notification-delivery or password-reset token tables exist | `OQ-12` |
| 8 | Queue ordering has no tie-break rule, so `original/current_position` is unsafe under concurrency | `OQ-13` |