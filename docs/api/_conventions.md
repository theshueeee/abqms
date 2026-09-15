---
id: API-CONV
title: API Conventions
status: active
parent: docs/SPEC.md
related: [index/roles-and-rbac.md, requirements/non-functional.md, features/F-03-staff-provisioning-rbac.md]
last_verified: 2026-09-15
---

# API Conventions

Shared contract for every endpoint. Domain files (`api/<domain>.md`) list routes and reference this
file rather than restating behaviour. Backend is **Express REST, prefix `/api`**.

## Shared rules

| Aspect | Rule | Status |
|---|---|---|
| Base path | `/api` prefix on every route | Fixed |
| Auth | Role resolved **server-side** at login; client never asserts its own role (`BR-07`) | Fixed |
| Authorization | Enforced on **every** route server-side, not hidden client-side (`NFR-RBAC-01`) | Fixed |
| Error body shape | Undecided — needs a single envelope (code, message, field errors) | `OQ-19` |
| Status codes | Undecided — needs a mapping (400/401/403/404/409/422) | `OQ-19` |
| Pagination | Undecided — unsafe defaults for list endpoints | `OQ-19` |
| Filtering | `GET /appointments` filters by date/doctor for staff only | Fixed |
| Rate limiting | Undecided, but required on login and OCR | `OQ-19` |
| Versioning | Undecided | `OQ-19` |
| Transport/date format | ISO 8601; timezone policy undecided | `OQ-14` |

## Read-only reference data

The booking UI cannot function without these lists, but **no endpoint is specified** for them —
`OQ-19`:

| Needed by | Suggested route | Content source |
|---|---|---|
| Slot/appointment picker | `GET /appointment-types` | `data-model/scheduling.md` |
| Doctor picker | `GET /doctors` | `OQ-02` decides the source |
| Cancellation flow | `GET /cancellation-reasons` | `data-model/moderation.md` |

## Response/route inventory

| Domain file | Routes |
|---|---|
| `api/auth.md` | `/auth/*`, patient profile/records |
| `api/appointments.md` | `/appointments/*` |
| `api/walkin-queue.md` | `/walkin/*`, `/queue/*` |
| `api/timeblocks.md` | `/timeblocks/*` |
| `api/accounts.md` | `/accounts/*` |
| `api/analytics.md` | `/analytics/*` |
| `api/audit.md` | `/audit-logs` |
| `api/_conventions.md` (this file) | system routes (`/health`) |

## System routes

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/health` | none | Liveness probe for `F-01` |