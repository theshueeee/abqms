---
id: IDX-GLOSSARY
title: Glossary
status: active
parent: docs/SPEC.md
related: [index/business-rules.md, index/roles-and-rbac.md]
last_verified: 2026-09-15
---

# Glossary

Terms used across the spec. If a term is defined here, no feature file re-defines it.

| Term | Definition |
|---|---|
| **Dual Mode** | The clinic's operating split: AM runs a live queue (walk-ins), PM runs a booking calendar. See `BR-04`. |
| **AM / PM** | The two operating halves of a clinic day. Exact clock boundaries are **undecided** — `OQ-06`. |
| **Walk-in** | A patient who arrives without a prior booking and joins the AM queue. |
| **Virtual queue ticket** | The patient-facing queue record issued at walk-in registration; carries `queue_number` (e.g. `B-014`) and a live position. Prefix format is **undecided** — `OQ-16`. |
| **Master View** | The staff dashboard showing all of today's queue/booking state grouped as waiting / in-progress / completed. |
| **Distance-to-turn** | How many patients remain ahead of a given ticket before it is called. |
| **Estimated wait** | A patient-facing time estimate derived from distance-to-turn. Formula **undecided** — `OQ-17`. |
| **Call next patient** | The single staff action that completes the current consultation and starts the next queued patient (`NFR-UX-01`). |
| **Emergency override** | A staff action that moves a patient to the front of the queue, requiring a reason and logging the actor (`BR-05`). |
| **Queue position** | A ticket's ordinal rank. Tracked as `original_position` (at issue) and `current_position` (after overrides). |
| **Check-in** | Confirming an AM walk-in arrival or a PM booked patient's arrival. PM check-in is bounded by the 15-minute window (`BR-03`). |
| **No-show** | A booked patient who did not check in within the window; prompts a reschedule offer. |
| **Slot** | A bookable PM time interval. Slot generation rules are **undecided** — `OQ-15`. |
| **Time-block** | A calendar lock placed on a doctor resource (leave, academic duty) that removes availability. |
| **Reschedule credit / count** | The budget limiting reschedules (fewer than 5 per rolling 30 days, `BR-02`). Which mechanism is authoritative is **undecided** — `OQ-03`. |
| **Hard cap** | 15 patients per doctor per day (`BR-01`). Whether walk-ins, follow-ups and overrides count against it is **undecided** — `OQ-15`. |
| **Flagged / suspended** | Patient account states arising from compliance review. The mapping between `Patient.account_status` and `SuspensionRecord.outcome` is **undecided** — `OQ-10`. |
| **OCR** | Automated extraction of patient identity fields from an ID document image during walk-in registration. Provider, upload limits and image retention are **undecided** — `OQ-20` / `D-05`. |
| **Doctor (resource)** | The clinician a booking/ticket is assigned to. Doctors are **not** login users (`BR-08`); how they are modelled is **undecided** — `OQ-02`. |
| **Dental Assistant** | The staff role that performs every scheduling, queueing and moderation action on the doctors' behalf. |
| **Patient record** | The patient's own history view (bookings, tickets, reschedules). |