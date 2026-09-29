# Lab 4 Zen Green UI Specification

Status: **Issue #71 UI contract. No Lab 4 UI implementation or screenshot evidence is claimed yet.**

Primary authority: `SE+Lab+4.pdf` sections 7-8 and 14, plus the approved project decisions in `specification.md` and interface shapes in `api-spec.md`.

## 1. Design intent

Lab 4 extends the existing TokTickIT application rather than creating a second visual system. Reuse the delivered Lab 2/3 Zen Green shell, typography, Bootstrap/system font stack, cards, forms, table/card responsive representations, validation placement, badges, buttons, focus treatment, and safe state conventions.

Retained visual tokens:

| Token | Value / intent |
|---|---|
| Primary | `#006B3C` application header and primary actions |
| Secondary | `#0B7A46` active navigation, links, focus accents |
| Pale green | `#EAF6EF` selected/success/subtle emphasis |
| Page | `#F5F7F6` quiet near-white background |
| Surface | white cards/forms/tables |
| Text | dark charcoal-green |
| Read-only | soft gray-green background with explicit read-only label/state |
| Error | dark red treatment plus readable text |
| Warning | amber treatment plus readable text |

No status, role, priority, follow-up, validation, success, cancellation, or read-only meaning may rely on color alone.

## 2. Application shell and role homes

Authentication/bootstrap and mandatory password-change gating remain unchanged from Lab 3.

Selected role homes after successful normal authentication:

- Requester -> `#/dashboard`
- IT Staff -> `#/staff/dashboard`
- Administrator -> `#/staff/dashboard`

Retain all previously permitted destinations:

- Requester: Dashboard, My Tickets, Create Ticket, Requester Ticket Detail.
- IT Staff: Dashboard, Staff Ticket Queue, Staff Ticket Detail.
- Administrator: Staff Dashboard, Staff Ticket Queue/Detail, User Management.

Unknown/malformed route -> Not Found. Authenticated wrong-role destination -> Access Denied. Unauthenticated protected route -> Login. Mandatory-password-change session -> Change Password.

The shell shows TokTickIT identity, current authenticated User name/role, role-appropriate navigation, active-page indication, password/profile action where retained, and Logout.

## 3. Shared state and interaction rules

- Every form control has a visible label and accessible name.
- Required fields expose both visible required meaning and field-level validation.
- First invalid editable control receives focus on submit failure where practical.
- Busy actions keep readable text, expose busy/disabled semantics, and prevent duplicate activation.
- Editable and read-only data use visually and semantically distinct treatments.
- User-authored strings are rendered as text, never trusted HTML.
- Loading state does not render stale values as current truth.
- Empty/no-results state is distinct from loading and failure.
- Recoverable failures preserve safe drafts and selections.
- `409` stale/conflict state displays current authoritative data plus retained draft and requires deliberate user reapplication; no automatic overwrite.
- Ambiguous Action create outcome freezes the original logical request key/payload until reconciliation succeeds or a definitive no-create result permits a new logical submission.
- Scoped private data is cleared on authenticated identity/Ticket change; late responses from prior scope are discarded.
- Success feedback is based on confirmed server response, not optimistic local assumption.

Required state vocabulary where applicable: Loading, Empty, No Results, Validation, Busy/Saving, Success, Forbidden, Unavailable/Not Found, Conflict, Safe Failure, Retry.

## 4. Requester Dashboard

Route: `#/dashboard`.

Purpose: concise owned-only starting point that helps the Requester identify active work, attention-required work, recently updated work, and recently resolved work without reproducing the entire My Tickets screen.

### 4.1 Metric cards

Three primary cards use backend values exactly:

1. **My active Tickets**
2. **Waiting for me**
3. **Recently resolved**

Each card contains:

- short label;
- numeric backend value;
- concise explanation when useful;
- keyboard-accessible drill-down action;
- no client-side recomputation of the count.

The recently-resolved card/list navigation reuses the exact backend-provided `resolvedWindow` rather than calculating a new clock window in the browser.

### 4.2 Preview groups

- **Recently updated**: maximum five owned Tickets, server ordered.
- **Needs your attention**: maximum five owned `WAITING_FOR_REQUESTER` Tickets.

