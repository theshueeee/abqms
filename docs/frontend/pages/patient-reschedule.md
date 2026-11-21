---
id: FRONTEND-PATIENT-RESCHEDULE
title: Patient Reschedule
status: implemented
parent: docs/frontend/_overview.md
related: [features/F-06-reschedule-and-cancel.md, api/appointments.md, pages/patient-dashboard.md]
---

# Patient Reschedule

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Node URL: pending inspection — the prototype exposes rescheduling through the dashboard
  `Reschedule` quick action rather than a dedicated frame
- Desktop frame: pending inspection
- Mobile frame: pending inspection
- Prototype connections: the dashboard `Reschedule` quick action opens this page

## Application mapping

- Route: `/patient/reschedule`
- Role: authenticated patient
- Owning feature: `F-06` — Reschedule & Cancellation
- Entry conditions: valid patient session
- Exit actions: return to the dashboard, or book an appointment when nothing can be rescheduled

## Layout and components

- Desktop layout: heading `Reschedule appointment`, then a list of appointments to move, then the
  shared date/time picker below the selected appointment.
- Mobile layout: the same single column; the appointment list precedes the picker.
- Shared components: `PatientShell`, `AppointmentSlotPicker` (shared with `/patient/book`).
- Frame-specific components: the selectable appointment rows.
- Verified tokens/assets: none — the frame is not yet inspected in Figma.

## States and behavior

- Default: the patient's future `pending` and `confirmed` appointments are listed as selectable rows
  showing the service name, the current date and time, and a `Select` action.
- Loading: `Loading your appointments...` while the list loads.
- Empty: `No upcoming appointments to reschedule.` with a booking action.
- Validation: the picker only offers slots the API reports as available.
- Error: the API message is shown verbatim; a `409` with `flagged: true` shows
  `You have reached the reschedule limit. Your account is flagged for review.` instead.
- Success: `Appointment rescheduled` with the new service, doctor, date and time, and a
  `Return to dashboard` link.
- Permission/unauthenticated: redirect missing or expired sessions to `/login`.
- Offline or stale data: not applicable — the page always fetches fresh before submitting.

## Integration

- API endpoint(s): `GET /api/appointments` (the patient's own list),
  `GET /api/appointments/availability` (slot picker),
  `PATCH /api/appointments/:id/reschedule` (`F-06`).
- Request/response data: the reschedule request body is `{ scheduled_datetime }`; the response is
  `{ appointment, reschedules_used, reschedules_remaining }`.
- Session requirements: authenticated HTTP-only session cookie.
- Server-side authorization: the API refuses rescheduling another patient's appointment with `403`
  and enforces the `BR-02` budget server-side.

## Accessibility

- Semantic structure: a heading, a labelled list of selectable rows, and the shared picker section.
- Labels and descriptions: each row is a button whose accessible name includes the service and time.
- Keyboard/focus behavior: rows and slots are native buttons and are reachable by keyboard; the
  selected row exposes `aria-pressed`.
- Contrast and motion considerations: the selected row uses the brand colour with white text.

## Acceptance criteria

1. The page lists the patient's future `pending` and `confirmed` appointments and excludes past,
   `completed`, `cancelled` and `no_show` rows.
2. Selecting an appointment reveals the shared date/time picker.
3. Choosing an available slot submits `PATCH /appointments/:id/reschedule` with the chosen
   `scheduled_datetime` and shows the success panel.
4. A `409` with `flagged: true` shows the reschedule-limit message.
5. The empty state offers a booking action.
6. The owning API and focused Cypress coverage pass.
