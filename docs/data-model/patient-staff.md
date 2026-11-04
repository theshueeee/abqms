---
id: DATA-PATIENT-STAFF
title: Data Model — Patient & Staff
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/roles-and-rbac.md, index/business-rules.md]
last_verified: 2026-11-04
---

# Data Model — Patient & Staff

## `Patient`

| Field | Type | Notes |
|---|---|---|
| `patient_id` | UUID (PK) | |
| `full_name` | String | |
| `email` | String (unique) | |
| `phone_number` | String | |
| `password_hash` | String | Hashing algorithm undecided — `OQ-22` |
| `date_of_birth` | DateTime | |
| `reschedule_credits` | Int | Decremented per reschedule, resets on a rolling 30-day window. Conflicts with `Appointment.reschedule_count` — `OQ-03` |
| `account_status` | Enum(`active`, `suspended`, `flagged`) | Mapping to `SuspensionRecord.outcome` undecided — `OQ-10` |
| `suspension_reason` | String? | |
| `last_known_id_type` | String? | For OCR-reused ID (MyKad / Passport) |
| `last_known_id_number` | String? | |
| `created_at` / `updated_at` | DateTime | |

Patient login uses the unique email address plus password (`OQ-01`, decided 2026-10-29).

## `Staff`

| Field | Type | Notes |
|---|---|---|
| `staff_id` | UUID (PK) | |
| `full_name` | String | |
| `email` | String (unique) | |
| `password_hash` | String | |
| `phone_number` | String | |
| `role` | Enum(`dental_assistant`, `admin`) | Doctors are **NOT** a role here (`BR-08`); see `OQ-02` for how the doctor resource is modelled |
| `is_active` | Boolean | Inactive staff must fail authentication (`F-03`) |
| `provisioned_by` | FK → `Staff.staff_id` (self-ref, nullable) | Tracks who created the account |
| `created_at` / `updated_at` | DateTime | |

**Gap (blocking `OQ-02`):** `Appointment.doctor_staff_id` is a FK to `Staff`, but no `Staff` row can
represent a doctor under the current `role` enum. One of these must change:
(a) add a non-login `doctor` role to the enum, (b) split out a `Doctor` entity, or
(c) relabel bookings to reference an assistant-managed doctor resource table.

## Authentication support records

`Session` stores an opaque token hash, actor type, patient/staff reference, expiry, and optional
revocation timestamp. `PasswordResetToken` stores only a hash of the single-use token, its account
reference, expiry, and consumption timestamp. `LoginAttempt` stores the normalized login key,
failure count, block expiry, and update timestamp so throttling is durable across API restarts.
Passwords use Argon2id; see `OQ-12` and `OQ-22`.