Each preview item shows enough context to choose the right Ticket (Ticket Number, summary, status, relevant priority/update time) and opens Requester Ticket Detail.

### 4.3 States

- Loading: metric placeholders/skeleton or concise loading text with no fake zero values.
- Empty: valid metric zeros and friendly “no matching Tickets” preview text.
- Forbidden/session loss: route back through existing auth handling; no foreign data remains visible.
- Safe failure: error panel with Retry; previously confirmed Dashboard data may be clearly marked stale or removed, never silently shown as current.

## 5. Staff / Administrator Dashboard

Route: `#/staff/dashboard`.

Purpose: concise operational start for Staff/Admin. Administrator reuses this Dashboard; User Management remains separately accessible.

### 5.1 Metric cards

Four primary cards use backend values exactly:

1. **Unassigned active**
2. **My active Tickets**
3. **High-priority active**
4. **Waiting for Requester**

Each card provides a keyboard-accessible drill-down to the Staff Queue with the exact supported filter context.

### 5.2 Preview groups

- **Recently updated Tickets**: max five.
- **My Actions**: max five deduplicated Actions Taken where the actor is the recorder, current assignee, and/or actual performer.

Action preview shows:

- Action status;
- short description/result where useful;
- Ticket Number/summary context;
- explicit `Recorded` / `Assigned` / `Performed` attribution when needed to explain why it appears;
- direct navigation to the Ticket Detail Actions area.

The UI does not create a new standalone full Actions application just to satisfy Dashboard previews.

### 5.3 States

Loading/empty/forbidden/safe failure follow the shared rules. Numeric zeros appear only after successful backend response.

## 6. Dashboard drill-down and navigation context

Supported destinations:

```text
Requester active -> #/tickets?statusGroup=active
Requester waiting -> #/tickets?currentStatus=WAITING_FOR_REQUESTER
Requester resolved -> #/tickets?statusGroup=resolved&resolvedFrom=<F>&resolvedBefore=<T>

Staff unassigned -> #/staff/tickets?owner=unassigned&statusGroup=active
Staff mine -> #/staff/tickets?owner=me&statusGroup=active
Staff high -> #/staff/tickets?itPriority=HIGH&statusGroup=active
Staff waiting -> #/staff/tickets?currentStatus=WAITING_FOR_REQUESTER
```

Requirements:

- Query parsing is explicit and strict; unsupported keys are not silently forwarded.
- Dashboard -> list -> Detail -> Back restores the originating query context.
- Browser refresh on a supported filtered list preserves the same filters.
- Browser Back/Forward follows URL state predictably.
- If a Dashboard Action deep link targets an Action not present on the first page, the Ticket Detail Actions area loads/navigates until that Action is locatable according to the approved pagination mechanism.
- Action-target metadata is UI navigation metadata, not an arbitrary redirect URL and not a hidden Ticket-list filter.

## 7. Actions Taken on Staff Ticket Detail

Lab 4 extends the existing Staff Ticket Detail. Existing Ticket identity, owner/priority/status controls, Attachments, Public Comments, and Internal Notes remain in their established sections.

Recommended section order:

1. Ticket identity/context.
2. Owner, priorities, status/workflow controls.
3. Existing Attachments.
4. Public Comments.
5. Internal Notes (`Internal / Staff only`).
6. **Actions Taken**.
7. Public Ticket workflow history where implemented as a separate history view/section.

Actions Taken may appear before communication if implementation ergonomics prove clearer, but the final UI must preserve explicit private/shared separation and avoid a mega-form.

### 7.1 Actions list

Default chronological order follows the backend `(createdAt,id)` contract. Each row/card shows:

- Action Date/Time;
- Action Status;
- Action Description;
- Result;
- Recorded by;
- Performed by;
- Assigned to;
- Follow-Up Required and Follow-up Note;
- Attachment Notes;
- cycle indicator when prior-cycle context is relevant;
- available action buttons based on authoritative state.

Desktop may use a readable table only if columns remain legible; otherwise use stacked cards/list rows. Tablet/mobile use reflowed cards with no page-level horizontal scrolling.

Pagination controls expose current page/total items and keep all Actions reachable.

### 7.2 Create mode

Editable:

- Action Description;
- Assignee (UI preselects current actor; server remains authority);
- Result (optional at create);
- Follow-Up Required;
- Follow-up Note;
- Attachment Notes.

