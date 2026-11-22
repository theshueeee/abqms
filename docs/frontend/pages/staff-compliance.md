---
id: FRONTEND-STAFF-COMPLIANCE
title: Staff Compliance Review
status: implemented
parent: docs/frontend/_overview.md
---

# Staff Compliance Review

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Node: pending interactive inspection (moved from remaining prototype frames).
- Design source for card, badge, button and empty/error/loading tokens: `frontend/_design-system.md`.

## Application mapping

- Route: `/staff/compliance`
- Role: authenticated staff (`dental_assistant` view-only; `admin` may suspend/reinstate)
- Owning feature: `F-12` (flagging, suspension review, reinstatement)
- Entry conditions: valid staff session (patient sessions redirect to `/patient/dashboard`;
  missing/expired sessions redirect to `/login`)
- Exit actions: sign out, admin suspend/reinstate on each row

## Layout and components

- Desktop: `StaffHeader` with `UM Dentistry` brand and a `Sign out` link; a single-column
  `Compliance Review` main area.
- Two sections stacked: `Flagged for review` (pending flags) and `Suspended accounts`.
- Each flagged row shows name, email, the flag reason, the flagged timestamp, and for admins a
  reason input, optional notes textarea and a `Suspend account` action.
- Each suspended row shows name, email, the suspension reason, the reviewed timestamp, and for admins
  a `Reinstate account` action.
- Role read from `GET /auth/me`; `admin` toggles the action controls, assistants see a hint
  ("Suspension actions require an admin").
- Shared components: none promoted yet (header and card live in the page); tokens follow
  `_design-system.md`.

## States and behavior

- Loading: `Checking session...` while `/auth/me` resolves; `Loading flagged accounts...` /
  `Loading suspended accounts...` for each list.
- Empty: `No flagged accounts awaiting review.` / `No accounts are currently suspended.`
- Error: a retryable alert with a `Try again` button that refetches both lists.
- Success: a successful suspend/reinstate refetches both lists (the row moves between sections or
  disappears).
- Suspension validation: an empty reason shows "Enter a reason to suspend this account."
- Permission/unauthenticated: redirect to `/patient/dashboard` or `/login` as above.

## Integration

- `GET /auth/me` → `{ user: { id, role } }` (role gate; admin vs assistant)
- `GET /api/accounts/flagged` → `{ flagged: [{ patient, flag }] }`
- `GET /api/accounts/suspended` → `{ suspended: [{ patient, record }] }`
- `PATCH /api/accounts/:id/suspend` body `{ reason, admin_notes? }`
- `PATCH /api/accounts/:id/reinstate` body `{}`
- Session: HTTP-only cookie; authorization still enforced server-side (`BR-07`).

## Accessibility

- Mark each row's action button with a clear accessible name (e.g. `Suspend account`, `Reinstate account`).
- Bind each textarea/input to a `<label>` keyed by the patient id.
- Use `role="alert"`/`role="status"` for error and success messages and the empty states as text.

## Acceptance criteria

1. `/staff/compliance` renders the flagged and suspended queues for authenticated staff.
2. An admin can suspend a flagged account with a reason and optional notes, and reinstate a suspended
   one; each action refetches both lists.
3. A dental assistant can read the queues but is shown no suspend/reinstate controls.
4. Empty, loading, validation and retryable error states are implemented.
5. Unauthenticated and patient sessions redirect appropriately.
6. Focused Cypress coverage (`cypress/e2e/f12-compliance-ui.cy.ts`) passes alongside the F-12 API tests.
