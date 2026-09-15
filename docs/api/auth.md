---
id: API-AUTH
title: API — Auth
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/roles-and-rbac.md, features/F-02-patient-auth.md, features/F-03-staff-provisioning-rbac.md]
last_verified: 2026-09-15
---

# API — Auth

Owns: patient authentication, password recovery, staff provisioning, and the patient's own records.

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `POST` | `/auth/signup` | public (patient) | Create a patient account | `F-02` |
| `POST` | `/auth/login` | public (patient \| staff) | Authenticate; **role resolved server-side** | `F-02`, `F-03` |
| `POST` | `/auth/forgot-password` | public | Start password reset | `F-02` |
| `POST` | `/auth/reset-password` | public (token) | Complete password reset | `F-02` |
| `POST` | `/auth/staff/create` | **admin only** (`BR-07`) | Provision a staff account | `F-03` |

## Requirements

- `FR-AUTH-01` Signup accepts an identity + password and persists `Patient` (`data-model/patient-staff.md`).
- `FR-AUTH-02` Login accepts **IC or Matric No.** + password — but no unique login-identifier column
  exists today, so this is blocked on `OQ-01`.
- `FR-AUTH-03` Login for staff must reject `is_active = false` accounts.
- `FR-AUTH-04` Forgot-password issues a single-use, expiring reset token (no token table exists — `OQ-12`).
- `FR-AUTH-05` Reset-password consumes the token and re-hashes the password.
- `FR-AUTH-06` Session/refresh strategy is undecided — `OQ-22`.
- `FR-AUTH-07` Rate limiting on login attempts — `OQ-19`.
- `FR-AUTH-08` Patient can read their own records ("view records" capability,
  `index/roles-and-rbac.md`); no route is specified yet — `OQ-19`.

## Notes

- `POST /auth/staff/create` records the creator in `Staff.provisioned_by` (self-reference).
- Role enum is `dental_assistant` | `admin`; there is no doctor account (`BR-08`, `OQ-02`).
- Audit events: token issuance, password reset, staff creation (`F-15`).