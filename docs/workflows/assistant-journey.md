---
id: WF-ASSISTANT
title: Workflow — Dental Assistant Journey
status: active
parent: docs/SPEC.md
related: [workflows/patient-journey.md, index/roles-and-rbac.md]
last_verified: 2026-09-15
---

# Workflow — Dental Assistant Journey

Narrative view of the staff day. Behaviour is specified in the linked feature files.

## 1. Intake

1. Check for an existing appointment.
2. If booked → check the patient in directly. → `F-05-checkin-and-late-handling.md`
3. If walk-in → OCR or manual registration → issue a virtual queue ticket → the patient appears in
   Master View. → `F-07-walkin-registration-ocr.md`

## 2. Queue management sub-process (AM)

1. Check room capacity; pause the queue if the room is full.
   → `F-09-master-view-call-next.md` · ⚠ no room entity exists (`OQ-05`).
2. Check for emergency-flagged patients → jump them to the front of the queue.
   → `F-10-emergency-override.md`
3. **"Call next patient"** — one button. Statuses update: previous → `Completed`, new → `Ongoing`,
   and Master View / DB stay in sync. → `F-09-master-view-call-next.md`

## 3. Post-consultation

Book a follow-up if needed, otherwise end. → `F-16-followup-booking.md`

## 4. Parallel admin streams (always available)

| Stream | Feature | Open questions |
|---|---|---|
| Time-block management (lock the calendar for leave / academic duties) | `F-11-timeblock-management.md` | `OQ-07` |
| Compliance review: flag → review (suspicious cancellations / excessive reschedules / override abuse) → suspend or clear | `F-12-flagging-and-suspension.md` | `OQ-10`, `OQ-21` |
| Analytics dashboard (traffic, no-show rate, peak hours) | `F-13-analytics.md` | `OQ-17`, `OQ-21` |
| Reading the audit trail | `F-15-audit-logging.md` | `OQ-08` |

## 5. Cross-cutting constraints on the assistant's day

- Every action is server-side authorised (`BR-07`) — no client-side-only hiding.
- Every mutating action is audited silently (`BR-06`).
- Doctors never appear as system users; the assistant acts on their behalf (`BR-08`).