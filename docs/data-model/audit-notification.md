---
id: DATA-AUDIT-NOTIFICATION
title: Data Model — Audit & Notification
status: active
parent: docs/SPEC.md
related: [data-model/_overview.md, index/business-rules.md, features/F-14-notifications.md, features/F-15-audit-logging.md]
last_verified: 2026-09-15
---

# Data Model — Audit & Notification

## `AuditLog` (specified)

| Field | Type | Notes |
|---|---|---|
| `log_id` | UUID (PK) | |
| `user_id` | String | Patient or staff ID, but no actor type discriminator — `OQ-08` |
| `action` | Enum(`POST`, `PATCH`, `DELETE`, `GET`) | HTTP-verb-style, so non-HTTP events are unrepresentable — `OQ-08` |
| `resource` | String | e.g. `/bookings`, `/auth` |
| `details` | JSON? | |
| `created_at` | DateTime | |

**Gap:** `action` cannot express `LOGIN`, `LOGOUT`, `PASSWORD_RESET`, `CRON_REMINDER_SENT`,
`SYSTEM_FLAG`, or `EMERGENCY_OVERRIDE` unless it is overloaded onto a verb — `OQ-08`.

## Proposed but unspecified tables

These are needed by specified behaviour but do not exist in the model. Each is tracked, not assumed.

| Table | Needed by | Open question |
|---|---|---|
| `PasswordResetToken` (or equivalent) | `POST /auth/forgot-password` → `POST /auth/reset-password` | `OQ-12` |
| `Session` / refresh-token store | Session strategy is undecided | `OQ-12`, `OQ-22` |
| `NotificationLog` | Automatic confirmation + reminder delivery, retry and auditability | `OQ-12` |
| `Room` (or capacity config) | "Check room capacity (pause if full)" in `F-09` | `OQ-05` |
| `ClinicHours` / mode config | AM/PM dual-mode boundaries (`BR-04`) | `OQ-06` |
| `LoginId` (unique IC / Matric No.) | IC-or-Matric-No. login | `OQ-01` |

## Notification behaviour (specified)

- Booking confirmation email via Resend on `POST /appointments` success.
- Reminder email, cron-triggered daily at 08:00 for next-day appointments.
- Both are **automatic** — no manual staff trigger exists (`NFR-AUTO-01`).
- 08:00 in which timezone is undecided — `OQ-14`.