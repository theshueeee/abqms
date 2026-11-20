---
id: API-TIMEBLOCKS
title: API — Calendar / Time-Blocks
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, data-model/scheduling.md, features/F-11-timeblock-management.md]
last_verified: 2026-11-20
---

# API — Calendar / Time-Blocks

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/timeblocks?doctor_staff_id=` | staff / read-only patient | List blocks for a doctor | `F-11` |
| `POST` | `/timeblocks` | staff | Create a block | `F-11` |
| `DELETE` | `/timeblocks/:id` | staff | Remove a block | `F-11` |

## Requirements

- `FR-TB-01` Creating a block records `doctor_staff_id` and `blocked_by_staff_id`.
- `FR-TB-02` A block requires `start_datetime < end_datetime` and cannot span an existing block for
  the same doctor.
- `FR-TB-03` Blocked windows are excluded from bookable-slot generation (`FR-BOOK-05`).
- `FR-TB-04` `block_reason` is free text (e.g. "Annual Leave", "Academic Duty") with optional `notes`.
- `FR-TB-05` `GET /timeblocks` returns active blocks only; released blocks have `deleted_at` set
  and are excluded from availability and overlap checks.
- `FR-TB-06` `DELETE /timeblocks/:id` releases a block after staff confirmation, records an audit
  event, and returns `404` for an unknown or already released block.
- Block creation and appointment confirmation use the same doctor-day transaction lock. A block
  cannot overlap a `confirmed` appointment, and an appointment cannot be confirmed inside an active
  block.

## Notes

- Patients may read blocks (the portal shows doctor availability) but never create or delete them.
- Block creation/deletion must emit audit events (`F-15`) even though `TimeBlock` itself has no
  audit columns.