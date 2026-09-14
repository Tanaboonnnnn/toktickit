# Lab 3 Zen Green UI Specification

Status: Issue #41 contract draft for peer review. Screens and screenshots described below are planned evidence, not completed implementation.

## 1. Design Intent

Lab 3 extends the existing Lab 2 Zen Green application rather than creating a second visual system. Reuse the current tokens, Bootstrap/system font stack, cards, form controls, badges, buttons, validation placement, focus treatment, and responsive conventions.

Core retained tokens include:

| Token | Value / intent |
|---|---|
| Primary | `#006B3C` application header and primary actions |
| Secondary | `#0B7A46` active navigation, links, focus accents |
| Pale green | `#EAF6EF` selected/success/subtle emphasis |
| Page | `#F5F7F6` quiet near-white background |
| Surface | white cards/forms/tables |
| Text | dark charcoal-green |
| Read-only | soft gray-green background and clear boundary |
| Error | dark red text/border plus readable message |
| Warning | amber treatment plus readable message |

No status, role, priority, validation, success, or removal meaning may rely on color alone.

## 2. Application Shell and Navigation

After authentication activation the shell shows:

- TokTickIT identity.
- Current authenticated User name and role.
- Logout.
- Permitted password/profile action.
- Role-appropriate navigation only.

Selected role homes:

- Requester -> `#/tickets`.
- IT Staff -> `#/staff/tickets`.
- Administrator -> `#/admin/users`.

Administrator ticket navigation may be shown because the approved authorization matrix explicitly permits Staff Ticket operations for Administrator. User Management remains the Administrator's primary home.

Known routes:

- `#/login`
- `#/change-password`
- `#/tickets`
- `#/tickets/new`
- `#/tickets/:id`
- `#/staff/tickets`
- `#/staff/tickets/:id`
- `#/admin/users`

Unknown/malformed route -> Not Found. Authenticated wrong-role destination -> Access Denied. Unauthenticated protected route -> Login. Mandatory-password-change session -> Change Password.

No Development Requester selector, current Development Requester display, or Change Requester action remains after #45 authentication activation.

## 3. Shared Control and Feedback Rules

- Every form input has a visible label and accessible name.
- Required fields have visible required indication and actual validation text when invalid.
- First invalid control receives focus on failed submission where practical.
- Busy actions retain visible text, prevent duplicate activation, and do not masquerade as success before server confirmation.
- Editable controls use the current white/neutral-border style; read-only information uses the current distinct read-only style.
- Meaningful states: loading, saving, validation, success, empty, no results, forbidden, not found/unavailable, conflict, and safe API failure.
- Recoverable failure preserves safe editable values/drafts where the contract says retry is meaningful.
- Private/user-scoped state is cleared on authenticated identity/session change; stale async responses are discarded.

## 4. Login

Contains:

- Email.
- Password.
- Login action.
- Required/validation messages.
- Submitting/busy state.
- Safe invalid/inactive-account feedback.
- Rate-limit guidance when `429` is returned.
- Retryable network/server failure.

Passwords are never persisted in browser storage or rendered back to the user.

## 5. Mandatory Change Password

Contains:

- Current password.
- New password.
- Confirm new password.
- Visible selected policy summary: 15–128 Unicode code points, confirmation match, must differ from current password.
- Validation, busy, safe failure, and success continuation.

While `mustChangePassword=true`, normal application destinations are unavailable even if typed directly.

## 6. Requester Screens

### Create Ticket

Retain Lab 2 field layout, validation, reference-data states, idempotent create UX, Attachment preselection, partial upload success, and ambiguous-outcome handling. Requester is now authenticated identity and read-only; no selector is rendered.

### My Tickets

Retain search, Category, Requested Priority, status, sorting, pagination, Empty/No Results/Failure, table/card responsive behavior. Status control and badges support all eight Lab 3 states.

### Requester Ticket Detail

Retain read-only Ticket information and Requester Attachment lifecycle. Add:

