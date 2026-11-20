---
id: FRONTEND-PATIENT-LOGIN-REGISTRATION
title: Patient Login and Registration
status: verified
parent: docs/frontend/_overview.md
---

# Patient Login and Registration

## Figma reference

- File: [DentaQueue Figma file](https://www.figma.com/design/4vzskzwnRHQKcnW11Tqubg/DentaQueue)
- Prototype node: [6-2](https://www.figma.com/proto/4vzskzwnRHQKcnW11Tqubg/DentaQueue?node-id=6-2&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)
- Verified prototype step: `13 / 22`
- Frame orientation: mobile-oriented vertical frame; exact editor dimensions remain to be measured
- Prototype connections: `Log In` enters the authenticated patient experience; `Create Account` enters registration

## Application mapping

- Route: `/login`
- Related routes: `/register`, `/forgot-password`, `/reset-password?token=...`
- Role: unauthenticated patient or staff account holder
- Owning feature: F-02/F-03 authentication and RBAC
- Entry conditions: no valid session is required
- Exit actions: successful login redirects to the role-appropriate authenticated landing route; account creation opens registration

The related routes use the same shell and API boundary. Their page-specific validation and recovery
states are implemented in the web app; their visual Figma frame references remain pending until
those frames are inspected individually.

## Layout and components

- Page background is a pale neutral surface with a centered bordered card.
- Card header contains a circular tooth mark, `UM Dentistry`, and `Fakulti Pergigian Patient Portal`.
- Form content contains `Welcome Back`, IC / Matric Number, password with visibility control, remember-me checkbox, forgot-password link, primary `Log In` button, and secondary `Create Account` button.
- Mobile behavior keeps the single-column form and preserves the large touch targets; desktop centers the card without stretching the form controls.
- Shared components: `AuthCard`, `TextField`, `PasswordField`, `Checkbox`, `PrimaryButton`, `OutlineButton`, `AuthDivider`, `FormAlert`.
- Verified visual direction: dark teal headings and controls, pale green/neutral surfaces, rounded bordered controls, compact sans-serif typography.

## States and behavior

- Default: empty identifier and password fields.
- Loading: disable fields and show progress on `Log In`.
- Validation: identify missing/invalid identifier and missing password inline.
- Error: show a non-sensitive authentication error without exposing account state.
- Success: establish the opaque-cookie session and redirect.
- Permission/unauthenticated: this is the public entry route; authenticated users may be redirected to their landing page.
- Offline or stale data: show a retryable request error and preserve entered values.

## Integration

- API endpoint(s): existing patient/staff login endpoint and logout/session boundary documented under `docs/api/auth.md`.
- Request/response data: identifier and password request; role/session result on success; generic failure response on rejection.
- Session requirements: HTTP-only opaque session cookie; the browser client must not manage a bearer token in local storage.
- Server-side authorization: API middleware remains authoritative for role and account-status checks.

## Accessibility

- Use a labelled form, explicit labels associated with each control, and a real button for each action.
- Password visibility control must have an accessible pressed state and name.
- Move focus to the first invalid field or form-level error after submission.
- Preserve visible keyboard focus and sufficient contrast for teal controls on pale surfaces.

## Acceptance criteria

1. `/login` matches the verified prototype composition at mobile and centered desktop widths.
2. Login, forgot-password, and create-account actions are reachable by keyboard and screen readers.
3. API errors, throttling, suspended accounts, and inactive staff responses are presented without weakening server behavior.
4. Focused Cypress coverage verifies successful login, invalid submission, and rejected authentication.
