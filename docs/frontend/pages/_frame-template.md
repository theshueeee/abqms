---
id: FRONTEND-FRAME-TEMPLATE
title: Frontend Frame Specification Template
status: template
parent: docs/frontend/_overview.md
---

# `<Frame name>`

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Node URL: pending inspection
- Desktop frame: pending inspection
- Mobile frame: pending inspection
- Prototype connections: pending inspection

## Application mapping

- Route:
- Role:
- Owning feature:
- Entry conditions:
- Exit actions:

## Layout and components

- Desktop layout:
- Mobile layout:
- Shared components:
- Frame-specific components:
- Verified tokens/assets:

## States and behavior

- Default:
- Loading:
- Empty:
- Validation:
- Error:
- Success:
- Permission/unauthenticated:
- Offline or stale data:

## Integration

- API endpoint(s):
- Request/response data:
- Session requirements:
- Server-side authorization:

## Accessibility

- Semantic structure:
- Labels and descriptions:
- Keyboard/focus behavior:
- Contrast and motion considerations:

## Acceptance criteria

1. The implementation matches the verified Figma frame at its target desktop viewport.
2. The responsive mobile layout follows the verified Figma mobile frame or documented behavior.
3. All listed states and permissions are implemented explicitly.
4. The owning API and focused Cypress coverage pass.
