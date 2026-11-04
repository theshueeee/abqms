---
id: F-02
title: Patient Auth & Account Recovery
spec_status: specified
delivery_status: built
blocked_by: []
parent: docs/SPEC.md
related: [api/auth.md, data-model/patient-staff.md, features/F-03-staff-provisioning-rbac.md]
rules: [BR-07]
last_verified: 2026-11-04
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

Authentication decisions were recorded on 2026-10-29: email login, database-backed sessions,
Argon2id with a 12-character minimum, and hashed single-use reset tokens.

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
| Unit | password hashing round-trip; opaque token hashing and uniqueness | `apps/api/test/auth.security.test.ts` |
| Integration | signup → login → reset → login cycle | `patient-auth-user` |
| Integration | rate limit trips after N failures | `patient-auth-ratelimit` |
| Negative | duplicate email; expired token; reused token; suspended login | `patient-suspended` |

## Open questions

`OQ-19` (records route, error contract).

## Checkpoint notes (2026-11-04)

Argon2id password hashing and opaque token generation now have passing unit coverage. Sessions use
production-aware secure cookies, failed-login throttling is database-backed, and reset-token
delivery is isolated behind an adapter. Integration coverage for the full database-backed auth
flows remains follow-up work before this feature can move from `built` to `tested`.

## Commit scope

`feat(F-02): patient signup, login, password reset`