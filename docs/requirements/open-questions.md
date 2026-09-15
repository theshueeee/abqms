---
id: REQ-OQ
title: Open Questions & Pending Decisions
status: active
parent: docs/SPEC.md
related: [index/business-rules.md, requirements/non-functional.md, traceability.md]
last_verified: 2026-09-15
---

# Open Questions & Pending Decisions

Everything the original spec left contradictory, missing or unmeasurable — captured rather than
guessed. Each entry says what is wrong, where it lives, which features it affects, and what decision
closes it.

**Status values:** `open` (needs a decision) · `decided` (answered — record the answer inline and date
it).

`OQ-NN` = domain/product question. `D-NN` = engineering/stack decision.

---

## OQ-01 — No unique IC / Matric No. login identifier

**Problem:** Login is specified as *IC or Matric No. + password*, but `Patient` has only `email`
(unique) plus non-unique `last_known_id_type` / `last_known_id_number`. There is no column to
authenticate against.
**Affects:** `F-02` (`FR-AUTH-02` blocks) · `data-model/patient-staff.md`
**Decision needed:** add a unique login-identifier column (plus normalisation rules for MyKad vs
Passport vs Matric), or restrict login to email.

## OQ-02 — Doctors cannot exist in the staff model

**Problem:** `Appointment.doctor_staff_id` is a FK to `Staff`, but `Staff.role` is only
`dental_assistant | admin` and `BR-08` says doctors never use the system. No row can represent a
doctor.
**Affects:** `F-03`, `F-04`, `F-07`, `F-09`, `F-11`, `F-16` — every booking and queue feature
**Decision needed:** (a) add a non-login `doctor` value to the enum, (b) split out a `Doctor` entity, or
(c) introduce a doctor-resource table that assistants manage.

## OQ-03 — Two competing reschedule-limit mechanisms

**Problem:** `Patient.reschedule_credits` (decremented, resets on a rolling window) and
`Appointment.reschedule_count` both attempt to model `BR-02`. `RescheduleLog` could support either.
**Affects:** `F-06` (`FR-RESCH-01` unit tests) · `F-12` · `F-13`
**Decision needed:** pick one authoritative store, and define the exact window boundary (rolling 30
days from now, inclusive/exclusive) and the reset semantics.

## OQ-04 — Unregistered walk-ins are unrepresentable

**Problem:** `QueueTicket.appointment_id` is a non-null 1:1 and `patient_id` → `Patient` is required,
but the spec allows a walk-in with no account, and keeps identity in `Appointment.walkin_*` and
`QueueTicket.ocr_*` (duplicated).
**Affects:** `F-07` (`FR-WALKIN-06` blocks)
**Decision needed:** either make those FKs nullable with `walkin_*` as the source of truth, or create a
guest `Patient` record at registration; then deduplicate the identity fields.

## OQ-05 — Room capacity has no entity and no route

**Problem:** "Check room capacity (pause if full)" is a workflow step, but no room/capacity entity,
column or endpoint exists.
**Affects:** `F-09` (`FR-MASTER-05`) · `data-model/audit-notification.md` (proposed `Room`)
**Decision needed:** model rooms/capacity, or replace the rule with a manual pause toggle (and state who
may toggle it).

## OQ-06 — AM/PM dual-mode boundaries are undefined

**Problem:** `BR-04` gates the entire product (walk-in vs booking) but no clock boundary, holiday rule or
override mechanism is specified, and no clinic-hours configuration exists.
**Affects:** `F-04` (`FR-BOOK-04`), `F-07` (`FR-WALKIN-08`), `F-05`
## OQ-07 — Time-block deletion destroys its own record

**Problem:** `TimeBlock` has no soft-delete/active flag, yet `DELETE /timeblocks/:id` exists. A hard
delete removes the explanation for a calendar that is now open.
**Affects:** `F-11` (`FR-TB-06`) · `F-15`
**Decision needed:** soft delete (`is_active` / `deleted_at`) versus hard delete plus a compensating
audit row.

## OQ-08 — Audit log cannot express non-HTTP events

**Problem:** `AuditLog.action` is `Enum(POST, PATCH, DELETE, GET)` and `user_id` is a bare `String` with
no actor type. `LOGIN`, `PASSWORD_RESET`, `CRON_REMINDER_SENT`, `SYSTEM_FLAG` and `EMERGENCY_OVERRIDE`
cannot be recorded faithfully, and the filter set is undefined.
**Affects:** `F-15` (`FR-AUDIT-03`, `FR-AUDIT-04`, `FR-AUDIT-07`) · `F-12` · `F-14`
**Decision needed:** define an action namespace (or add an `event_type` column), add an actor-type
discriminator, and specify filters and retention.

## OQ-09 — Cancellation reason is required by the API but nullable in the model

**Problem:** `PATCH /appointments/:id/cancel` requires `cancellation_reason_id`, but the column is
nullable so nothing enforces it; actor exclusivity between `cancelled_by_patient_id` and
`cancelled_by_staff_id` is likewise unenforced.
**Affects:** `F-06` (`FR-RESCH-04`, `FR-RESCH-05`)
**Decision needed:** make the column non-null (or add a check constraint) and enforce exactly one actor
at the database level too.

