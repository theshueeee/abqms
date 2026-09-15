---
id: IDX-BR
title: Business Rules
status: active
parent: docs/SPEC.md
related: [index/roles-and-rbac.md, index/glossary.md, requirements/non-functional.md]
last_verified: 2026-09-15
---

# Business Rules

Cross-feature rules. Features **cite** these by ID and never restate them — if a rule changes here,
every citing feature is affected by design.

| ID | Rule | Status | Notes |
|---|---|---|---|
| `BR-01` | Hard cap of **15 patients per doctor per day**. | Active | Scope of who counts (walk-ins, follow-ups, overrides) undecided — `OQ-15`. No enforcement field exists in the schema yet. |
| `BR-02` | A patient may reschedule only while **fewer than 5 reschedules within a rolling 30-day window**; breaching it **flags** the account. | Active | Two competing mechanisms exist in the schema (`Patient.reschedule_credits` vs `Appointment.reschedule_count`) — `OQ-03`. |
| `BR-03` | A booked patient must **check in within 15 minutes** of the scheduled slot time. Late/no check-in → prompt to reschedule. Declining the reschedule → appointment **cancelled**. | Active | Timezone for "15 minutes" must be explicit — `OQ-14`. Check-in actor undecided — `OQ-21`. |
| `BR-04` | **Dual mode:** AM serves walk-ins only (live QMS); PM serves pre-scheduled appointments only. | Active | Clock boundaries and enforcement point undecided — `OQ-06`. |
| `BR-05` | An **emergency override requires a mandatory reason** (quick-select: Medical Emergency / Doctor Referral / Admin Priority, or free text) and is **logged for abuse monitoring**. | Active | Quick-select values are a closed list; adding values is a spec change. |
| `BR-06` | **Audit logging is silent and background** — it must not block a request or surface in the UI. | Active | See `NFR-AUD-01`; implementation is `F-15`. |
| `BR-07` | **RBAC is enforced server-side on every route**, not merely hidden client-side. | Active | See `NFR-RBAC-01`; implementation is `F-03`. |
| `BR-08` | **Doctors are not system users.** Every scheduling/queue/scheduling action is performed by a Dental Assistant on their behalf. | Active | Conflicts with `Appointment.doctor_staff_id → Staff` while `Staff.role` excludes doctors — `OQ-02`. |

## Prompting/derived behaviours owned by rules

- `BR-02` breach → flag (`F-12`), evaluated inside reschedule (`F-06`).
- `BR-03` breach → `no_show` status + reschedule prompt (`F-05`).
- `BR-05` override → queue reordering with impact preview (`F-10`).