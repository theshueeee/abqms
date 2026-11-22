---
id: F-12
title: Flagging & Suspension Review
spec_status: complete
delivery_status: tested
blocked_by: []
parent: docs/SPEC.md
related: [api/accounts.md, data-model/moderation.md, features/F-06-reschedule-and-cancel.md]
rules: [BR-02, BR-05, BR-07]
depends_on: [F-03, F-06]
last_verified: 2026-11-22
---

# F-12 — Flagging & Suspension Review

## Purpose

Give staff a compliance queue: review flagged accounts and either suspend or clear them.

## In scope

Automatic flagging (`BR-02` breach), staff-raised flags, the review queue, suspend, reinstate, and the
effect of suspension on the patient's capabilities.

## Out of scope

The reschedule logic that triggers flagging (`F-06`), analytics aggregation (`F-13`).

## Resolved decisions (2026-11-22)

- `OQ-10` — status↔outcome mapping is `pending ⇒ flagged`, `suspended ⇒ suspended`,
  `reinstated ⇒ active` (enforced in `apps/api/src/moderation/mapping.ts`). Only `BR-02` has a numeric
  trigger; suspicious cancellations and override abuse are manual-review-only.
- `OQ-21` — suspend/reinstate are **admin only** (`BR-07`); the pending/suspended review lists are
  readable by any staff member.

Delivered in `apps/api/src/accounts/routes.ts` mounted at `/api/accounts` and in the staff compliance
UI at `/staff/compliance`.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-MOD-01` | A system trigger (e.g. the `BR-02` breach from `F-06`) creates a `SuspensionRecord` with `triggered_by = system`, `outcome = pending` | → `F-06` — **implemented** by `F-06`; the account is also set to `flagged` (`OQ-10` narrow slice) |
| `FR-MOD-07` | Staff can raise a flag manually with `triggered_by = staff` and a free-text reason | `PATCH /accounts/:id/suspend` |
| `FR-MOD-02` | `/accounts/flagged` lists accounts with an unreviewed record | `GET /accounts/flagged` |
| `FR-MOD-03` | Suspend sets `account_status = suspended`, stores `suspension_reason`, and records reviewer, timestamp and outcome | `PATCH /accounts/:id/suspend` |
| `FR-MOD-04` | Reinstate returns the account to `active` and records the same review fields | `PATCH /accounts/:id/reinstate` |
| `FR-MOD-05` | `admin_notes` is optional but persisted on both paths | both |
| `FR-MOD-06` | A suspended patient cannot log in, book, reschedule or register a walk-in | all patient routes |
| `FR-MOD-08` | Review actions are audited (`BR-06`) | → `F-15` |
| `FR-MOD-09` | Emergency-override frequency is available as an abuse signal for reviewers (`BR-05`) | → `F-13` |
| `FR-MOD-10` | `/accounts/suspended` lists accounts under an active suspension for reinstatement | `GET /accounts/suspended` |
| `FR-MOD-11` | The client can read the current actor's `{ id, role }` to gate admin-only actions | `GET /auth/me` |

## Acceptance criteria

1. **Given** a patient breaching the reschedule limit, **when** the flag commits, **then** an unreviewed
   record appears in `/accounts/flagged` and the account shows the corresponding status per `OQ-10`'s
   mapping.
2. **Given** a flagged account, **when** an admin suspends it with notes, **then** `account_status` is
   `suspended`, `suspension_reason` is set, and reviewer fields are populated.
3. **Given** a suspended patient, **when** they attempt to book or log in, **then** the request is refused.
4. **Given** a suspended account, **when** an admin reinstates it, **then** the patient can book again and the
   record's outcome reflects reinstatement (not deletion).
5. **Given** a review action, **when** the audit trail is read, **then** the actor and timestamp are
   recorded.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | status ↔ outcome mapping transitions (`OQ-10`) | `apps/api/test/accounts.integration.test.ts` (no DB) |
| Integration | pending/suspended review lists; role gating (patient ❌, assistant view ✅, admin action ✅) | `accounts.integration.test.ts` |
| Integration | suspend consumes the pending flag and records reviewer, reason, notes, audit | flagged patient + admin |
| Integration | reinstate returns account to active and records audited outcome | suspended patient + admin |
| Integration | suspended patient cannot log in; pre-existing session blocked on booking (`FR-MOD-06`) | suspended patient |
| Negative | suspend without a pending flag; double suspend; reinstate without a suspension | clean / suspended patient |
| UI (Cypress) | staff compliance queue renders, suspends, empty states, assistant hides actions | `cypress/e2e/f12-compliance-ui.cy.ts` |

## Open questions

Resolved: `OQ-10`, `OQ-21` (see `requirements/open-questions.md` and `api/accounts.md`).

## Commit scope

`feat(F-12): flagging, suspension review and reinstatement`