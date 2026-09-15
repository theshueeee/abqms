---
id: TRACEABILITY
title: Traceability Matrix
status: active
parent: docs/SPEC.md
related: [requirements/open-questions.md, requirements/non-functional.md]
last_verified: 2026-09-15
---

# Traceability Matrix

The audit trail for the spec→build loop. When a feature is finished and its tests pass, update its
**Status** here in the same commit.

**Status vocabulary:** `open` → `specified` → `built` → `tested` → `shipped`
(`built` = code exists; `tested` = its Test plan passes; `shipped` = merged to `develop`/`main`)
**Legend:** ⚠ = blocked by an open question or pending decision.

## 1. Feature status board

| ID | Feature | spec | delivery | blocked by | FRs | Commit |
|---|---|---|---|---|---|---|
| `F-01` | Scaffold & Tooling | blocked | open | D-01…D-04 | 6 | `chore(F-01)` |
| `F-02` | Patient Auth & Account Recovery | blocked | specified | OQ-01, OQ-12, OQ-22 | 9 | `feat(F-02)` |
| `F-03` | Staff Provisioning & RBAC | complete | specified | — | 8 | `feat(F-03)` |
| `F-04` | Appointment Types & PM Booking | blocked | specified | OQ-06, OQ-11, OQ-15, OQ-19 | 9 | `feat(F-04)` |
| `F-05` | Check-in & Late Handling | blocked | specified | OQ-14, OQ-21 | 6 | `feat(F-05)` |
| `F-06` | Reschedule & Cancellation | blocked | specified | OQ-03, OQ-09, OQ-19 | 8 | `feat(F-06)` |
| `F-07` | Walk-in Registration (OCR + Manual) | blocked | specified | OQ-04, OQ-16, OQ-20, D-05 | 10 | `feat(F-07)` |
| `F-08` | Live Queue View (patient-facing) | blocked | specified | OQ-16, OQ-17, OQ-18 | 7 | `feat(F-08)` |
| `F-09` | Master View & Call-Next | blocked | specified | OQ-05, OQ-11, OQ-13, OQ-18 | 9 | `feat(F-09)` |
| `F-10` | Emergency Override | blocked | specified | OQ-13, OQ-19 | 7 | `feat(F-10)` |
| `F-11` | Time-Block Management | blocked | specified | OQ-07 | 7 | `feat(F-11)` |
| `F-12` | Flagging & Suspension Review | blocked | specified | OQ-10, OQ-21 | 9 | `feat(F-12)` |
| `F-13` | Analytics Dashboard | blocked | specified | OQ-17, OQ-21, OQ-22 | 8 | `feat(F-13)` |
| `F-14` | Notifications | blocked | specified | OQ-12, OQ-14, D-06 | 8 | `feat(F-14)` |
| `F-15` | Audit Logging | blocked | specified | OQ-08, OQ-22 | 8 | `feat(F-15)` |
| `F-16` | Follow-up Booking | blocked | specified | OQ-15 | 7 | `feat(F-16)` |

**Suggested build order** (respecting dependencies):
`F-01` → `F-02`, `F-03` → `F-11` → `F-04` → `F-05`, `F-06` → `F-12` → `F-07` → `F-08`, `F-09` →
`F-10` → `F-16` → `F-14`, `F-15` → `F-13`.

## 2. Business-rule coverage

| ID | Rule | Implemented by | Status |
|---|---|---|---|
| `BR-01` | 15 patients/doctor/day | `F-04`, `F-07`, `F-16`, `F-13` | ⚠ scope undecided (`OQ-15`) |
| `BR-02` | <5 reschedules / rolling 30 days | `F-06`, `F-12` | ⚠ mechanism undecided (`OQ-03`) |
| `BR-03` | 15-minute check-in window | `F-05` | ⚠ timezone needed (`OQ-14`) |
| `BR-04` | AM = walk-in, PM = booked | `F-04`, `F-07` | ⚠ boundaries undecided (`OQ-06`) |
| `BR-05` | Override needs reason + audit | `F-10`, `F-13`, `F-15` | specified |
| `BR-06` | Audit is silent and non-blocking | `F-15` | specified |
| `BR-07` | Server-side RBAC on every route | `F-03` | specified |
| `BR-08` | Doctors are not system users | `F-03`, `F-16` | ⚠ model conflict (`OQ-02`) |

