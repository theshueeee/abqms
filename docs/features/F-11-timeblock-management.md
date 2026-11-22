---
id: F-11
title: Time-Block Management
spec_status: complete
delivery_status: tested
parent: docs/SPEC.md
related: [api/timeblocks.md, data-model/scheduling.md, features/F-04-appointment-types-and-booking.md]
depends_on: [F-03]
last_verified: 2026-11-22
---

# F-11 — Time-Block Management

## Purpose

Let staff lock a doctor's calendar for leave or academic duties so no bookings land in that window.

## In scope

Creating, listing and deleting blocks; feeding exclusion into slot availability.

## Out of scope

Slot generation itself (`F-04`), staff provisioning (`F-03`).

## Decision

- `OQ-07` is resolved with `deleted_at` soft deletion. The Dental Assistant confirms a release,
  active listings and availability exclude released blocks, and the release is audited.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-TB-01` | Creating a block records `doctor_staff_id` and `blocked_by_staff_id` | `POST /timeblocks` |
| `FR-TB-02` | `start_datetime < end_datetime` is enforced; overlapping blocks or `confirmed` appointments for the same doctor are refused | `POST /timeblocks` |
| `FR-TB-03` | Blocks are excluded from bookable-slot generation (`FR-BOOK-05`) | → `F-04` |
| `FR-TB-04` | `block_reason` is free text with optional `notes` | `POST /timeblocks` |
| `FR-TB-05` | Blocks can be listed, filtered by `doctor_staff_id` | `GET /timeblocks` |
| `FR-TB-06` | Releasing a block requires staff confirmation, sets `deleted_at`, excludes it from normal results, and is recorded in the audit trail; unknown or already released ids return `404` | `DELETE /timeblocks/:id` |
| `FR-TB-07` | Only staff may create or delete blocks; patients may read availability generally | `POST`/`DELETE` |

## Acceptance criteria

1. **Given** an existing block 09:00–12:00, **when** another 11:00–13:00 block is posted for the same
   doctor, **then** it is refused.
2. **Given** a block covering 14:00–15:00, **when** availability is generated, **then** no slot overlaps
   that window.
3. **Given** a block, **when** it is released after confirmation, **then** availability returns and the release is present in
   the audit trail.
4. **Given** a patient session, **when** it posts a block, **then** the response is `403`.
5. **Given** a confirmed appointment, **when** a block overlaps it, **then** block creation is refused.
6. **Given** an active block, **when** an appointment is confirmed inside it, **then** confirmation is refused.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | overlap detection across boundary cases (touching ends, containment) | none |
| Integration | create → availability shrinks; release → availability returns | `doctor-slots` |
| Integration | audit row written on create and release | `staff-assistant` |
| Integration | confirmed appointment conflicts with block creation and confirmation | `doctor-slots` |
| Concurrency | block creation and appointment confirmation use the doctor-day lock | `doctor-slots` |
| Negative | patient actor; inverted date range; unknown or already released id | `patient-booker` |

## Open questions

Resolved by `OQ-07`.

## Implementation status

Time-block persistence and the staff/read-only routes are implemented and covered by API integration
tests. The two cross-feature requirements that were outstanding when the feature was first built have
since landed with `F-04`: active blocks are excluded from generated PM availability
(`FR-BOOK-05`, `FR-TB-03`), and both directions of the appointment/block conflict rule are enforced —
creating a block that overlaps a `confirmed` appointment is refused, and confirming an appointment
inside an active block is refused (`FR-TB-02`).

## Commit scope

`feat(F-11): time-block management`