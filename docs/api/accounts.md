---
id: API-ACCOUNTS
title: API — Accounts / Moderation
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/business-rules.md, data-model/moderation.md, features/F-12-flagging-and-suspension.md]
last_verified: 2026-09-15
---

# API — Accounts / Moderation

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/accounts/flagged` | **staff only** | Queue of flagged accounts awaiting review | `F-12` |
| `PATCH` | `/accounts/:id/suspend` | **staff only** | Suspend a flagged account | `F-12` |
| `PATCH` | `/accounts/:id/reinstate` | **staff only** | Clear a flag / reinstate | `F-12` |

## Requirements

- `FR-MOD-01` Flagging can be triggered by the system (`triggered_by = system`, e.g. the `BR-02`
  breach in `F-06`) or by staff.
- `FR-MOD-02` `/accounts/flagged` lists accounts with an unreviewed `SuspensionRecord`
  (`outcome = pending`).
- `FR-MOD-03` Suspend sets `Patient.account_status = suspended`, stores `suspension_reason`, and
  records `reviewed_by_staff_id` + `reviewed_at` + `outcome`.
- `FR-MOD-04` Reinstate returns the account to `active` and records the same review fields.
- `FR-MOD-05` `admin_notes` is optional but persisted on both paths.
- `FR-MOD-06` A suspended patient must be unable to book, reschedule, or register a walk-in.

## Gaps

- `Patient.account_status` (`active`/`suspended`/`flagged`) vs `SuspensionRecord.outcome`
  (`pending`/`suspended`/`reinstated`) have no written mapping — `OQ-10`.
- Only the reschedule signal has a numeric trigger; "suspicious cancellations" and
  "emergency-override abuse" have no defined threshold — `OQ-10`.
- A **staff** role (`dental_assistant`) can suspend per `index/roles-and-rbac.md`; whether suspension
  should require `admin` is not stated — `OQ-21`.