## 3. Non-functional coverage

| ID | Requirement | Verified by | Status |
|---|---|---|---|
| `NFR-RT-01` | Live queue / Master View feel live | `F-08`, `F-09` | ⚠ transport + budget missing (`OQ-18`) |
| `NFR-AUTO-01` | Notifications fire automatically | `F-14` | specified |
| `NFR-AUD-01` | Audit logging silent, non-blocking | `F-15` (resilience test) | specified |
| `NFR-RBAC-01` | RBAC enforced server-side everywhere | `F-03` (guard sweep) | specified |
| `NFR-UX-01` | Call-next is a single click | `F-09` | specified |
| `NFR-UX-02` | Browser-based, mobile-friendly, no install | all UI features | specified |
| `NFR-PERF-01…03`, `NFR-SEC-01…05`, `NFR-TEST-01`, `NFR-UX-03`, `NFR-OPS-01` | Not yet written | — | ⚠ undefined (`OQ-22`) |

## 4. Open-question and decision coverage

| ID | Affects | Status |
|---|---|---|
| `OQ-01` | `F-02` | open |
| `OQ-02` | `F-03`, `F-04`, `F-07`, `F-09`, `F-11`, `F-16` | open |
| `OQ-03` | `F-06`, `F-12`, `F-13` | open |
| `OQ-04` | `F-07` | open |
| `OQ-05` | `F-09` | open |
| `OQ-06` | `F-04`, `F-05`, `F-07` | open |
| `OQ-07` | `F-11`, `F-15` | open |
| `OQ-08` | `F-15`, `F-12`, `F-14` | open |
| `OQ-09` | `F-06` | open |
| `OQ-10` | `F-12`, `F-13` | open |
| `OQ-11` | `F-04`, `F-05`, `F-09` | open |
| `OQ-12` | `F-02`, `F-14` | open |
| `OQ-13` | `F-08`, `F-09`, `F-10` | open |
| `OQ-14` | `F-05`, `F-07`, `F-13`, `F-14` | open |
| `OQ-15` | `F-04`, `F-07`, `F-13`, `F-16` | open |
| `OQ-16` | `F-07`, `F-08` | open |
| `OQ-17` | `F-08`, `F-13` | open |
| `OQ-18` | `F-08`, `F-09` | open |
| `OQ-19` | `F-02`, `F-04`, `F-06`, `F-10`, all | open |
| `OQ-20` | `F-07`, `F-14` | open |
| `OQ-21` | `F-05`, `F-12`, `F-13`, `F-15` | open |
| `OQ-22` | every feature | open |
| `OQ-23` | `F-07`, `F-02` | open |
| `D-01`…`D-06` | `F-01` (+ `F-07`, `F-14`) | open |

## 5. Functional-requirement index

Statements live in the owning feature file; this index only tracks where each requirement lands and
whether it is done. `Status` follows the same vocabulary.

### `F-01` Scaffold & Tooling — `features/F-01-scaffold-and-tooling.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-SCAF-01` | repo layout (`D-02`) | build | specified |
| `FR-SCAF-02` | `.env` + example; no secrets | config test | specified |
| `FR-SCAF-03` | test runner | suite runs | specified |
| `FR-SCAF-04` | Prisma migration baseline | migration on empty DB | specified |
| `FR-SCAF-05` | `GET /api/health` | smoke | specified |
| `FR-SCAF-06` | README / setup docs | manual | specified |

