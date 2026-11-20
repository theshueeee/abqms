---
id: FRONTEND-OVERVIEW
title: Frontend Overview
status: active
parent: docs/FRONTEND-BUILD-PLAN.md
last_verified: 2026-11-18
---

# Frontend Overview

## Design source

The visual source is the [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue).
Frame names, node IDs, routes, and state variants are recorded only after interactive inspection in
Figma. The individual page files preserve the visual observations and the implementation mapping.

## Application baseline

| Area | Current implementation |
|---|---|
| Framework | Next.js App Router |
| Styling | TailwindCSS utility classes |
| Frontend location | `apps/web/src/app` |
| Current route | `/` landing page |
| API boundary | Separate Express API; frontend must not import Prisma/backend code |
| Testing | TypeScript/build checks and Cypress |
| Responsive scope | Desktop and mobile for every implemented frame |

## Route and frame inventory

| Figma frame | Node link | Route | Role | Feature | Status |
|---|---|---|---|---|---|
| Patient Login & Registration | [6-2](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-2&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1) | `/login` | Unauthenticated | F-02/F-03 | implemented; typecheck/build pass |
| Patient registration | — | `/register` | Unauthenticated | F-02 | implemented; API/Cypress coverage pass |
| Forgot password | — | `/forgot-password` | Unauthenticated | F-02 | implemented; API/Cypress coverage pass |
| Reset password | — | `/reset-password?token=...` | Unauthenticated | F-02 | implemented; API/Cypress coverage pass |
| Patient Dashboard | [6-51](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-51&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1) | `/patient/dashboard` | Patient | F-02/F-03, F-04, F-08 | verified; spec written |
| Remaining prototype frames | — | — | — | — | pending inspection |

## Delivery rule

Every frame implementation must link to its page/frame specification, the owning feature
requirements, and the API contract it uses. A frame is not considered delivered when it is only a
static visual: its specified states, permissions, API behavior, accessibility, and responsive
layout must be implemented and tested.
