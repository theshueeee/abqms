---
id: API-TIMEBLOCKS
title: API — Calendar / Time-Blocks
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, data-model/scheduling.md, features/F-11-timeblock-management.md]
last_verified: 2026-09-15
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
- `FR-TB-05` Deleting a block is a hard delete today; whether it should be a soft delete is undecided
  (`OQ-07`).

## Notes

- Patients may read blocks (the portal shows doctor availability) but never create or delete them.
- Block creation/deletion must emit audit events (`F-15`) even though `TimeBlock` itself has no
  audit columns.