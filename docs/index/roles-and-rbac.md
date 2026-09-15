---
id: IDX-RBAC
title: Roles and RBAC
status: active
parent: docs/SPEC.md
related: [index/business-rules.md, api/_conventions.md, features/F-03-staff-provisioning-rbac.md]
last_verified: 2026-09-15
---

# Roles and RBAC

Authoritative role/capability matrix. Authorization facts live here; endpoints in `api/*` reference
this file instead of restating permissions. Enforcement is `BR-07` / `NFR-RBAC-01`.

## Actors

| Actor | Type | Can log in? | Key capabilities |
|---|---|---|---|
| **Patient** | Human, web portal (mobile-friendly, no install) | Yes | Sign up/login, book / reschedule / cancel appointments, walk-in registration, view live queue position (distance-to-turn), view own records |
| **Dental Assistant** | Human, staff role `dental_assistant` | Yes | Manage queue (call next, emergency override), register walk-ins, manage doctor calendar/time-blocks, review/suspend flagged accounts, view analytics |
| **Admin** | Human, staff role `admin` | Yes | Everything a Dental Assistant can do, plus provision staff accounts (`provisioned_by` self-reference) |
| **OCR** | Internal system actor | No | Auto-extracts patient data from ID during walk-in registration |
| **Email (Resend)** | External system actor | No | Delivers booking confirmations and reminders |

**Doctors are not actors in this system** — they have no login and no role (`BR-08`). How the
"doctor resource" that bookings are assigned to is modelled is undecided — `OQ-02`.

## Endpoint × role matrix

| Capability | Patient | Dental Assistant | Admin | Endpoints |
|---|---|---|---|---|
| Sign up / login / forgot / reset password | ✅ own | ✅ own | ✅ own | `api/auth.md` |
| Create staff account | ❌ | ❌ | ✅ | `POST /auth/staff/create` |
| Read appointment types / doctors / cancel reasons | ✅ | ✅ | ✅ | `api/_conventions.md` (read-only reference data) |
| Book appointment | ✅ own | ✅ | ✅ | `POST /appointments` |
| List appointments | own only | filterable by date/doctor | filterable by date/doctor | `GET /appointments` |
| Check in | own only (`OQ-21`) | ✅ | ✅ | `POST /appointments/:id/checkin` |
| Reschedule / cancel | ✅ own | ✅ | ✅ | `api/appointments.md` |
| Walk-in OCR + register | ✅ | ✅ | ✅ | `api/walkin-queue.md` |
| Live queue position | ✅ own ticket | ✅ | ✅ | `GET /queue/live/:doctor_staff_id` |
| Master View | ❌ | ✅ | ✅ | `GET /queue/master-view` |
| Call next | ❌ | ✅ | ✅ | `POST /queue/call-next` |
| Emergency override | ❌ | ✅ | ✅ | `POST /queue/emergency-override` |
| Time-block management | read-only | ✅ | ✅ | `api/timeblocks.md` |
| Flagged accounts / suspend / reinstate | ❌ | ✅ | ✅ | `api/accounts.md` |
| Analytics dashboard | ❌ | ✅ (`OQ-21`) | ✅ | `GET /analytics/dashboard` |
| Audit logs | ❌ | ✅ | ✅ | `GET /audit-logs` |

## Enforcement notes

- Role is resolved **server-side** at login; the client never asserts its own role.
- Staff accounts are deactivatable via `Staff.is_active`; an inactive staff member must fail
  authentication even with correct credentials (`F-03`).
- Read-only reference data (appointment types, doctors, cancellation reasons) must be readable by
  patients or the booking UI cannot function — see `OQ-19`.