### `F-02` Patient Auth — `features/F-02-patient-auth.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-AUTH-01` | `POST /auth/signup` | integration signup→login | specified ⚠ |
| `FR-AUTH-02` | `POST /auth/login` | integration (blocked: `OQ-01`) | open ⚠ |
| `FR-AUTH-03` | `POST /auth/login` | role resolved server-side | specified |
| `FR-AUTH-04` | `password_hash` | hashing round-trip unit | specified |
| `FR-AUTH-05` | `POST /auth/forgot-password` | token lifecycle unit | specified ⚠ |
| `FR-AUTH-06` | `POST /auth/reset-password` | reuse/expiry negatives | specified |
| `FR-AUTH-07` | `POST /auth/login` | rate-limit integration | specified |
| `FR-AUTH-08` | `GET /patients/me/*` (route missing) | ownership integration | specified ⚠ |
| `FR-AUTH-09` | all patient routes | suspended-login negative | specified |

### `F-03` Staff Provisioning & RBAC — `features/F-03-staff-provisioning-rbac.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-STAFF-01` | `POST /auth/staff/create` | assistant-refused integration | specified |
| `FR-STAFF-02` | `Staff.provisioned_by` | integration | specified |
| `FR-STAFF-03` | role validation | invalid-role negative | specified |
| `FR-STAFF-04` | duplicate email | negative | specified |
| `FR-STAFF-05` | `POST /auth/login` | inactive-staff negative | specified |
| `FR-STAFF-06` | all routes | 401/403 guard sweep | specified |
| `FR-STAFF-07` | central guard | route inventory sweep | specified |
| `FR-STAFF-08` | audit hook | integration | specified |

### `F-04` Appointment Types & PM Booking — `features/F-04-appointment-types-and-booking.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-BOOK-01` | `POST /appointments` | integration | specified |
| `FR-BOOK-02` | `POST /appointments` | double-book negative | specified |
| `FR-BOOK-03` | `POST /appointments` | cap boundary 14/15/16 | specified  |
| `FR-BOOK-04` | `POST /appointments` | mode gate (mock clock) | specified  |
| `FR-BOOK-05` | `POST /appointments` | time-block exclusion | specified |
| `FR-BOOK-06` | → `F-14` | email job ≤1 | specified |
| `FR-BOOK-07` | `GET /appointments` | ownership integration | specified |
| `FR-BOOK-08` | `POST /appointments` | suspended negative | specified |
| `FR-BOOK-09` | availability route (missing) | slot generation unit | specified ⚠ |

### `F-05` Check-in & Late Handling — `features/F-05-checkin-and-late-handling.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-CHKIN-01` | `POST /appointments/:id/checkin` | window boundary unit | specified ⚠ |
| `FR-CHKIN-02` | same | late → `no_show` integration | specified |
| `FR-CHKIN-03` | `PATCH …/cancel` | decline → cancelled | specified |
| `FR-CHKIN-04` | same | terminal-state negative | specified |
| `FR-CHKIN-05` | → `F-09` | Master View reflects check-in | specified |
| `FR-CHKIN-06` | same | non-owner negative | specified  |

### `F-06` Reschedule & Cancellation — `features/F-06-reschedule-and-cancel.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-RESCH-01` | `PATCH /appointments/:id/reschedule` | rolling-window unit (blocked: `OQ-03`) | open ⚠ |
| `FR-RESCH-02` | `RescheduleLog` | integration | specified |
| `FR-RESCH-03` | → `F-12` | breach → flag integration | specified ⚠ |
| `FR-RESCH-04` | `PATCH …/cancel` | missing-reason negative | specified  |
| `FR-RESCH-05` | `cancelled_by_*` | actor-exclusivity unit | specified |
| `FR-RESCH-06` | `PATCH …/reschedule` | new-slot validity | specified |
| `FR-RESCH-07` | `PATCH …/cancel` | double-cancel negative | specified |
| `FR-RESCH-08` | both | ownership negative | specified |

