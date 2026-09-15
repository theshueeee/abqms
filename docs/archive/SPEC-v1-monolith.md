> **ARCHIVED — SUPERSEDED.** This is the original monolithic spec (v1), preserved verbatim for
> reference only. It has been granularized into `docs/SPEC.md` (router) plus `docs/index/`,
> `docs/data-model/`, `docs/api/`, `docs/features/`, `docs/workflows/` and `docs/requirements/`.
> **Do not treat anything below as the current spec** — in particular, this file is where the
> un-resolved contradictions described in `requirements/open-questions.md` originate.
> Archived 2026-09-15.
# docs/SPEC.md

## 1. System Overview

**DentaQueue** is a full-stack web application for the General/Outpatient Dental Clinic, Faculty of Dentistry, Universiti Malaya. It unifies two currently-disconnected processes — online appointment booking and physical walk-in queuing — into a single browser-based (no app install) platform.

**Core operating logic — Dual Mode:**
- **Morning (AM):** Live Queue Management System (QMS) for first-come-first-served walk-ins.
- **Afternoon (PM):** Standard booking calendar for pre-scheduled appointments only.
- Hard cap: **15 patients/doctor/day**.

**Key differentiators vs. existing tools** (Calendly/MS Bookings = slot-only, no queue; legacy hospital systems = staff-only, no patient visibility): DentaQueue provides real-time, patient-facing queue transparency + staff-side operational control in one system.

**Non-goals / Exclusions:** billing/payments, EHR/clinical notes, SMS, HIS integration, postgraduate/specialist clinics, direct doctor login (doctors do not use the system — Dental Assistants act on their behalf).

---

## 2. User Roles

| Role | Access | Key Capabilities |
|---|---|---|
| **Patient** | Web portal (mobile-friendly, no install) | Sign up/login, book/reschedule/cancel appointments, walk-in registration, view live queue position ("distance-to-turn"), view records |
| **Dental Assistant (Staff)** | Admin dashboard | Manage queue (call next, emergency override), register walk-ins, manage doctor calendar/time-blocks, review/suspend flagged accounts, view analytics |
| **OCR (system actor)** | Internal | Auto-extracts patient data from ID during walk-in registration |
| **Email (external actor)** | Internal | Delivers booking confirmations & reminders via Resend |

Doctors are **not** direct system users — all scheduling actions are performed by Dental Assistants.

---

## 3. Core Workflows

### 3.1 Patient Journey
1. **Auth:** Sign up / Log in (IC or Matric No. + password) → Forgot password flow if needed.
2. **Branch:** Book Appointment (PM) vs. Walk-in (AM).
   - **Book Appointment:** Select slot → on arrival, check-in must occur within 15 minutes of slot time.
     - Late/no check-in → prompt to reschedule.
       - Reschedule allowed only if `reschedule_count < 5 within rolling 30 days` → else **account flagged**.
       - Decline reschedule → appointment cancelled.
   - **Walk-in:** OCR registration (auto ID scan) or Manual registration fallback → issued live virtual queue ticket.
3. **Queue tracking:** Patient views live position, distance-to-turn, estimated wait → sees doctor → session ends.

### 3.2 Dental Assistant Journey
1. **Intake:** Check for existing appointment → check-in scheduled patients directly, or OCR/manual walk-in registration → issue virtual queue ticket → patient appears in Master View dashboard.
2. **Queue Management sub-process:**
   - Check room capacity (pause if full).
   - Check for emergency-flagged patients → jump them to front of queue.
   - "Call next patient" (single button) → update statuses: previous → `Completed`, new → `Ongoing` → sync Master View / DB.
3. **Post-consultation:** Book follow-up if needed, else end.
4. **Parallel admin streams (always available):**
   - Time-Block Management (lock calendar for leave/academic duties).
   - Compliance review: flag → review (suspicious cancellations / excessive reschedules / emergency-override abuse) → suspend or clear account.
   - Analytics Dashboard (traffic, no-show rate, peak hours).