- Public Comments.
- `Problem Appears Resolved` action when allowed by current state.
- Formal resolution information when available.

Do not show Internal Notes or staff operational mutation controls.

## 7. IT Staff Ticket Queue

Desktop: readable table, not a mega-grid. Recommended visible groups:

- Ticket Number / Summary.
- Requester.
- Requested Priority.
- IT Priority.
- Current Status.
- Owner.
- Last Updated.
- View action.

Secondary Category/Created information may be placed in supporting text/card/detail rather than forcing unreadable columns.

Controls:

- Search.
- Category.
- Current Status.
- Requested Priority.
- IT Priority.
- Owner (`all`, `unassigned`, `me`, specific eligible owner where provided).
- Sort field/direction.
- Page size and Previous/Next.
- Clear.

States: Loading, Empty, No Results, Forbidden, Failure/Retry, and out-of-range recovery. Returning from Detail preserves queue context.

Mobile/tablet use readable cards/filter reflow with no page-level horizontal scrolling.

## 8. IT Staff Ticket Detail

Structure:

1. Read-only Ticket identity/context.
2. Owner control.
3. Requested Priority read-only + IT Priority editable control.
4. Current Status + only permitted next actions.
5. Resolution/cancel inputs when required.
6. Existing Attachments, read-only metadata/download for Staff/Admin in Lab 3.
7. Public Comments.
8. Internal Notes with strong `Internal / Staff only` visibility label and distinct presentation.

Confirmations for reassign/Resolve/Close/Reopen/Cancel include Ticket Number, current state, next state/action, and consequence. `409` conflict presents authoritative-change guidance and requires deliberate reload/reapply; the client does not auto-overwrite.

## 9. Administrator User Management

One intentionally simple screen.

List columns:

- Name.
- Email.
- Role.
- Status.
- Edit action.

Controls:

- Search name/email.
- Optional one-role filter.
- Create User.

Create fields:

- Name.
- Email.
- One role.
- Active status.
- Initial password.

Edit fields:

- Name.
- Email.
- One role.
- Active status.

Initial Password is a separate confirmed action; Edit never displays an existing password/hash. Safety-rule failures such as self-deactivation, last active Administrator, assigned-owner conflict, duplicate email, stale version, and forbidden access are clear but safe.

No user deletion, bulk operations, import/export, departments, history, multi-role UI, or email-reset workflow.

## 10. Badges

- Requested Priority: Low / Medium / High.
- IT Priority: Low / Medium / High, visually distinguishable by label/context from Requested Priority.
- Ticket Status: New / Open / In Progress / Waiting for Requester / Resolved / Closed / Reopened / Cancelled.
- Role: Requester / IT Staff / Administrator.
- Account Status: Active / Inactive.

Text labels remain present; color is secondary.

## 11. Responsive and Accessibility Rules

Required evidence viewports:

- Desktop: `1440×900`.
- Tablet: `834×1112`.
- Mobile: `390×844`.

At all supported widths:

- no clipped labels;
- no overlapping messages;
- no hidden required actions;
- no unreadable long Ticket summaries, names, comments, filenames, or validation text;
- no unintended page-level horizontal scrolling;
- keyboard focus visible and logical;
- controls have accessible names and labels;
- validation/help text associated with controls;
- non-color state meaning present.

## 12. Authentication Activation UI Gate

The accepted #45 integrated state must provide Login, mandatory password change, authenticated shell/transport, and usable retained Requester screens at the same time that protected Requester backend identity is switched away from the Development Requester header. A half-cutover that leaves the browser with no usable identity path is not an accepted merged increment.

## 13. Planned Evidence Paths

Do not mark these complete until generated and inspected from the actual application.

```text
artifacts/lab-03/screenshots/
├── authentication/
├── requester/
├── staff-queue/
├── staff-ticket-detail/
└── user-management/
```

Final visual inspection must cover all major screens at Desktop/Tablet/Mobile, plus representative validation/empty/no-results/forbidden/conflict/failure states.
