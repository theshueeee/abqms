---
id: DATA-MODERATION
title: Data Model — Moderation
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/business-rules.md, features/F-12-flagging-and-suspension.md]
last_verified: 2026-09-15
---

# Data Model — Moderation

Entities: `SuspensionRecord`, `CancellationReason`.

## `SuspensionRecord`

| Field | Type | Notes |
|---|---|---|
| `suspension_id` | UUID (PK) | |
| `patient_id` | FK → `Patient` | |
| `flagging_reason` | String | |
| `triggered_by` | Enum(`system`, `staff`) | `system` = automatic on `BR-02` breach |
| `flagged_at` | DateTime | |
| `reviewed_by_staff_id` | FK → `Staff` (nullable) | |
| `reviewed_at` | DateTime? | |
| `outcome` | Enum(`pending`, `suspended`, `reinstated`) | |
| `admin_notes` | String? | |

**Mapping gap:** `Patient.account_status` is `Enum(active, suspended, flagged)` while this
`outcome` is `Enum(pending, suspended, reinstated)`. The written mapping between the two is
undefined (does `pending` ⇒ `flagged`? does `reinstated` ⇒ `active`?) — `OQ-10`.

**Narrow slice decided 2026-11-22 (`OQ-10`).** `F-06` creates the first `SuspensionRecord`: a
`BR-02` breach writes `triggered_by = system`, `outcome = pending`, and sets
`Patient.account_status = flagged`. The review actions (suspend, reinstate) and the other two
moderation signals stay with `F-12`.

## `CancellationReason`

| Field | Type |
|---|---|
| `reason_id` | UUID (PK) |
| `reason_text` | String |
| `is_active` | Boolean |
| `is_system` | Boolean |

Read-only reference data — the booking UI needs a list endpoint to pick from (`OQ-19`, decided
2026-11-22 for `F-06`: `GET /cancellation-reasons` returns the active, non-system reasons).

`is_system = true` marks a reason that only the server may use. `F-06` seeds exactly one
(`...0099`, "Appointment declined after no-show") for the `FR-CHKIN-03` decline path; it is never
offered to patients, so a patient-supplied system reason id is refused with `404`.

Seeded reasons: `Schedule conflict`, `Feeling unwell`, `No longer needed`, `Other`.

## Moderation signals (from the original spec)

Compliance review watches for: suspicious cancellations · excessive reschedules · emergency-override
abuse (`BR-05` logging exists precisely to support the third one). Only the reschedule signal has a
numeric trigger today (`BR-02`, fewer than 5 per 30 days); the other two have no threshold defined —
`OQ-10`.