### `F-07` Walk-in Registration — `features/F-07-walkin-registration-ocr.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-WALKIN-01` | `POST /walkin/ocr` | stub-provider integration | specified  |
| `FR-WALKIN-02` | `POST /walkin/register` | manual path | specified |
| `FR-WALKIN-03` | `last_known_id_*` | returning-patient integration | specified |
| `FR-WALKIN-04` | appointment + ticket | atomicity (failpoint) | specified |
| `FR-WALKIN-05` | `queue_number` | uniqueness integration | specified ⚠ |
| `FR-WALKIN-06` | guest registration | integration (blocked: `OQ-04`) | open ⚠ |
| `FR-WALKIN-07` | `checkin_method` | enum mapping unit | specified |
| `FR-WALKIN-08` | mode gate | AM-only negative | specified ⚠ |
| `FR-WALKIN-09` | cap interaction | cap boundary (per `OQ-15`) | open ⚠ |
| `FR-WALKIN-10` | → `F-09` | Master View visibility | specified |

### `F-08` Live Queue View — `features/F-08-queue-live-view.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-QUEUE-01` | `GET /queue/live/:doctor_staff_id` | integration | specified ⚠ |
| `FR-QUEUE-02` | distance-to-turn | counting unit (ties/overrides) | specified |
| `FR-QUEUE-03` | ETA | formula unit (blocked: `OQ-17`) | open  |
| `FR-QUEUE-04` | realtime channel | E2E two-session | open ⚠ |
| `FR-QUEUE-05` | response scoping | PII-inspection security test | specified |
| `FR-QUEUE-06` | doctor + day scoping | integration | specified |
| `FR-QUEUE-07` | override reflection | integration with `F-10` | specified ⚠ |

### `F-09` Master View & Call-Next — `features/F-09-master-view-call-next.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-MASTER-01` | `GET /queue/master-view` | grouping integration | specified |
| `FR-MASTER-02` | `POST /queue/call-next` | happy path | specified |
| `FR-MASTER-03` | status sync | transition-matrix unit (blocked: `OQ-11`) | open ⚠ |
| `FR-MASTER-04` | realtime | propagation integration | open ⚠ |
| `FR-MASTER-05` | capacity pause | integration (blocked: `OQ-05`) | open ⚠ |
| `FR-MASTER-06` | concurrency | parallel call-next test | open  |
| `FR-MASTER-07` | empty queue | no-op integration | specified |
| `FR-MASTER-08` | both routes | patient-refused negative | specified |
| `FR-MASTER-09` | audit hook | integration | specified |

### `F-10` Emergency Override — `features/F-10-emergency-override.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-OVR-01` | `POST /queue/emergency-override` | missing-reason negative | specified |
| `FR-OVR-02` | reorder | front-of-queue integration | specified ⚠ |
| `FR-OVR-03` | preview route (missing) | side-effect-free test | open ⚠ |
| `FR-OVR-04` | override fields | integration | specified |
| `FR-OVR-05` | → `F-15`, `F-13` | audit + signal integration | specified |
| `FR-OVR-06` | doctor/day scope | cross-queue negative | specified |
| `FR-OVR-07` | role guard | patient-refused negative | specified |

### `F-11` Time-Block Management — `features/F-11-timeblock-management.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-TB-01` | `POST /timeblocks` | integration | specified |
| `FR-TB-02` | overlap validation | boundary unit | specified |
| `FR-TB-03` | → `F-04` | availability integration | specified |
| `FR-TB-04` | free-text reason | unit | specified |
| `FR-TB-05` | `GET /timeblocks` | filter integration | specified |
| `FR-TB-06` | `DELETE /timeblocks/:id` | integration (per `OQ-07`) | open  |
| `FR-TB-07` | role guard | patient-refused negative | specified |

