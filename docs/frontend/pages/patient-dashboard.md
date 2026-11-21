---
id: FRONTEND-PATIENT-DASHBOARD
title: Patient Dashboard
status: implemented
parent: docs/frontend/_overview.md
---

# Patient Dashboard

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Prototype node: [6-51](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-51&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)
- Verified prototype step: `14 / 22`
- Frame orientation: responsive patient application shell; exact editor dimensions remain to be measured
- Prototype connections: `View Live Queue` opens the queue tracker; sidebar `Book` opens booking; `Queue` opens queue history/status; `Records` opens records
- Booking entry: the verified `Book` navigation target maps to `/patient/book` in `F-04`.
- Verified frame asset: `docs/frontend/patient-dashboard-prototype.png` (captured 2026-11-22).

## Application mapping

- Route: `/patient/dashboard`
- Role: authenticated patient
- Owning feature: patient account entry plus queue and booking summaries
- Entry conditions: valid patient session
- Exit actions: navigation to booking, reschedule, cancellation, queue, records, live queue, notifications, or account controls

## Layout and components

- Desktop shell has a left navigation rail with `UM Dentistry`, active `Home`, `Book`, `Queue`, and `Records`.
- Main content begins with `Good morning, Faradiena`, notification indicator, and patient avatar.
- Active queue card shows `General Outpatient Clinic`, `Waiting` status, queue number `B-014`, `3 patients ahead of you`, approximately `25 mins wait`, a waiting message, and `View Live Queue`.
- `Quick Actions` is a four-tile grid — `Book Appt`, `Reschedule`, `Cancel Visit`, `My Records` — each tile showing an icon inside a rounded square above its label. `Reschedule` maps to `/patient/reschedule` and `Cancel Visit` to `/patient/cancel` (`F-06`).
- `Upcoming Appointments` follows quick actions, with a `View All` link. Each card shows a month/day badge, the service name, a status chip (`Confirmed` green, `Pending` grey), the weekday and start time in `Asia/Kuala_Lumpur`, and the assigned doctor.
- `Policy Limits` is a right-hand panel beside the upcoming list, titled `Policy Limits`, holding a `Reschedule allowance` card: the copy `You have used N of M reschedules in the last 30 days.`, a usage bar, and the remaining count beside the label `remaining`.
- The `View All` link still needs the records route tracked by `OQ-19`; it is rendered but not yet wired.
- Mobile behavior collapses the desktop navigation into a compact navigation pattern while keeping greeting, active queue, and quick actions in a single column. The Policy Limits panel stacks below the upcoming list.
- Shared components: `PatientShell`, `SidebarNav`, `PageHeader`, `QueueSummaryCard`, `StatusBadge`, `QuickActionCard`, `NotificationButton`, `Avatar`, `PolicyLimitsPanel`.

## States and behavior

- Default: authenticated patient with an active queue ticket.
- Loading: shell and queue summary use skeletons while session and queue data load.
- Empty: show an explicit no-active-queue state with a booking/check-in action.
- Error: preserve the shell and show a retryable queue-summary error.
- Success: queue summary links to live queue details.
- Upcoming appointments: future `pending`, `confirmed`, and `checked_in` bookings are listed in
  ascending start order; `completed`, `cancelled`, `no_show`, and past bookings are excluded.
- Upcoming loading: show a status message while the patient's appointments load.
- Upcoming empty: show `No upcoming appointments.` with a booking action.
- Upcoming error: keep the shell and offer a `Try again` retry that refetches the list.
- Policy limits loading: show `Loading policy limits...` while the allowance loads.
- Policy limits error: show the failure message inside the panel without breaking the rest of the page.
- Policy limits exhausted: when `remaining` is `0`, the usage bar renders full and the label reads
  `No reschedules remaining` instead of `remaining`.
- Permission/unauthenticated: redirect missing or expired sessions to `/login`.
- Offline or stale data: label queue data as stale and offer refresh; do not present stale ETA as current without an indicator.

## Integration

- API endpoint(s): `GET /api/appointments` for the patient's own appointment list (F-04, `FR-BOOK-07`);
  `GET /api/appointments/policy-limits` for the `BR-02` allowance (F-06, `FR-RESCH-09`);
  patient session/me endpoint, active queue summary endpoint, and navigation targets documented by the
  owning F-04/F-08 contracts.
- Request/response data: patient display name/avatar, active queue number/status, patients ahead, ETA,
  clinic name, upcoming appointment service/status/start/doctor, and the reschedule allowance
  (`limit`, `window_days`, `used`, `remaining`).
- Upcoming filtering is client-side: the API returns the patient's own rows sorted ascending, and the
  dashboard keeps future `pending`/`confirmed`/`checked_in` rows.
- Session requirements: authenticated HTTP-only session cookie.
- Server-side authorization: patient ownership and queue visibility are enforced by the API, not only by route guards.

## Accessibility

- Use landmark regions for navigation and main content.
- Mark the active navigation item and queue status semantically.
- Give notification, avatar, and arrow controls accessible names.
- Ensure queue status and ETA are conveyed in text, not color alone.
- Present upcoming appointments as a list; keep the status label as text, not color alone.
- Expose the full appointment date to assistive technology through a `<time>` element.
- Expose the allowance bar as a `progressbar` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Give each quick-action tile an accessible name matching its visible label.

## Acceptance criteria

1. `/patient/dashboard` reproduces the verified shell, greeting, active queue card, and quick-action hierarchy.
2. Active, empty, loading, stale, and error queue states are explicit and responsive.
3. Queue and booking navigation works with keyboard and touch targets.
4. Focused Cypress coverage verifies authenticated rendering and unauthenticated redirection.
5. A patient with a future `confirmed`/`pending`/`checked_in` appointment sees it under
   `Upcoming Appointments` with service, status, date, start time, and doctor.
6. Past, `completed`, `cancelled`, and `no_show` appointments are not listed as upcoming.
7. An appointment created through `/patient/book` appears on the dashboard after returning there.
8. The empty, loading, and retryable error states of the upcoming list are implemented.
9. Quick actions render `Book Appt`, `Reschedule`, `Cancel Visit`, and `My Records`, and the reschedule
   and cancel tiles navigate to their pages.
10. The `Policy Limits` panel shows the used count, the limit, the window in days, the remaining count,
    and a usage bar, with loading and error states.
