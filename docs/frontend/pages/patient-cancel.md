---
id: FRONTEND-PATIENT-CANCEL
title: Patient Cancel
status: implemented
parent: docs/frontend/_overview.md
related: [features/F-06-reschedule-and-cancel.md, api/appointments.md, pages/patient-dashboard.md]
---

# Patient Cancel

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Node URL: pending inspection — the prototype exposes cancellation through the dashboard
  `Cancel Visit` quick action rather than a dedicated frame
- Desktop frame: pending inspection
- Mobile frame: pending inspection
- Prototype connections: the dashboard `Cancel Visit` quick action opens this page

## Application mapping

- Route: `/patient/cancel`
- Role: authenticated patient
- Owning feature: `F-06` — Reschedule & Cancellation
- Entry conditions: valid patient session
- Exit actions: return to the dashboard

## Layout and components

- Desktop layout: heading `Cancel visit`, a list of appointments to cancel, then a `Reason for
  cancelling` card containing the reason select and the confirm button.
- Mobile layout: the same single column; the reason card follows the appointment list.
- Shared components: `PatientShell`.
- Frame-specific components: the selectable appointment rows and the reason form.
- Verified tokens/assets: none — the frame is not yet inspected in Figma.

## States and behavior

- Default: the patient's future `pending` and `confirmed` appointments are listed as selectable rows
  showing the service name, the current date and time, and a `Select` action.
- Loading: `Loading your appointments...` while the list and reasons load.
- Empty: `No upcoming appointments to cancel.`
- Validation: the confirm button stays disabled until a reason is chosen; the select is labelled
  `Choose a reason` and its id is `cancellation-reason`.
- Error: the API message is shown verbatim above the form.
- Success: `Appointment cancelled` with a `Return to dashboard` link.
- Permission/unauthenticated: redirect missing or expired sessions to `/login`.
- Offline or stale data: not applicable — the page always fetches fresh before submitting.

## Integration

- API endpoint(s): `GET /api/appointments` (the patient's own list),
  `GET /api/cancellation-reasons` (reference data),
  `PATCH /api/appointments/:id/cancel` (`F-06`).
- Request/response data: the cancel request body is `{ cancellation_reason_id }`; the response is
  `{ appointment }` including `cancellation_reason`.
- Session requirements: authenticated HTTP-only session cookie.
- Server-side authorization: the API refuses cancelling another patient's appointment with `403`
  and validates that the reason is active and not system-only.

## Accessibility

- Semantic structure: a heading, a labelled list of selectable rows, and a form region with a
  `<label>` bound to the select.
- Labels and descriptions: each row is a button whose accessible name includes the service and time.
- Keyboard/focus behavior: rows, the select and the confirm button are native controls; the selected
  row exposes `aria-pressed`.
- Contrast and motion considerations: the selected row uses the brand colour with white text.

## Acceptance criteria

1. The page lists the patient's future `pending` and `confirmed` appointments and excludes past,
   `completed`, `cancelled` and `no_show` rows.
2. Selecting an appointment reveals the reason form populated from `GET /api/cancellation-reasons`.
3. The confirm button is disabled until a reason is chosen.
4. Confirming submits `PATCH /api/appointments/:id/cancel` with the chosen `cancellation_reason_id`
   and shows the success panel.
5. The empty state is explicit.
6. The owning API and focused Cypress coverage pass.