Read-only/automatic context:

- Action Date/Time: generated after successful create.
- Recorded by: current authenticated actor after successful create, never editable.
- Performed by: `Not completed`/empty until completion; the backend sets it automatically to the authenticated actor who successfully completes the Action, and it is never editable.
- Ticket/owner context: read-only.

Behavior:

- `followUpRequired=true` reveals/marks Follow-up Note required.
- Field errors remain adjacent to their controls.
- Submit is duplicate-safe and preserves the logical request key during ambiguous retry.
- A successful create updates the Action list and authoritative Ticket version without wiping unrelated unsaved Ticket workflow drafts.

### 7.3 View/edit mode

`PENDING` / `IN_PROGRESS` current-cycle active-parent Action:

- approved content fields editable;
- eligible assignee editable;
- Start/Complete/Cancel controls shown only when valid.

`COMPLETED` current-cycle active-parent Action:

- status/provenance/assignee read-only;
- approved content/follow-up correction available with clear “correction is audited” guidance.

`CANCELLED`, old-cycle, or terminal-parent Action:

- read-only.

Revision/history access must not overwhelm the main list. An expandable `History` disclosure or dedicated nested history view is acceptable if keyboard accessible and pagination remains reachable.

### 7.4 Start / complete / cancel interactions

- Start is a deliberate action with current status context.
- Complete requires Result and explicit confirmation. On success, the authenticated completing actor becomes `Performed by` automatically. If follow-up remains required, completion may succeed but Ticket resolution stays blocked until follow-up is cleared/corrected according to the contract.
- Cancel requires explicit confirmation and 3-200 character reason.
- Confirmation includes Ticket Number, Action identity/description, current -> next Action status, and consequence.
- On stale `409`, retain draft/entered result/reason and show authoritative current state; do not silently resubmit.

### 7.5 Inactive/ineligible assignee

The assignee control loads eligible active Staff/Admin options. If an option becomes ineligible before save:

- backend rejection is authoritative;
- UI shows safe assignment-specific conflict guidance;
- draft remains intact;
- assignee options refresh;
- no owner/Action mutation is implied to have succeeded.

## 8. Actions Taken on Requester Ticket Detail

The owning Requester sees **all** Actions Taken for that Ticket, across statuses and cycles, in read-only mode.

Requester sees approved public fields:

- creation date/time;
- description;
- result;
- recorded by;
- performed by (`Not completed`/empty for non-completed Actions);
- assignee;
- follow-up flag/note;
- Attachment Notes;
- status;
- public revisions/history where exposed by the approved UI.

Requester never receives or sees:

- create/edit/assign/start/complete/cancel controls;
- Internal Notes or Internal Note metadata;
- session/authorization data;
- create fingerprint/idempotency internals;
- database/storage paths.

Foreign Requester/unavailable Ticket follows existing non-disclosing behavior.

## 9. Ticket workflow and resolution feedback

Existing Staff status controls remain the formal Ticket workflow interface.

- Show only backend-approved next transitions.
- Do not duplicate the transition matrix in a third independent client rule set. The client may use backend-provided permitted transitions/blocker summary for feedback.
- Resolve form includes Resolution Summary and confirmation.
- If resolution is blocked by current-cycle Actions, show a concise reason and link/scroll to Actions Taken rather than pretending the client can override it.
- Successful Ticket changes refresh Ticket summary/status, workflow history, and any affected Action list state.
- Cancellation confirmation warns that outstanding current-cycle Actions will be cancelled atomically.
- Reopen feedback makes the new work cycle visible enough to explain why old completed Actions cannot satisfy the new cycle.
- Requester `Problem Appears Resolved` retains its existing advisory wording and never appears as formal Resolve.

## 10. Draft lifetime and cross-form refresh safety

Ticket Detail contains multiple independently editable areas. A parent Ticket object refresh must not reset unrelated unsaved form data.

Selected draft-lifetime rules:

- Ticket identity change clears all Ticket-scoped drafts.
- Successful mutation clears only the draft owned by that completed mutation unless the server response makes the draft invalid.
- Action list refresh does not erase an unsaved Resolution Summary/cancel reason/owner selection.
- Owner/priority/status refresh does not erase an unsaved Action create/edit draft.
- Conflict reload retains the user's draft separately from authoritative server state until the user chooses discard/reapply.
- Logout/account change clears private drafts.