## OQ-10 — Account-status ↔ suspension-outcome mapping, and two untriggered signals

**Problem:** `Patient.account_status` (`active`/`suspended`/`flagged`) and `SuspensionRecord.outcome`
(`pending`/`suspended`/`reinstated`) have no written mapping. Only the reschedule signal has a numeric
trigger — "suspicious cancellations" and "emergency-override abuse" have no thresholds at all.
**Affects:** `F-12` (`FR-MOD-01`…`04`) · `F-13` (`FR-AN-07`)
**Decision needed:** state the mapping explicitly and define thresholds, or declare those two signals
manual-review-only.

## OQ-11 — The two status machines are unlinked

**Problem:** Two parallel enums describe overlapping state (`Appointment.status` vs
`QueueTicket.queue_status`) with no constraint or written contract keeping them in sync, and the
`pending` → `confirmed` trigger is undefined.
**Affects:** `F-04`, `F-05`, `F-09` (`FR-MASTER-03`) · `data-model/queue.md`
**Decision needed:** name the authoritative machine and the projection rule onto the other.

## OQ-12 — Missing tables for reset tokens, sessions and email delivery

**Problem:** Forgot/reset password is specified but there is no token table; session strategy is
undecided with no store; notifications have no delivery log, so failures and duplicates are invisible
and retry is undefined.
**Affects:** `F-02` (`FR-AUTH-05`), `F-14` (`FR-NOTIF-05`)
**Decision needed:** add `PasswordResetToken`, a session/refresh store if used, and `NotificationLog`
with a status field plus an idempotency key.

## OQ-13 — Queue ordering has no tie-break and no concurrency guard

**Problem:** `original_position` / `current_position` are plain ints. Nothing defines the order when two
tickets share an issue timestamp, and nothing prevents two staff members calling next — or an override
racing a call-next — from producing duplicate or skipped positions.
**Affects:** `F-08` (distance-to-turn), `F-09` (`FR-MASTER-06`), `F-10` (`FR-OVR-02`)
## OQ-14 — No timezone policy

**Problem:** `QueueTicket.queue_date` is a `Date` while everything else is `DateTime`, and no timezone is
stated. This makes "within 15 minutes" (`BR-03`), the daily 08:00 reminder (`FR-NOTIF-02`), the AM/PM
boundaries (`OQ-06`) and "per day" for the cap (`BR-01`) all untestable.
**Affects:** `F-05`, `F-07`, `F-13`, `F-14` · `data-model/_overview.md`
**Decision needed:** declare the operating timezone (expected: `Asia/Kuala_Lumpur`, UTC+8), the storage
convention (UTC in DB, rendered local), and the definition of a "queue day".

## OQ-15 — Slot generation and cap scope are unspecified

**Problem:** Nothing defines how `AppointmentType.default_duration_minutes`, the 15/doctor/day cap
(`BR-01`), `TimeBlock` exclusions and overlap prevention combine into bookable slots. Also unresolved:
whether walk-ins (`F-07`), follow-ups (`F-16`) and emergency overrides count toward the cap, and the
maximum follow-up chain depth.
**Affects:** `F-04` (`FR-BOOK-02`…`05`, blocks), `F-07`, `F-16` · `F-13` (cap utilisation)
**Decision needed:** specify the slot grid (slot interval, working hours per doctor, how doctor
availability is stored) and state explicitly which appointment kinds consume the daily cap.

## OQ-16 — `queue_number` format is unexplained

**Problem:** The example is `B-014`. The `B` prefix, the padding, and whether numbering resets daily or
per doctor are all undefined.
**Affects:** `F-07` (`FR-WALKIN-05`), `F-08`
**Decision needed:** define the format, the per-doctor/per-day scope, the reset cadence and the
uniqueness constraint.

## OQ-17 — Derived figures have no definitions

**Problem:** Four numbers are displayed to users but no formula exists for any of them. Each needs a
definition, a denominator and a rounding rule, otherwise their tests assert nothing.

| Figure | Shown to | Appears in |
|---|---|---|
| Estimated wait | Patient live view | `F-08` (`FR-QUEUE-03`) |
| Traffic volume | Staff dashboard | `F-13` (`FR-AN-01`) |
| No-show rate | Staff dashboard | `F-13` (`FR-AN-02`) |
| Peak hours (bucketing) | Staff dashboard | `F-13` (`FR-AN-03`) |

**Affects:** `F-08`, `F-13` — both blocked until fixed
**Decision needed:** write each formula (e.g. no-show rate = no-shows ÷ booked appointments in range,
walk-ins included or not), state the default date range, and the hour-bucketing rule.

## OQ-18 — Realtime transport is undecided