### 3.3 Emergency Override
Staff-triggered. Immediately moves a selected patient to the front of the queue with a mandatory reason (quick-select: Medical Emergency / Doctor Referral / Admin Priority, or free text). System previews queue impact (who gets bumped, by how many minutes) before confirmation. Logged for abuse-monitoring.

---

## 4. Database Schema (Prisma-oriented ERD)

### `Patient`
| Field | Type | Notes |
|---|---|---|
| patient_id | UUID (PK) | |
| full_name | String | |
| email | String (unique) | |
| phone_number | String | |
| password_hash | String | |
| date_of_birth | DateTime | |
| reschedule_credits | Int | decremented per reschedule, resets on rolling 30-day window |
| account_status | Enum(`active`,`suspended`,`flagged`) | |
| suspension_reason | String? | |
| last_known_id_type | String? | for OCR-reused ID (MyKad/Passport) |
| last_known_id_number | String? | |
| created_at / updated_at | DateTime | |

### `Staff`
| Field | Type | Notes |
|---|---|---|
| staff_id | UUID (PK) | |
| full_name | String | |
| email | String (unique) | |
| password_hash | String | |
| phone_number | String | |
| role | Enum(`dental_assistant`,`admin`) | doctors are NOT a role here |
| is_active | Boolean | |
| provisioned_by | FK → Staff.staff_id (self-ref, nullable) | tracks who created the account |
| created_at / updated_at | DateTime | |

### `AppointmentType`
| Field | Type | Notes |
|---|---|---|
| appointment_type_id | UUID (PK) | |
| appointment_type | String | e.g. "General Checkup", "Scaling" |
| default_duration_minutes | Int | |
| is_active | Boolean | |

### `Appointment`
| Field | Type | Notes |
|---|---|---|
| appointment_id | UUID (PK) | |
| patient_id | FK → Patient | |
| appointment_type_id | FK → AppointmentType | |
| doctor_staff_id | FK → Staff | the assigned "doctor" record (managed as staff-linked resource, not a login role) |
| scheduled_datetime | DateTime | |
| booking_channel | Enum(`online`,`walk_in`) | |
| status | Enum(`pending`,`confirmed`,`checked_in`,`completed`,`cancelled`,`no_show`) | |
| is_follow_up | Boolean | |
| parent_appointment_id | FK → Appointment (self-ref, nullable) | for follow-up chains |
| reschedule_count | Int | |
| cancellation_reason_id | FK → CancellationReason (nullable) | |
| cancelled_by_patient_id / cancelled_by_staff_id | FK (nullable) | |
| walkin_full_name / walkin_phone / walkin_id_type / walkin_id_number | String? | for unregistered walk-ins |
| created_at / updated_at | DateTime | |

### `QueueTicket`
| Field | Type | Notes |
|---|---|---|
| ticket_id | UUID (PK) | |
| appointment_id | FK → Appointment (1:1) | |
| patient_id | FK → Patient | |
| doctor_staff_id | FK → Staff | |
| queue_date | Date | |
| queue_number | String | e.g. "B-014" |
| queue_status | Enum(`waiting`,`called`,`in_progress`,`completed`,`no_show`) | |
| is_emergency_override | Boolean | |
| override_reason | String? | |
| override_by_staff_id | FK → Staff (nullable) | |
| original_position / current_position | Int | |
| checkin_method | Enum(`ocr`,`manual`,`qr`) | |
| ocr_id_type / ocr_id_number | String? | |
| is_checkin_verified | Boolean | |
| called_at / arrived_at / completed_at | DateTime? | |
| created_at / updated_at | DateTime | |

### `RescheduleLog`
| Field | Type | Notes |
|---|---|---|
| reschedule_id | UUID (PK) | |
| appointment_id | FK → Appointment | |
| patient_id | FK → Patient | |
| old_scheduled_datetime / new_scheduled_datetime | DateTime | |
| reason | String | |
| rescheduled_at | DateTime | |

