---
id: F-10
title: Emergency Override
spec_status: blocked
delivery_status: open
blocked_by: [OQ-13, OQ-19]
parent: docs/SPEC.md
related: [api/walkin-queue.md, data-model/queue.md, features/F-13-analytics.md]
rules: [BR-05, BR-04]
depends_on: [F-09]
last_verified: 2026-09-15
---

# F-10 — Emergency Override

## Purpose

Let staff move a patient to the front of the queue with a mandatory, auditable reason — and see the
consequences before committing.

## In scope

Reason capture (quick-select or free text), impact preview, front-of-queue reordering, override
bookkeeping, abuse-monitoring data.

## Out of scope

The general queue advancement (`F-09`), compliance review of override abuse (`F-12`).

## Blockers

- `OQ-19` — the spec **promises an impact preview** ("who gets bumped, by how many minutes") but no
  endpoint exists for it.
- `OQ-13` — reordering mutates `current_position` for many rows at once; without an ordering rule and a
  transaction boundary, positions can collide with a concurrent call-next.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-OVR-01` | Override requires a non-empty reason — quick-select (Medical Emergency / Doctor Referral / Admin Priority) or free text (`BR-05`) | `POST /queue/emergency-override` |
| `FR-OVR-02` | The selected patient moves to the front of their doctor's queue immediately | `POST /queue/emergency-override` |
| `FR-OVR-03` | Before confirming, staff can preview who is bumped and by how many positions/minutes | preview route missing (`OQ-19`) |
| `FR-OVR-04` | `is_emergency_override`, `override_reason`, `override_by_staff_id` and `original_position` are persisted | `POST /queue/emergency-override` |
| `FR-OVR-05` | Every override is logged for abuse monitoring (`BR-05`) and visible to `F-13` as a repeat-offender signal | → `F-15`, `F-13` |
| `FR-OVR-06` | Overrides respect the same doctor/day scope as the queue under `BR-04` | `POST /queue/emergency-override` |
| `FR-OVR-07` | Only staff may override (`BR-07`); patients cannot | `POST /queue/emergency-override` |

## Acceptance criteria

1. **Given** a waiting ticket, **when** an override is posted without a reason, **then** the request is
   refused and no reorder happens (`BR-05`).
2. **Given** a valid reason, **when** the override commits, **then** the ticket's `current_position = 1`
   while `original_position` retains its issue value.
3. **Given** a queue of 5, **when** the preview is requested, **then** it lists the displaced tickets and
   the delay for each, and the preview itself changes no state.
4. **Given** a patient session, **when** it attempts an override, **then** the response is `403`.
5. **Given** an override, **when** the audit trail is read, **then** actor, reason and timestamp are
   present.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | reorder function: displaced positions and delay arithmetic | `queue-ordering` |
| Unit | quick-select values are a closed list; free text is accepted and stored verbatim | none |
| Integration | override moves to front; `original_position` unchanged | `queue-day` |
| Integration | preview is side-effect free (snapshot state before/after) | `queue-day` |
| Concurrency | override racing a call-next leaves consistent, gap-free positions | `queue-day` |
| Negative | missing reason; patient actor; ticket from another doctor/day | `patient-booker` |

## Open questions

`OQ-19` (preview route — blocks `FR-OVR-03`) · `OQ-13` (concurrency).

## Commit scope

`feat(F-10): emergency override with reason and impact preview`