## 11. Existing Requester and Staff lists

### My Tickets

Retain existing search/category/requested-priority/current-status/sort/pagination behavior. Add explicit support for `statusGroup` and resolved date-window context only as specified in `api-spec.md`.

### Staff Queue

Retain existing shared filters/sort/pagination/owner behavior. Add the same approved status-group/date behavior where applicable. Existing queue context continues to round-trip through Ticket Detail.

No list screen derives Dashboard counts locally.

## 12. Administrator User Management extension

Retain the existing minimalist screen and safety feedback. Add only the behavior required by outstanding Action-assignee safety:

- deactivation/demotion rejection explains that outstanding assigned Actions must first be reassigned/completed/cancelled;
- no automatic silent reassignment;
- after user-data conflict, preserve safe edit input and refresh authoritative user/work assignment state deliberately.

No account-history UI is added by this contract.

## 13. Badges and labels

Retain existing text-bearing Ticket status, Requested Priority, IT Priority, role, and account-status badges.

Add Action status labels:

- Pending
- In Progress
- Completed
- Cancelled

Follow-up state must have readable text (`Follow-up required` / `No follow-up required`) in addition to any icon/color.

Owner, Action recorder, Action assignee, and actual performer labels must be explicitly named so users do not confuse the concepts.

## 14. Responsive and accessibility contract

Required evidence viewports inherited from Labs 2/3:

- Desktop: `1440x900`
- Tablet: `834x1112`
- Mobile: `390x844`

At all supported widths:

- no clipped labels/selected values;
- no overlapping feedback/actions;
- no hidden required actions;
- no unreadable long Ticket summaries, Action descriptions/results/follow-up notes/Attachment Notes/names/filenames;
- no unintended page-level horizontal scrolling;
- visible logical keyboard focus;
- all controls have accessible names/labels;
- field validation/help is associated with the control;
- status/priority/follow-up/read-only meaning is not color-only;
- confirmation interactions are keyboard operable;
- if a modal/dialog is used, focus entry/trap/return and accessible naming must be correct. Prefer inline confirmation when it avoids unnecessary accessibility complexity.

## 15. Evidence matrix

Planned major-screen evidence for final hardening, each at Desktop/Tablet/Mobile unless the final reviewed UI combines views without losing proof:

1. Requester Dashboard.
2. Staff Dashboard.
3. Administrator-reused Staff Dashboard.
4. Staff Ticket Detail - Actions list.
5. Staff Action create mode.
6. Staff Action edit/view mode.
7. Requester Ticket Detail - read-only Actions.
8. Staff Ticket workflow/history with resolution feedback.

Additional state evidence must cover meaningful zero/non-zero metrics, loading, forbidden, safe failure/retry, conditional follow-up validation, inactive-assignee rejection, stale conflict/draft retention, duplicate/replay safety, terminal read-only behavior, and resolution-gate blocking.

Screenshots are visual evidence only; database uniqueness, ownership isolation, exact metric correctness, concurrency, and authorization require executable/SQL evidence in `tests.md`.

## 16. Final visual inspection checklist

- [ ] One coherent Zen Green shell across retained/new screens.
- [ ] Dashboard cards are concise, aligned, readable, and keyboard actionable.
- [ ] Metric values are not visually confused with loading placeholders.
- [ ] Owner, Action recorder, Action assignee, actual performer, and later mutation actor are distinguishable.
- [ ] Editable/read-only fields are visually and semantically distinct.
- [ ] Public Comments, Internal Notes, and Actions Taken are not visually conflated.
- [ ] Follow-up required/optional state and validation are clear.
- [ ] Action terminal/old-cycle states expose no mutation affordance.
- [ ] Resolution blockers explain the next safe action without bypass controls.
- [ ] Desktop/tablet/mobile contain no clipping, overlap, unintended horizontal page scroll, or inaccessible hidden action.
- [ ] Long content wraps without destroying scanability.
- [ ] Visible focus and keyboard order are logical.
- [ ] Validation and safe failures appear close to the affected control/context.
- [ ] No placeholder text, broken link, raw exception, console error, or stale test-only control remains in final evidence.
