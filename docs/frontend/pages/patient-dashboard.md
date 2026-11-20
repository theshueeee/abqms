---
id: FRONTEND-PATIENT-DASHBOARD
title: Patient Dashboard
status: verified
parent: docs/frontend/_overview.md
---

# Patient Dashboard

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Prototype node: [6-51](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-51&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)
- Verified prototype step: `14 / 22`
- Frame orientation: responsive patient application shell; exact editor dimensions remain to be measured
- Prototype connections: `View Live Queue` opens the queue tracker; sidebar `Book` opens booking; `Queue` opens queue history/status; `Records` opens records

## Application mapping

- Route: `/patient/dashboard`
- Role: authenticated patient
- Owning feature: patient account entry plus queue and booking summaries
- Entry conditions: valid patient session
- Exit actions: navigation to booking, queue, records, live queue, notifications, or account controls

## Layout and components

- Desktop shell has a left navigation rail with `UM Dentistry`, active `Home`, `Book`, `Queue`, and `Records`.
- Main content begins with `Good morning, Faradiena`, notification indicator, and patient avatar.
- Active queue card shows `General Outpatient Clinic`, `Waiting` status, queue number `B-014`, `3 patients ahead of you`, approximately `25 mins wait`, a waiting message, and `View Live Queue`.
- `Quick Actions` begins below the queue card and is arranged as a responsive card grid.
- Mobile behavior collapses the desktop navigation into a compact navigation pattern while keeping greeting, active queue, and quick actions in a single column.
- Shared components: `PatientShell`, `SidebarNav`, `PageHeader`, `QueueSummaryCard`, `StatusBadge`, `QuickActionCard`, `NotificationButton`, `Avatar`.

## States and behavior

- Default: authenticated patient with an active queue ticket.
- Loading: shell and queue summary use skeletons while session and queue data load.
- Empty: show an explicit no-active-queue state with a booking/check-in action.
- Error: preserve the shell and show a retryable queue-summary error.
- Success: queue summary links to live queue details.
- Permission/unauthenticated: redirect missing or expired sessions to `/login`.
- Offline or stale data: label queue data as stale and offer refresh; do not present stale ETA as current without an indicator.

## Integration

- API endpoint(s): patient session/me endpoint, active queue summary endpoint, and navigation targets documented by the owning F-04/F-08 contracts.
- Request/response data: patient display name/avatar, active queue number/status, patients ahead, ETA, and clinic name.
- Session requirements: authenticated HTTP-only session cookie.
- Server-side authorization: patient ownership and queue visibility are enforced by the API, not only by route guards.

## Accessibility

- Use landmark regions for navigation and main content.
- Mark the active navigation item and queue status semantically.
- Give notification, avatar, and arrow controls accessible names.
- Ensure queue status and ETA are conveyed in text, not color alone.

## Acceptance criteria

1. `/patient/dashboard` reproduces the verified shell, greeting, active queue card, and quick-action hierarchy.
2. Active, empty, loading, stale, and error queue states are explicit and responsive.
3. Queue and booking navigation works with keyboard and touch targets.
4. Focused Cypress coverage verifies authenticated rendering and unauthenticated redirection.
