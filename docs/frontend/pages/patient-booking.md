---
id: FRONTEND-PATIENT-BOOKING
title: Patient Booking
status: implemented
parent: docs/frontend/_overview.md
---

# Patient Booking

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Dashboard entry: [node 6-51](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-51&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)
- Date/time frame: [node 6-214](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-214&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)
- Verified prototype step: `15 / 22`
- The prototype dashboard's `Book` action enters this flow.

## Application mapping

- Route: `/patient/book`
- Role: authenticated patient
- Owning feature: `F-04`
- Entry conditions: a valid patient session
- Exit actions: `Cancel` returns to `/patient/dashboard` or the previous patient route
- Submission behavior: selecting an available PM slot submits `POST /api/appointments`
  immediately. The prototype does not expose a separate confirmation step.

## Verified date/time composition

The verified frame is a centered booking page on a desktop canvas:

- Header: `UM Dentistry`
- Left control: `Cancel`
- Three-step indicator:
  - `Service` — completed
  - `Time` — active
  - `Confirm` — pending
- Page title: `Pick Date & Time`
- Subtitle: `General Checkup - General/Outpatient Clinic`
- Month heading with previous/next month controls
- Weekday labels
- Selectable date cells
- Section heading: `Available slots for [selected date]`
- Slot cards showing time and availability

The subtitle is rendered as `[default service] - General Outpatient Clinic`, matching the verified
`General Checkup - General/Outpatient Clinic` wording. The service and doctor are server-side
defaults, so no service or doctor control is shown.

The verified sample shows May 2024, with Thursday 15 May selected. `2:00 PM` is presented as
`Booked` and disabled; `2:30 PM` is presented as `Available` and selected.

Exact editor dimensions and mobile frame measurements are not yet verified. Mobile implementation
must therefore preserve the verified hierarchy and controls without claiming Figma-exact sizing.

## Service and doctor defaults

The patient does not choose a service or doctor. `F-04` resolves the active default appointment
type and the seeded doctor resource server-side (`FR-BOOK-10`), so the page shows only the default
service name and the clinic label in the subtitle. No select, radio list, or other service/doctor
control is rendered.

The reference endpoints `GET /api/appointment-types` and `GET /api/doctors` remain available to
other features, but this page does not call them.

## API integration

| Purpose | Endpoint | Request / response |
|---|---|---|
| Load PM availability | `GET /api/appointments/availability` | Query `date` only; receive `slots[].scheduled_datetime`, `appointment_type`, `doctor` |
| Submit booking | `POST /api/appointments` | Send `scheduled_datetime` only; defaults resolve server-side |
| Cancel | Client navigation | No appointment is created |

Availability and submission use the confirmed F-04 rules:

- PM window: `[12:00,17:00)` in `Asia/Kuala_Lumpur`
- 30-minute slot starts
- Active time blocks exclude slots
- Existing occupied appointments exclude slots
- Slots that have already started are excluded (`FR-BOOK-11`)
- The 15-patient-per-day cap is not enforced
- Booking requests are not gated by the current clock; the scheduled slot must be in the future

## States and behavior

- Loading: display a neutral loading state while availability loads.
- Service unavailable: show an empty state and retry control when the default service cannot be
  resolved.
- Date: only future PM dates should expose slots; disabled dates and AM-only behavior should not
  imply booking availability.
- Availability loading: preserve the selected date and show slot skeletons.
- No slots: show an explicit no-available-slots state and allow another date selection.
- Available slot: display as selectable and submit immediately on selection.
- Booked/elapsed slot: disabled, visibly labelled `Unavailable`, and not selectable.
- Submission loading: prevent duplicate submission and show a progress label.
- Conflict: preserve selected data and show a retryable conflict message.
- Success: show the real returned service, doctor, date, and start time plus a route back to
  `/patient/dashboard`.
- API/validation error: preserve the form and show a specific, retryable alert.
- Authentication: missing or expired sessions redirect to `/login`.
- Cancel: leave the flow without a booking request.

## Confirmation behavior

No separate confirmation step is included in F-04 frontend behavior. Selecting an available slot
is the confirmation action and must call `POST /api/appointments` once.

Any success response must present enough factual information to identify the booked appointment:
service, doctor, date, and start time. Do not fabricate queue numbers or clinical status.

## Layout and accessibility

- Use landmarks and a clear page heading.
- Use labelled previous/next month controls.
- Represent the week and selected date semantically.
- Give available, booked, and selected slots accessible text beyond color.
- Use native or ARIA appropriate radio/selection semantics for slot cards.
- Disable unavailable slots and prevent repeated submission.
- Return focus to the success heading or first relevant content after submission.
- Use an alert/status region for loading conflicts and success messages.
- Preserve keyboard and touch access at desktop and mobile widths.
- Do not rely on teal, lime, or red color alone to communicate state.

## Acceptance criteria

1. The patient dashboard `Book` action opens `/patient/book`.
2. The date/time frame preserves the verified header, progress indicator, title, calendar,
   selected date, and PM slot presentation.
3. Appointment type and doctor are resolved server-side defaults; no service or doctor control is
   rendered.
4. Availability is requested with only the selected date and returns the resolved appointment type
   and doctor.
5. Booked/unavailable/elapsed slots cannot be selected or submitted.
6. Selecting an available slot sends exactly one booking request.
7. A conflict or service failure leaves the page retryable and preserves the selected date/slot.
8. Successful booking shows the real returned appointment summary.
9. Missing/expired authentication redirects to `/login`.
10. The page and slot controls remain usable at desktop and mobile widths.
11. Slots that have already started in `Asia/Kuala_Lumpur` are not presented as available.
12. Booking succeeds outside 12:00–17:00 local time when the selected slot is a future PM slot.
