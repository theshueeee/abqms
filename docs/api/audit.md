---
id: API-AUDIT
title: API — Audit Logs
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, data-model/audit-notification.md, index/business-rules.md, features/F-15-audit-logging.md]
last_verified: 2026-09-15
---

# API — Audit Logs

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/audit-logs` | **staff / admin only** | Read the audit trail | `F-15` |

## Requirements

- `FR-AUDIT-01` Every mutating request writes exactly one `AuditLog` row capturing actor, action,
  resource and timestamp.
- `FR-AUDIT-02` Writing is **silent and non-blocking** — a logging failure must not fail the request
  and must not surface in the UI (`BR-06`, `NFR-AUD-01`).
- `FR-AUDIT-03` `user_id` must be resolvable to an actor type (patient vs staff) — the column alone
  cannot do this (`OQ-08`).
- `FR-AUDIT-04` `GET /audit-logs` is readable by staff/admin only (`BR-07`).
- `FR-AUDIT-05` Supports filtering (by actor, action, resource, date range) — filter set is undecided
  (`OQ-08`).

## Gaps

- `AuditLog.action` is `Enum(POST, PATCH, DELETE, GET)`, so non-HTTP events — `LOGIN`,
  `PASSWORD_RESET`, the 08:00 reminder cron, automatic `BR-02` flagging, emergency override — have no
  faithful representation (`OQ-08`).
- Audit entries are read-only by policy: no route updates or deletes them.
- Retention period is undefined (`OQ-22`).