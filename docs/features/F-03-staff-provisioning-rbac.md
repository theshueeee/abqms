---
id: F-03
title: Staff Provisioning & RBAC Enforcement
spec_status: complete
delivery_status: open
blocked_by: []
parent: docs/SPEC.md
related: [api/auth.md, index/roles-and-rbac.md, api/_conventions.md]
rules: [BR-07, BR-08]
depends_on: [F-02]
last_verified: 2026-09-15
---

# F-03 — Staff Provisioning & RBAC Enforcement

## Purpose

Allow an admin to provision staff accounts and guarantee that every route is authorised server-side.

## In scope

`POST /auth/staff/create`, `provisioned_by` tracking, `is_active` lifecycle, a reusable server-side
RBAC guard applied to all routes.

## Out of scope

Patient signup (`F-02`), the business actions those staff perform (later features).

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-STAFF-01` | Only `admin` may create staff accounts | `POST /auth/staff/create` |
| `FR-STAFF-02` | The creator is recorded in `Staff.provisioned_by` | `POST /auth/staff/create` |
| `FR-STAFF-03` | `role` accepts only `dental_assistant` \| `admin` — **no doctor role** (`BR-08`) | `POST /auth/staff/create` |
| `FR-STAFF-04` | Duplicate staff email is rejected | `POST /auth/staff/create` |
| `FR-STAFF-05` | An `is_active = false` staff member fails authentication with correct credentials | `POST /auth/login` |
| `FR-STAFF-06` | Every route is guarded server-side; unauthenticated and wrong-role calls are refused with no data leakage | all |
| `FR-STAFF-07` | The guard is applied centrally so a new route cannot silently ship unguarded | all |
| `FR-STAFF-08` | Staff creation is audited (`F-15`) | `POST /auth/staff/create` |

## Acceptance criteria

1. **Given** a `dental_assistant` session, **when** `POST /auth/staff/create` is called, **then** the
   response is `403` and no staff row is created.
2. **Given** an `admin` session, **when** a valid staff payload is posted, **then** the row exists with
   `provisioned_by` set to the admin's `staff_id`.
3. **Given** an `admin` session, **when** `role: "doctor"` is posted, **then** the request is rejected
   by validation.
4. **Given** a deactivated staff account, **when** it attempts login, **then** authentication fails even
   with the correct password.
5. **Given** any protected route, **when** called with no session, **then** the response is `401` with
   no resource data.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Integration | admin creates staff; assistant is refused | `staff-admin`, `staff-assistant` |
| Integration | invalid role rejected | `staff-admin` |
| Integration | deactivated account cannot authenticate | `staff-inactive` |
| Guard sweep | every registered route is covered by the guard (list routes from the router, assert protected) | `staff-assistant` |
| Negative | no-session call on each protected route returns 401 | none |

## Open questions

`OQ-02` — does not block staff provisioning itself, but decides how the "doctor resource" that
bookings reference is modelled, which later features depend on.

## Commit scope

`feat(F-03): staff provisioning and server-side RBAC guard`