---
id: REQ-NFR
title: Non-Functional Requirements
status: active
parent: docs/SPEC.md
related: [index/business-rules.md, index/roles-and-rbac.md, requirements/open-questions.md]
last_verified: 2026-09-15
---

# Non-Functional Requirements

Binding constraints. Features **reference** these by ID rather than restating them.

## Binding today

| ID | Requirement | Notes |
|---|---|---|
| `NFR-RT-01` | The live queue and Master View reflect state changes in real time. Poll or push is the implementer's choice, but it must **feel live**. | Transport undecided — `OQ-18`; implemented by `F-08`, `F-09` |
| `NFR-AUTO-01` | Notifications (confirmation, reminders) fire **automatically** — no manual staff trigger exists. | Implemented by `F-14` |
| `NFR-AUD-01` | Audit logging is silent and background: it must not block a request or surface in the UI. | Implemented by `F-15`; see `BR-06` |
| `NFR-RBAC-01` | RBAC is enforced **server-side on every route**, not just hidden client-side. | Implemented by `F-03`; see `BR-07` |
| `NFR-UX-01` | "Call next patient" is a single action/click end-to-end. | Implemented by `F-09` |
| `NFR-UX-02` | Browser-based, mobile-friendly, **no app install**. | Patient portal and staff dashboard alike |

## Undefined — must be specified before they can be tested (`OQ-22`)

The original spec gives no numbers for any of the following, which means no feature can currently be
verified against them. Each needs a target and a measurement method.

| Area | Missing | Suggested ID |
|---|---|---|
| Latency | p95 target for read and write endpoints | `NFR-PERF-01` |
| Realtime budget | maximum acceptable delay between a state change and its appearance on another client (needed to make `NFR-RT-01` testable) | `NFR-RT-02` |
| Capacity | expected concurrent users at the AM peak, and the doctor/queue volume | `NFR-PERF-02` |
| Availability | acceptable downtime during clinic hours | `NFR-PERF-03` |
| Security | password policy, hashing algorithm, session vs JWT, TLS, secret management, rate limits | `NFR-SEC-01`, `NFR-SEC-02`, `NFR-SEC-03`, `NFR-SEC-04` |
| Privacy | PDPA (Malaysia) handling of scanned ID images and patient data; retention windows | `NFR-SEC-05` |
| Testability | definition of "tested" per feature (unit/integration/E2E expectations) | `NFR-TEST-01` |
| Accessibility | target level (e.g. WCAG 2.1 AA), browser support matrix | `NFR-UX-03` |
| Operations | backup/restore, log retention, observability | `NFR-OPS-01` |
| Localisation | English-only vs bilingual, timezone policy | `OQ-14` |

## Constraints that are not negotiable

- No app install; the patient surface is a responsive web page.
- Doctors never authenticate (`BR-08`).
- Audit writes are never allowed to block a user action (`NFR-AUD-01`).
- Every route is authorised server-side (`NFR-RBAC-01`).