### `SuspensionRecord`
| Field | Type | Notes |
|---|---|---|
| suspension_id | UUID (PK) | |
| patient_id | FK → Patient | |
| flagging_reason | String | |
| triggered_by | Enum(`system`,`staff`) | |
| flagged_at | DateTime | |
| reviewed_by_staff_id | FK → Staff (nullable) | |
| reviewed_at | DateTime? | |
| outcome | Enum(`pending`,`suspended`,`reinstated`) | |
| admin_notes | String? | |

### `CancellationReason`
| Field | Type |
|---|---|
| reason_id | UUID (PK) |
| reason_text | String |
| is_active | Boolean |

### `TimeBlock`
| Field | Type | Notes |
|---|---|---|
| block_id | UUID (PK) | |
| doctor_staff_id | FK → Staff | |
| blocked_by_staff_id | FK → Staff | |
| start_datetime / end_datetime | DateTime | |
| block_reason | String | e.g. "Annual Leave", "Academic Duty" |
| notes | String? | |
| created_at | DateTime | |

### `AuditLog`
| Field | Type | Notes |
|---|---|---|
| log_id | UUID (PK) | |
| user_id | String | patient or staff ID |
| action | Enum(`POST`,`PATCH`,`DELETE`,`GET`) | HTTP-verb-style |
| resource | String | e.g. `/bookings`, `/auth` |
| details | JSON? | |
| created_at | DateTime | |

**Relationship summary:**
- Patient 1—N Appointment, QueueTicket, RescheduleLog, SuspensionRecord
- Staff 1—N Appointment (as doctor), QueueTicket (as override actor), TimeBlock
- Staff 1—N Staff (self-ref, `provisioned_by`)
- Appointment 1—1 QueueTicket
- Appointment N—1 AppointmentType
- Appointment 1—N RescheduleLog
- Appointment self-ref via `parent_appointment_id` (follow-ups)

---

## 5. API Endpoints (Express REST, prefix `/api`)

### Auth
- `POST /auth/signup` (patient)
- `POST /auth/login` (patient | staff — role resolved server-side)
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/staff/create` (staff-only, RBAC: admin)

### Appointments
- `GET /appointments` (patient: own; staff: filterable by date/doctor)
- `POST /appointments` (create/book)
- `PATCH /appointments/:id/reschedule` (enforces `<5 reschedules/30 days`)
- `PATCH /appointments/:id/cancel` (requires `cancellation_reason_id`)
- `POST /appointments/:id/checkin` (validates 15-min window)
- `POST /appointments/:id/follow-up` (staff-only)

### Walk-in / Queue
- `POST /walkin/ocr` (submit ID image → returns parsed fields)
- `POST /walkin/register` (manual or OCR-confirmed → creates QueueTicket)
- `GET /queue/live/:doctor_staff_id` (patient-facing live position)
- `GET /queue/master-view` (staff dashboard: waiting/in-progress/completed)
- `POST /queue/call-next` (staff, single-button next-patient trigger)
- `POST /queue/emergency-override` (staff; body: patient_id, reason)

### Calendar / Time-Blocks
- `GET /timeblocks?doctor_staff_id=`
- `POST /timeblocks`
- `DELETE /timeblocks/:id`

### Accounts / Moderation
- `GET /accounts/flagged` (staff)
- `PATCH /accounts/:id/suspend`
- `PATCH /accounts/:id/reinstate`

### Analytics
- `GET /analytics/dashboard` (no-show rate, peak hours, traffic volume)

### Notifications (internal, triggered — not directly user-called)
- Booking confirmation email (Resend) on `POST /appointments` success
- Reminder email, cron-triggered daily at 8AM for next-day appointments

### System
- `GET /audit-logs` (staff/admin only)

---

## 6. Non-Functional Requirements (binding constraints)
- Live queue and Master View must reflect state changes in real time (poll or push — implementer's choice, but must feel "live").
- Notifications (confirmation, reminders) must fire automatically, no manual staff trigger.
- Audit logging is silent/background — must not block or surface in the UI.
- RBAC enforced server-side on every route, not just hidden client-side.
- "Call next patient" must be a single action/click end-to-end.