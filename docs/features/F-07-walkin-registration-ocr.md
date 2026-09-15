---
id: F-07
title: Walk-in Registration (OCR + Manual)
spec_status: blocked
delivery_status: open
blocked_by: [OQ-04, OQ-16, OQ-20, D-05]
parent: docs/SPEC.md
related: [api/walkin-queue.md, data-model/queue.md, features/F-08-queue-live-view.md]
rules: [BR-01, BR-04]
depends_on: [F-03, F-04]
last_verified: 2026-09-15
---

# F-07 — Walk-in Registration (OCR + Manual)

## Purpose

Register an AM walk-in — by OCR ID scan or manual entry — and issue a live virtual queue ticket.

## In scope

ID image → parsed fields, manual fallback, returning-patient ID reuse, atomic `Appointment` +
`QueueTicket` creation, `queue_number` issuance, immediate visibility in Master View.

## Out of scope

Queue progression and call-next (`F-09`), the patient's live view (`F-08`).

## Blockers

- `OQ-04` — a walk-in may be an **unregistered guest**, but `QueueTicket.appointment_id` is a non-null
  1:1 and both `appointment_id`/`patient_id` point at required rows. The schema cannot represent the
  documented case (`FR-WALKIN-06`).
- `OQ-20` — OCR provider (`D-05`), upload format/size limits, and PII retention policy for ID images.
- `OQ-16` — `queue_number` prefix and reset cadence (`B-014` is unexplained).

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-WALKIN-01` | OCR endpoint accepts an ID image and returns parsed identity fields; the raw image is never echoed back | `POST /walkin/ocr` |
| `FR-WALKIN-02` | Manual registration is always available and is the fallback when OCR fails or is refused | `POST /walkin/register` |
| `FR-WALKIN-03` | A returning patient's `last_known_id_type` / `last_known_id_number` may be reused | `POST /walkin/register` |
| `FR-WALKIN-04` | Registration creates the `Appointment` (`booking_channel = walk_in`) and its 1:1 `QueueTicket` atomically | `POST /walkin/register` |
| `FR-WALKIN-05` | A unique `queue_number` is issued and returned immediately | `POST /walkin/register` |
| `FR-WALKIN-06` | An unregistered walk-in can be registered without a prior patient account (blocked — `OQ-04`) | `POST /walkin/register` |
| `FR-WALKIN-07` | `checkin_method` records `ocr` \| `manual` \| `qr`; `is_checkin_verified` reflects OCR confirmation | `POST /walkin/register` |
| `FR-WALKIN-08` | Registration outside AM mode is refused (`BR-04`) | `POST /walkin/register` |
| `FR-WALKIN-09` | The walk-in counts toward the doctor's daily cap (`BR-01`) — inclusion is undecided (`OQ-15`) | `POST /walkin/register` |
| `FR-WALKIN-10` | The new ticket is visible in Master View immediately | → `F-09` |

## Acceptance criteria

1. **Given** a readable ID image, **when** it is posted to `/walkin/ocr`, **then** the response contains
   parsed fields and no image data.
2. **Given** OCR failure, **when** the staff submits the manual form, **then** registration still
   completes and `checkin_method = manual`.
3. **Given** a manual registration, **when** it commits, **then** exactly one `Appointment` and one
   `QueueTicket` exist, sharing the same `appointment_id`, and a `queue_number` was returned.
4. **Given** a registered walk-in, **when** Master View is next fetched, **then** the ticket appears
   with `queue_status = waiting`.
5. **Given** a partially failing registration (ticket insert fails), **when** the request returns an
   error, **then** no orphan `Appointment` row remains.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | ID-field parsing/normalisation from a sample OCR payload | `ocr-samples` |
| Integration | OCR path end-to-end with a stubbed provider | `ocr-stub` |
| Integration | manual path with no existing patient | `walkin-guest` |
| Integration | returning patient reuses stored ID fields | `patient-returning` |
| Integration | atomicity: forced ticket-insert failure leaves no appointment | `db-failpoint` |
| Negative | unsupported file type / oversized upload rejected | `upload-bad` |

## Open questions

`OQ-04` (guest modelling — blocks `FR-WALKIN-06`) · `OQ-16` · `OQ-20` · `D-05`.

## Commit scope

`feat(F-07): walk-in registration with OCR and manual fallback`