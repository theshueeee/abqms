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

## `CancellationReason`

| Field | Type |
|---|---|
| `reason_id` | UUID (PK) |
| `reason_text` | String |
| `is_active` | Boolean |

Read-only reference data — the booking UI needs a list endpoint to pick from (`OQ-19`).

## Moderation signals (from the original spec)

Compliance review watches for: suspicious cancellations · excessive reschedules · emergency-override
abuse (`BR-05` logging exists precisely to support the third one). Only the reschedule signal has a
numeric trigger today (`BR-02`, fewer than 5 per 30 days); the other two have no threshold defined —
`OQ-10`.