**Problem:** `NFR-RT-01` requires the live queue and Master View to "feel live" and leaves polling vs
push to the implementer, but no transport, update budget, auth model or contract for the channel is
specified — so the requirement cannot be tested.
**Affects:** `F-08` (`FR-QUEUE-04`, `FR-MASTER-04`), `F-09` · `requirements/non-functional.md`
(`NFR-RT-02` is missing)
**Decision needed:** choose the mechanism (poll interval / SSE / WebSocket), define the maximum
acceptable propagation delay, and specify authentication and scoping for the channel.

## OQ-19 — API conventions omitted and several required endpoints are missing

**Problem:** No error envelope, status-code mapping, pagination, rate limiting or versioning is
specified. Separately, the UI needs endpoints that do not exist in the spec:

| Missing route | Wanted by |
|---|---|
| Reference data: appointment types, doctors, cancellation reasons | `F-04`, `F-06` |
| Patient's own records ("view records" capability) | `F-02` (`FR-AUTH-08`) |
| Emergency-override **impact preview** (promised in the workflow, no route) | `F-10` (`FR-OVR-03`) |
| Slot availability query | `F-04` (`FR-BOOK-09`) |
| Logout / session invalidation | `F-02` |

## OQ-20 — OCR provider, upload limits and PII retention

**Problem:** `POST /walkin/ocr` is specified with no provider (`D-05`), no request format (multipart?),
no size/type limits, no timeout or failure contract, and no retention rule for scanned ID images.
Patient ID documents are sensitive personal data under Malaysia's PDPA.
**Affects:** `F-07` (`FR-WALKIN-01`), `F-14` · `requirements/non-functional.md` (`NFR-SEC-05`)
**Decision needed:** choose the provider and where it runs, define accepted formats and size caps, state
whether images are stored at all (recommended: process in memory, never persist), and define the
failure → manual-fallback contract.

## OQ-21 — Access-scope ambiguities

**Problem:** Several capabilities have no named role:

| Capability | Ambiguity |
|---|---|
| Check-in | Patient self-service or staff-only? (`FR-CHKIN-01` / `FR-CHKIN-06`) |
| Analytics viewing | `dental_assistant` or `admin` only? (`FR-AN-08`) |
| Suspension / reinstatement | Any `dental_assistant` or `admin` only? (`FR-MOD-03`) |
| Audit-log reading | Spec says "staff/admin"; does that include assistants? (`FR-AUDIT-06`) |

**Affects:** `F-05`, `F-12`, `F-13`, `F-15` · `index/roles-and-rbac.md`
**Decision needed:** pin each capability to a role in `index/roles-and-rbac.md`, which is authoritative.

## OQ-22 — No measurable non-functional targets

**Problem:** The spec states five qualitative constraints (`NFR-RT-01`, `NFR-AUTO-01`, `NFR-AUD-01`,
`NFR-RBAC-01`, `NFR-UX-01`) but no numbers: no latency, capacity, availability, security policy
(password rules, hashing algorithm, session strategy, rate limits), privacy/retention, accessibility or
backup target. "Tested" therefore has no acceptance bar.
**Affects:** every feature · `requirements/non-functional.md`
**Decision needed:** fill in the missing `NFR-*` rows listed in `requirements/non-functional.md`.

## OQ-23 — `checkin_method = qr` has no corresponding feature

**Problem:** `QueueTicket.checkin_method` includes `qr`, but **no QR code generation, display or scan
flow is described anywhere** in the spec — not in the patient journey, the assistant journey or the API
surface.
**Affects:** `F-07` (enum value), `F-02`, `index/glossary.md`
**Decision needed:** either specify the QR flow (issue, render, scan, verify, expiry) or drop `qr` from
the enum.

---

# D-NN — Pending engineering/stack decisions

These block `F-01` (scaffold). Everything else can proceed once these are answered.

| ID | Decision | Options | Why it matters |
|---|---|---|---|
| `D-01` | Frontend framework/approach for the patient portal and staff dashboard | e.g. React/Next.js, Vue, plain server-rendered | Determines the whole UI codebase; patient surface must be mobile-friendly with no install (`NFR-UX-02`) |
| `D-02` | Repository layout | single app vs `apps/api` + `apps/web` | Determines build, test and deployment wiring for every later feature |
| `D-03` | Test framework and tooling | unit/integration runner + E2E tool | Every feature's Test plan assumes a runner exists; `NFR-TEST-01` depends on it |
| `D-04` | Deployment target and CI | where the app runs, how migrations apply on release | `F-01` (`FR-SCAF-04`), and how "tested" is enforced before a commit or deploy |
| `D-05` | OCR provider | local OCR engine vs cloud vision API | Blocks `F-07`; also a privacy question (`OQ-20`, `NFR-SEC-05`) |
| `D-06` | Email integration details | Resend account, sandbox vs live, from-address, key handling | Blocks `F-14`; must never commit secrets (`FR-SCAF-02`) |

---

## Resolving an entry

1. Decide, then **edit this file**: change `Status: open` to `Status: decided`, write the answer inline
   and date it.
2. Propagate per the touch-list in `.clinerules`: update the owning feature file, and the `api/` or
   `data-model/` file it cites.
3. Update the affected rows in `traceability.md`.
4. If the decision adds a new document, link it from `docs/SPEC.md`.