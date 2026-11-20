---
id: FRONTEND-DESIGN-SYSTEM
title: Frontend Design System
status: active
parent: docs/FRONTEND-BUILD-PLAN.md
last_verified: 2026-11-18
---

# Frontend Design System

## Source and verification

Design values must be copied from verified Figma variables/styles during the inspection pass.
Values below are the current code baseline, not a claim that they are the final Figma system.

## Current code baseline

| Token | Current value | Source |
|---|---|---|
| `brand.DEFAULT` | `#173d35` | `apps/web/tailwind.config.ts` |
| `brand.dark` | `#102e28` | `apps/web/tailwind.config.ts` |
| `brand.pale` | `#eaf4e5` | `apps/web/tailwind.config.ts` |
| `brand.lime` | `#cfff72` | `apps/web/tailwind.config.ts` |
| `shadow.card` | `0 18px 50px rgba(24, 33, 31, 0.08)` | `apps/web/tailwind.config.ts` |
| `radius.4xl` | `2rem` | `apps/web/tailwind.config.ts` |
| Body font | Arial, Helvetica, sans-serif | `apps/web/src/app/globals.css` |

## Figma inspection checklist

- Color variables and semantic roles
- Font family, weights, sizes, line heights, and letter spacing
- Spacing, sizing, radii, borders, shadows, and elevation
- Desktop/mobile breakpoints and frame-specific layout changes
- Icons, illustrations, images, and export/licensing requirements
- Component variants and interactive states
- Focus, keyboard, contrast, reduced-motion, and semantic-label requirements

## Component inventory

Shared components will be added only when repeated by two or more verified frames. Candidate
categories are application shell, navigation, button, form field, alert, card, dialog, status
badge, loading state, empty state, and error state. Their final props and variants must be based on
the inspected Figma components and owning feature behavior.
