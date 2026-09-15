---
id: API-WALKIN-QUEUE
title: API — Walk-in & Queue
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/business-rules.md, data-model/queue.md, features/F-07-walkin-registration-ocr.md]
last_verified: 2026-09-15
---

# API — Walk-in & Queue

Owns AM walk-in registration (OCR + manual) and the live queue surface.

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `POST` | `/walkin/ocr` | patient / staff | Submit an ID image, get parsed fields back | `F-07` |
| `POST` | `/walkin/register` | patient / staff | Manual or OCR-confirmed registration → creates `QueueTicket` | `F-07` |
| `GET` | `/queue/live/:doctor_staff_id` | patient-facing | Live queue position ("distance-to-turn") | `F-08` |
| `GET` | `/queue/master-view` | **staff only** | Waiting / in-progress / completed dashboard | `F-09` |
| `POST` | `/queue/call-next` | **staff only** | Single-button next-patient trigger | `F-09` |
| `POST` | `/queue/emergency-override` | **staff only** | Body: `patient_id`, `reason` | `F-10` |

## Requirements

- `FR-WALKIN-01` `/walkin/ocr` returns parsed identity fields and **never** the raw image.
- `FR-WALKIN-02` Manual registration is always available as fallback when OCR fails or is refused.
- `FR-WALKIN-03` Registration may reuse `Patient.last_known_id_type` / `last_known_id_number` for a
  returning patient.
- `FR-WALKIN-04` Registration creates the `Appointment` (`booking_channel = walk_in`) and its 1:1
  `QueueTicket` in one atomic operation.
- `FR-WALKIN-05` A `queue_number` is issued and visible to the patient immediately.
- `FR-QUEUE-01` `/queue/live/:doctor_staff_id` exposes position and distance-to-turn for the
  requesting patient's own ticket plus aggregate queue info only.
- `FR-MASTER-01` `/queue/master-view` groups tickets as waiting / in-progress / completed.
- `FR-MASTER-02` `/queue/call-next` is a single action: previous ticket → `Completed`, new → `Ongoing`,
  with UI + DB synced.
- `FR-OVR-01` `/queue/emergency-override` requires a non-empty `reason` (`BR-05`) and moves the
  patient to the front.

## Gaps affecting this domain

| Gap | Open question |
|---|---|
| OCR provider, upload constraints (multipart, size, formats), PII retention | `OQ-20` |
| Unregistered walk-ins have no `Patient`/`Appointment`, but `QueueTicket` requires both | `OQ-04` |
| `queue_number` prefix/reset cadence (`B-014`) | `OQ-16` |
| Estimated-wait formula for the live view | `OQ-17` |
| Realtime transport (poll vs push) and its auth/contract | `OQ-18` |
| Queue reordering tie-break and concurrency safety of call-next | `OQ-13` |
| Emergency-override impact **preview** is promised by the spec but has no route | `OQ-19` |
| Room capacity pause check has no route or entity | `OQ-05` |