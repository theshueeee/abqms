---
id: F-02
title: Patient Auth & Account Recovery
spec_status: blocked
delivery_status: open
blocked_by: [OQ-01, OQ-12, OQ-22]
parent: docs/SPEC.md
related: [api/auth.md, data-model/patient-staff.md, features/F-03-staff-provisioning-rbac.md]
rules: [BR-07]
last_verified: 2026-09-15
---

# F-02 — Patient Auth & Account Recovery

## Purpose

Let a patient create an account, log in, recover a forgotten password, and view their own records.

## In scope

Patient signup, login (patient and staff, role resolved server-side), forgot/reset password, patient
records view.

## Out of scope

Staff account creation (`F-03`), session UI, email template design (`F-14`).

## Blockers

- `OQ-01` — no unique IC / Matric No. column exists, yet login is specified as **IC or Matric No. +
  password**. Login cannot be built as written until the identifier model is decided.
- `OQ-12` — no password-reset token table exists.
- `OQ-22` — session vs JWT, password hashing algorithm, password policy.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-AUTH-01` | Signup validates and persists a `Patient`; duplicate email rejected | `POST /auth/signup` |
| `FR-AUTH-02` | Login accepts IC or Matric No. + password (blocked — `OQ-01`) | `POST /auth/login` |
| `FR-AUTH-03` | Login resolves role server-side; client never asserts a role | `POST /auth/login` |
| `FR-AUTH-04` | Passwords stored only as hashes (`OQ-22` decides algorithm) | all |
| `FR-AUTH-05` | Forgot-password issues a single-use expiring token and never reveals whether an account exists | `POST /auth/forgot-password` |
| `FR-AUTH-06` | Reset-password consumes the token and re-hashes the password | `POST /auth/reset-password` |
| `FR-AUTH-07` | Repeated failed logins are rate-limited | `POST /auth/login` |
| `FR-AUTH-08` | Patient reads their own records (bookings, tickets, reschedules) — route unspecified (`OQ-19`) | `GET /patients/me/*` |
| `FR-AUTH-09` | Suspended accounts cannot log in or act | all |

## Acceptance criteria

1. **Given** no account, **when** signup is posted with valid data, **then** a `Patient` row exists and
   the password is stored as a hash, never plaintext.
2. **Given** an existing account, **when** login is posted with the correct credential, **then** a
   session/ token is returned together with the server-resolved role.
3. **Given** wrong credentials, **when** login is posted, **then** the response is a generic
   authentication failure and the account is not disclosed.
4. **Given** a valid reset token, **when** reset-password is posted, **then** the old password stops
   working and the new one works, and the token cannot be reused.
5. **Given** a suspended patient, **when** they log in, **then** access is refused.

## Test plan

| Level | What | Fixture |
|---|---|---|
| Unit | password hashing round-trip; token expiry boundaries | none |
| Integration | signup → login → reset → login cycle | `patient-auth-user` |
| Integration | rate limit trips after N failures | `patient-auth-ratelimit` |
| Negative | duplicate email; expired token; reused token; suspended login | `patient-suspended` |

## Open questions

`OQ-01` (login identifier) · `OQ-12` (reset token storage) · `OQ-19` (records route, error contract) ·
`OQ-22` (hashing/session/policy).

## Commit scope

`feat(F-02): patient signup, login, password reset`