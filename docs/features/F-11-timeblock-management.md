---
id: F-11
title: Time-Block Management
spec_status: blocked
delivery_status: open
blocked_by: [OQ-07]
parent: docs/SPEC.md
related: [api/timeblocks.md, data-model/scheduling.md, features/F-04-appointment-types-and-booking.md]
depends_on: [F-03]
last_verified: 2026-09-15
---

# F-11 — Time-Block Management

## Purpose

Let staff lock a doctor's calendar for leave or academic duties so no bookings land in that window.

## In scope

Creating, listing and deleting blocks; feeding exclusion into slot availability.

## Out of scope

Slot generation itself (`F-04`), staff provisioning (`F-03`).

## Blockers

- `OQ-07` — `TimeBlock` has **no soft-delete or active flag**, yet the API exposes
  `DELETE /timeblocks/:id`. A hard delete destroys the record of why availability vanished, which
  conflicts with the audit expectations of `BR-06`/`F-15`.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-TB-01` | Creating a block records `doctor_staff_id` and `blocked_by_staff_id` | `POST /timeblocks` |
| `FR-TB-02` | `start_datetime < end_datetime` is enforced; overlapping blocks for the same doctor are refused | `POST /timeblocks` |
| `FR-TB-03` | Blocks are excluded from bookable-slot generation (`FR-BOOK-05`) | → `F-04` |
| `FR-TB-04` | `block_reason` is free text with optional `notes` | `POST /timeblocks` |
| `FR-TB-05` | Blocks can be listed, filtered by `doctor_staff_id` | `GET /timeblocks` |
| `FR-TB-06` | Deleting a block is refused for a non-existent id and is recorded in the audit trail; hard vs soft delete per `OQ-07` | `DELETE /timeblocks/:id` |
| `FR-TB-07` | Only staff may create or delete blocks; patients may read availability generally | `POST`/`DELETE` |

## Acceptance criteria

1. **Given** an existing block 09:00–12:00, **when** another 11:00–13:00 block is posted for the same
   doctor, **then** it is refused.
2. **Given** a block covering 14:00–15:00, **when** availability is generated, **then** no slot overlaps
   that window.
3. **Given** a block, **when** it is deleted, **then** availability returns and the deletion is present in
   the audit trail.
4. **Given** a patient session, **when** it posts a block, **then** the response is `403`.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | overlap detection across boundary cases (touching ends, containment) | none |
| Integration | create → availability shrinks; delete → availability returns | `doctor-slots` |
| Integration | audit row written on create and delete | `staff-assistant` |
| Negative | patient actor; inverted date range; unknown id | `patient-booker` |

## Open questions

`OQ-07`.

## Commit scope

`feat(F-11): time-block management`