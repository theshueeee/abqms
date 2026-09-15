---
id: F-14
title: Notifications (Confirmation & Reminders)
spec_status: blocked
delivery_status: open
blocked_by: [OQ-12, OQ-14, D-06]
parent: docs/SPEC.md
related: [data-model/audit-notification.md, requirements/non-functional.md, api/appointments.md]
depends_on: [F-04]
last_verified: 2026-09-15
---

# F-14 — Notifications (Confirmation & Reminders)

## Purpose

Fire booking confirmations and next-day reminders automatically, with no manual staff trigger.

## In scope

Confirmation email on successful booking, the daily 08:00 reminder cron, sender integration, delivery
tracking.

## Out of scope

Any other channel — SMS is an explicit non-goal.

## Blockers

- `OQ-12` — there is **no delivery/log table**, so a failed or duplicated send cannot be detected. Retry
  policy is also undefined.
- `OQ-14` — "08:00" has no timezone, so the cron boundary is untestable.
- `D-06` — Resend integration details (API key handling, sandbox vs live, from-address).

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-NOTIF-01` | A successful booking enqueues exactly one confirmation email (`NFR-AUTO-01`) | `POST /appointments` |
| `FR-NOTIF-02` | A scheduled job runs daily at 08:00 and sends reminders for **next-day** appointments | cron |
| `FR-NOTIF-03` | No staff action is required to trigger either message (`NFR-AUTO-01`) | — |
| `FR-NOTIF-04` | Sends are idempotent: a retried job must not duplicate a reminder for the same appointment | cron |
| `FR-NOTIF-05` | Each send attempt is recorded with status (sent/failed) so failures are observable | per `OQ-12` |
| `FR-NOTIF-06` | Provider failures never fail the originating booking request | `POST /appointments` |
| `FR-NOTIF-07` | Cancelled or rescheduled appointments do not receive a stale reminder for the old time | cron |
| `FR-NOTIF-08` | Email content includes the slot time, doctor resource and appointment type | — |

## Acceptance criteria

1. **Given** a successful booking, **when** the transaction commits, **then** exactly one confirmation
   send is attempted and the booking response is not blocked by the provider.
2. **Given** the provider returns an error, **when** the booking completes, **then** the booking still
   succeeds and the failure is recorded.
3. **Given** an appointment tomorrow at 09:00 and the job running at 08:00 today, **when** the job
   completes, **then** a reminder was attempted for that appointment only.
4. **Given** the job running twice for the same date, **when** both runs complete, **then** the patient
   received one reminder, not two.
5. **Given** an appointment rescheduled to a later date, **when** the job runs the day before the original
   date, **then** no reminder is sent for the stale slot.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | recipient/selection query for "next-day appointments" (mock clock) | `appointments-next-day` |
| Unit | idempotency key behaviour on repeated invocation | `appointments-next-day` |
| Integration | booking → one send attempt, provider stubbed to fail/succeed | `email-stub` |
| Integration | job run is safe to repeat | `email-stub` |
| Negative | no email sent for cancelled/rescheduled-away appointments | `appointments-cancelled` |

## Open questions

`OQ-12` · `OQ-14` · `D-06`.

## Commit scope

`feat(F-14): automatic booking confirmation and reminder cron`