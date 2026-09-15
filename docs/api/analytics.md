---
id: API-ANALYTICS
title: API — Analytics
status: active
parent: docs/SPEC.md
related: [api/_conventions.md, index/roles-and-rbac.md, features/F-13-analytics.md]
last_verified: 2026-09-15
---

# API — Analytics

| Method | Path | Access | Purpose | Feature |
|---|---|---|---|---|
| `GET` | `/analytics/dashboard` | staff (`dental_assistant` / `admin`) | Traffic volume, no-show rate, peak hours | `F-13` |

## Requirements

- `FR-AN-01` Reports **traffic volume** over a date range.
- `FR-AN-02` Reports **no-show rate**, derived from `Appointment.status = no_show` and/or
  `QueueTicket.queue_status = no_show`.
- `FR-AN-03` Reports **peak hours** as an hour-of-day histogram.
- `FR-AN-04` Supports a date-range parameter, defaulting to a sensible window (undecided — `OQ-17`).
- `FR-AN-05` Aggregates only; no patient-identifying fields in the response.

## Gaps

- No metric definitions exist. "Traffic", "no-show rate" and "peak hours" need explicit formulas and
  a denominator (booked × attended? including walk-ins?) — `OQ-17`.
- Whether `dental_assistant` or only `admin` may view analytics is unstated — `OQ-21`.
- No requirement for caching, so an unbounded query could violate `NFR-PERF-01` — `OQ-22`.