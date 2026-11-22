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
| `GET` | `/accounts/flagged` | **staff only** (view) | Queue of flagged accounts awaiting review | `F-12` |
| `GET` | `/accounts/suspended` | **staff only** (view) | Accounts under an active suspension, for reinstate review | `F-12` |
| `PATCH` | `/accounts/:id/suspend` | **admin only** | Suspend a flagged account | `F-12` |
| `PATCH` | `/accounts/:id/reinstate` | **admin only** | Clear a flag / reinstate | `F-12` |

Access follows `index/roles-and-rbac.md`: the two review lists are readable by any staff member, while
suspend/reinstate are admin-only (`OQ-21`, decided 2026-11-22).

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

## Resolved decisions

- `OQ-10` (2026-11-22): mapping is `pending ⇒ flagged`, `suspended ⇒ suspended`, `reinstated ⇒ active`
  (see `data-model/moderation.md`). Only the reschedule signal has a numeric trigger; the other two
  review signals are manual-review-only.
- `OQ-21` (2026-11-22): suspend/reinstate are **admin only**; the review lists (`flagged`, `suspended`)
  are readable by any staff member.