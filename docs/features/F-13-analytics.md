---
id: F-13
title: Analytics Dashboard
spec_status: blocked
delivery_status: open
blocked_by: [OQ-17, OQ-21, OQ-22]
parent: docs/SPEC.md
related: [api/analytics.md, requirements/non-functional.md, features/F-12-flagging-and-suspension.md]
rules: [BR-01, BR-05]
depends_on: [F-04, F-05, F-07, F-09, F-10]
last_verified: 2026-09-15
---

# F-13 — Analytics Dashboard

## Purpose

Give the clinic operational insight: traffic volume, no-show rate and peak hours.

## In scope

Aggregation endpoints and the dashboard view over bookings, tickets and overrides.

## Out of scope

Real-time queue surfaces (`F-08`, `F-09`), compliance decisions (`F-12`).

## Blockers

- `OQ-17` — **no metric is defined**. "Traffic", "no-show rate" and "peak hours" each need a formula
  and a denominator (does traffic include walk-ins? is the no-show denominator booked or arrived?).
  Without this, any implementation is unverifiable.
- `OQ-21` — whether `dental_assistant` may view analytics or only `admin`.
- `OQ-22` — no caching or performance target, so an unbounded query can violate `NFR-PERF-01`.

## Requirements

| ID | Requirement | API |
|---|---|---|
| `FR-AN-01` | Traffic volume over a date range, with the denominator defined by `OQ-17` | `GET /analytics/dashboard` |
| `FR-AN-02` | No-show rate, derived from appointment and/or ticket no-show states | same |
| `FR-AN-03` | Peak hours as an hour-of-day distribution over the range | same |
| `FR-AN-04` | A date-range parameter with a documented default window | same |
| `FR-AN-05` | Aggregate results only — no patient-identifying fields | same |
| `FR-AN-06` | Daily-cap utilisation per doctor (`BR-01`) is visible, so the cap can be operated | same |
| `FR-AN-07` | Emergency-override counts per actor are visible as an abuse signal (`BR-05`) | same |
| `FR-AN-08` | Only staff may read analytics (`BR-07`) | same |

## Acceptance criteria

1. **Given** a seeded dataset with a known number of bookings and no-shows, **when** the dashboard is
   requested, **then** the no-show rate equals the documented formula's value exactly.
2. **Given** a date range with no activity, **when** the dashboard is requested, **then** the response is
   a valid zeroed payload, not an error.
3. **Given** walk-ins and bookings on the same day, **when** traffic is reported, **then** the treatment of
   walk-ins matches the `OQ-17` definition.
4. **Given** a patient session, **when** analytics is requested, **then** the response is `403`.
5. **Given** any response, **when** inspected, **then** no patient name, IC or contact detail appears.

## Test plan

| Level | What | Fixtures |
|---|---|---|
| Unit | each formula against a hand-computed expected value (the core test of this feature) | `analytics-seed` |
| Unit | hour-of-day bucketing across a day boundary and across the timezone rule (`OQ-14`) | `analytics-seed` |
| Integration | date-range filtering inclusivity at both ends | `analytics-seed` |
| Security | aggregate-only payload; staff-only access | `patient-booker` |

## Open questions

`OQ-17` (blocks all metrics) · `OQ-21` · `OQ-22`.

## Commit scope

`feat(F-13): analytics dashboard with traffic, no-show rate and peak hours`