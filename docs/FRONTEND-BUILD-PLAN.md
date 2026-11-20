---
id: FRONTEND-BUILD-PLAN
title: Frontend Build Plan
status: active
parent: docs/SPEC.md
last_verified: 2026-11-17
---

# Frontend Build Plan

## Objective

Build the frontend continuously from the approved Figma design instead of postponing frontend work
until the backend is complete. The project will be delivered as responsive vertical slices: each
slice contains the relevant screens, API integration, states, tests, and synchronized documentation.

Figma is the source of truth for visual and interaction intent. The specification remains the source
of truth for permissions, business rules, API behavior, data requirements, and unresolved decisions.

The repository frontend documentation is organized under `docs/frontend/`: `_overview.md` contains
the frame-to-route inventory, `_design-system.md` contains verified tokens and shared component
conventions, and `pages/` contains one specification per individual Figma frame. The frame files
are created after interactive inspection; no frame names or measurements are guessed.

## Inputs and constraints

- Frontend stack: Next.js App Router and TailwindCSS.
- Figma handoff: inspect-enabled [DentaQueue Figma link](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue).
- Responsive scope: desktop and mobile for every new screen.
- Backend architecture: the existing decoupled Express API and PostgreSQL/Prisma model remain in use.
- Testing: use the existing TypeScript/build checks and Cypress; do not introduce a new test framework.
- Server-side authorization remains mandatory; client-side route visibility is not authorization.

## Delivery method

For each feature delivery unit:

1. Read the feature acceptance criteria, API contract, roles, business rules, and Figma flow.
2. Map Figma frames to application routes and identify reusable components and design tokens.
3. Implement the smallest complete responsive screen flow, including loading, empty, validation,
   error, success, and permission states.
4. Connect the screen to the typed frontend API boundary and the real session/backend behavior.
5. Validate at the Figma target viewports, keyboard navigation, and mobile layouts.
6. Run the smallest relevant typecheck, build, API, and Cypress checks.
7. Update the feature documentation, traceability, and `docs/PROGRESS.md` before moving on.

## Initial foundation

Before the first visual implementation:

- Inventory Figma frames, flows, breakpoints, typography, colors, spacing, icons, imagery, and
  interaction states.
- Confirm asset ownership and any export requirements.
- Establish shared web primitives: application shell, navigation, buttons, form fields, cards,
  alerts, dialogs, status badges, loading states, and error states.
- Record design-dependent questions in `docs/requirements/open-questions.md` instead of guessing.

## Feature order

### First frontend slice

**Patient authentication and account entry — F-02/F-03**

Implement the Figma-matched sign-in, sign-up, forgot-password, reset-password, and authenticated
account-entry flows against the existing API and opaque-cookie session behavior. Cover validation,
login throttling, suspended patients, inactive staff, protected routes, and non-disclosing recovery
responses in the UI without weakening server-side authorization.

### Subsequent vertical slices

Continue in the dependency-safe order:

1. F-11 — Time-block management
2. F-04 — Appointment types and booking
3. F-05 — Check-in and late handling
4. F-06 — Reschedule and cancel
5. F-07 — Walk-in registration and OCR
6. F-08 — Live queue view
7. F-09 — Master view and call next
8. F-10 — Emergency override
9. F-12 — Flagging and suspension
10. F-13 — Analytics
11. F-14 — Notifications
12. F-15 — Audit logging
13. F-16 — Follow-up booking

## Completion rule

A slice is not complete when a static screen resembles Figma. It is complete only when the
responsive flow is connected to its real API behavior, handles its specified states and roles, has
focused automated coverage, and its documentation and delivery status are synchronized.

## Current inspection status

The supplied Figma link is available and the first two patient frames have been verified:
`Patient Login & Registration` (node `6-2`) and `Patient Dashboard` (node `6-51`). Their page-level
specifications are in `docs/frontend/pages/`. Exact editor measurements, exported assets, and the
remaining prototype frames are still pending inspection; implementation should use the verified
composition and existing API contracts without inventing unverified assets.