### `F-12` Flagging & Suspension — `features/F-12-flagging-and-suspension.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-MOD-01` | → `F-06` | `BR-02` breach integration | specified ⚠ |
| `FR-MOD-02` | `GET /accounts/flagged` | queue listing integration | specified |
| `FR-MOD-03` | `PATCH /accounts/:id/suspend` | integration | specified ⚠ |
| `FR-MOD-04` | `PATCH /accounts/:id/reinstate` | integration | specified ⚠ |
| `FR-MOD-05` | `admin_notes` | integration | specified |
| `FR-MOD-06` | all patient write routes | suspended-blocked sweep | specified ⚠ |
| `FR-MOD-07` | suspend | manual-flag integration | specified |
| `FR-MOD-08` | audit hook | integration | specified |
| `FR-MOD-09` | → `F-13` | override-signal query test | specified |

### `F-13` Analytics Dashboard — `features/F-13-analytics.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-AN-01` | `GET /analytics/dashboard` | formula unit (blocked: `OQ-17`) | open  |
| `FR-AN-02` | no-show rate | formula unit | open  |
| `FR-AN-03` | peak hours | bucketing unit | open  |
| `FR-AN-04` | date range | inclusive-boundary integration | specified |
| `FR-AN-05` | aggregate-only payload | PII-inspection security test | specified |
| `FR-AN-06` | cap utilisation | formula unit | specified ⚠ |
| `FR-AN-07` | override counts | formula unit | specified  |
| `FR-AN-08` | role guard | patient-refused negative | specified ⚠ |

### `F-14` Notifications — `features/F-14-notifications.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-NOTIF-01` | `POST /appointments` | one-send integration | specified |
| `FR-NOTIF-02` | cron job | next-day selection unit (mock clock) | specified ⚠ |
| `FR-NOTIF-03` | — | no-manual-trigger check | specified |
| `FR-NOTIF-04` | idempotency key | repeat-run integration | specified ⚠ |
| `FR-NOTIF-05` | delivery log | integration (blocked: `OQ-12`) | open ⚠ |
| `FR-NOTIF-06` | booking resilience | provider-failure test | specified |
| `FR-NOTIF-07` | stale reminders | cancelled/rescheduled negative | specified |
| `FR-NOTIF-08` | email content | template assertion | specified |

### `F-15` Audit Logging — `features/F-15-audit-logging.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-AUDIT-01` | all mutating routes | route sweep | specified |
| `FR-AUDIT-02` | silent write | sink-failure resilience test | specified |
| `FR-AUDIT-03` | action namespace | event-shaping unit (blocked: `OQ-08`) | open ⚠ |
| `FR-AUDIT-04` | actor type | unit (blocked: `OQ-08`) | open ⚠ |
| `FR-AUDIT-05` | `details` | no-secret inspection | specified |
| `FR-AUDIT-06` | `GET /audit-logs` | patient-refused negative | specified ⚠ |
| `FR-AUDIT-07` | filters | integration | specified ⚠ |
| `FR-AUDIT-08` | immutability | no-update/delete check | specified |

### `F-16` Follow-up Booking — `features/F-16-followup-booking.md`

| ID | API / artifact | Test | Status |
|---|---|---|---|
| `FR-FUP-01` | `POST /appointments/:id/follow-up` | role guard | specified |
| `FR-FUP-02` | parent linkage | integration | specified |
| `FR-FUP-03` | completed-parent rule | negative | specified |
| `FR-FUP-04` | cap interaction | arithmetic unit (per `OQ-15`) | open ⚠ |
| `FR-FUP-05` | chain traversal | depth 1/2 unit | specified |
| `FR-FUP-06` | → `F-14` | email enqueue | specified |
| `FR-FUP-07` | chain depth policy | per `OQ-15` | open ⚠ |

---

## 6. How to update this file

1. **Pick a feature** from the board (`§1`). Build only what it specifies.
2. **Resolve its blockers first**, or record explicitly that the feature is proceeding with the
   blocker's documented assumption.
3. When code is merged, set the feature row and each implemented `FR-*` row to `built`.
4. When its Test plan passes, set them to `tested` — and only then commit, with the message pattern
   shown in the Commit column.
5. Once merged to `develop`/`main`, mark `shipped`.
6. If a decision changes a requirement, follow the propagation checklist in `.clinerules` and update
   every affected row here.