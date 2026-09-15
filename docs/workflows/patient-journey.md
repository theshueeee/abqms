---
id: WF-PATIENT
title: Workflow — Patient Journey
status: active
parent: docs/SPEC.md
related: [workflows/assistant-journey.md, index/business-rules.md]
last_verified: 2026-09-15
---

# Workflow — Patient Journey

Narrative end-to-end view. Every step links to the feature that owns it; behaviour is specified
there, not here.

## 1. Authentication

Sign up / log in with **IC or Matric No. + password** → forgot-password flow if needed.
→ `F-02-patient-auth.md` · ⚠ login identifier column missing (`OQ-01`).

## 2. Branching: book (PM) or walk in (AM)

`BR-04` decides which path is available at the current time. Clock boundaries are undecided
(`OQ-06`).

### 2a. Book an appointment (PM)

1. Select a slot → booking created → confirmation email fires automatically.
   → `F-04-appointment-types-and-booking.md`
2. On arrival, **check in within 15 minutes of the slot time** (`BR-03`).
   → `F-05-checkin-and-late-handling.md`
3. Late / no check-in → prompted to reschedule. → `F-06-reschedule-and-cancel.md`
   - Reschedule allowed only while `BR-02` holds (fewer than 5 reschedules per rolling 30 days).
   - Breaching `BR-02` → **account flagged** → compliance queue. → `F-12-flagging-and-suspension.md`
   - Declining the reschedule → appointment **cancelled**.

### 2b. Walk in (AM)

OCR registration (auto ID scan) or manual fallback → virtual queue ticket issued.
→ `F-07-walkin-registration-ocr.md` · ⚠ guest handling (`OQ-04`), ticket numbering (`OQ-16`).

## 3. Queue tracking

Patient views live position and distance-to-turn, sees the doctor, session ends.
→ `F-08-queue-live-view.md` · ⚠ ETA formula (`OQ-17`), realtime transport (`OQ-18`).

## 4. After the visit

Follow-up booking if the clinician requires it (staff-only action).
→ `F-16-followup-booking.md`

## 5. Parallel: reminders and records

Reminder email the day before, cron-triggered at 08:00, no manual trigger.
→ `F-14-notifications.md` · Patient can view their own records. → `F-02-patient-auth.md`