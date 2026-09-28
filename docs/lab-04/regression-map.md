# Lab 4 Retained Regression Map

Status: **Issue #71 planning document. Retained Lab 3 evidence remains historical; Lab 4 regression results are not yet claimed.**

This map records what Lab 4 intentionally evolves versus what must remain protected. Current runtime tests may be updated when an approved Lab 4 behavior changes, but historical `docs/lab-03/**`, historical migrations, PR/review records, and evidence are not rewritten to make Lab 4 appear to have existed earlier.

## 1. Regression principles

- Preserve the delivered Labs 1-3 user value unless the Lab 4 handout explicitly evolves it.
- Change current tests only when the approved Lab 4 contract changes current behavior; preserve the original invariant being tested.
- Do not satisfy regression by deleting security assertions, adding blanket `.skip`, shrinking suite discovery, accepting every snapshot, or rewriting historical evidence.
- Every current test change must name the Lab 4 rule that justifies it.
- Backend authorization remains authoritative in all retained flows.

## 2. Retained / evolved behavior matrix

| Area | Delivered behavior to retain | Legitimate Lab 4 evolution | Planned regression owner |
|---|---|---|---|
| Health/reference data | Existing health and active Category/Related System behavior | None required by Lab 4 | REG-04 / E2E-04 |
| Authentication | Email/password login, safe invalid/inactive behavior, server session | Dashboard becomes post-login role home | REG-01 / SEC-01 / E2E-04 |
| Mandatory password change | Normal application blocked until valid change | Dashboard must remain behind same gate | REG-01 / UI-07 |
| Session/logout/revocation | Idle/absolute session policy, logout, authVersion revocation | New Dashboard/Action endpoints use same session authority | REG-01 / SEC-01 |
| CSRF/Origin | Unsafe requests require retained protection | All new Action mutations use same protection | API-02 / SEC-01 |
| Requester ownership | Session-derived actor; foreign Ticket/Attachment non-disclosure | Dashboard/Actions extend ownership scope without weakening it | API-02 / DASH-01 / SEC-01 |
| Create Ticket | Validation, server Ticket Number, idempotent create, safe retry | None | REG-02 / E2E-04 |
| My Tickets | Search/filter/sort/paging/status support | Add explicit `statusGroup` + resolved window for Dashboard drill-down | DASH-04 / UI-07 / REG-02 |
| Requester Ticket Detail | Owned read-only Ticket fields + Attachments + Public Comments/advisory | Add read-only all-cycle Actions and public workflow history | UI-02 / E2E-01 |
| Attachments | MIME/signature/size/five-active/private storage/soft removal/compensation | Staff download failure UX may be hardened; no new Action upload store | REG-02 / SAFE-01 |
| Staff Queue | Shared operational filters, owner/status/priority/sort/page | Add explicit `statusGroup` and supported Dashboard drill-down context | DASH-04 / UI-07 |
| Staff Ticket Detail | owner, IT Priority, status controls, Attachments, Comments, Notes | Add Actions and final resolution gate/history | FLOW-01..05 / UI-01..04 |
| Ticket status matrix | Eight statuses and Lab 3 edge set | Resolve gains current-cycle Action gate; reopen gains workflow cycle; cancellation fans out outstanding Actions | FLOW-01..05 / E2E-02 |
| Requester advisory | Timestamp/advisory only, no formal status change | Remains advisory and cannot bypass Action gate | FLOW-03 / E2E-02 |
| Public Comments | Shared append-only plain-text communication | No replacement by Actions | REG-03 / SEC-01 |
| Internal Notes | Staff/Admin private append-only notes; no Requester metadata | Remain private while Actions are public to owner | API-02 / UI-02 / SEC-01 |
| User Management | Admin create/edit/role/activation/password reset + owner/self/last-admin safety | Add outstanding Action-assignee deactivation/demotion safety | RACE-02 / REG-03 |
| Role navigation | Requester/Staff/Admin permitted routes | Dashboard becomes role home; prior permitted screens remain reachable | UI-07 / REG-01 |
| Zen Green | Established tokens/forms/tables/cards/states/responsive/a11y | Dashboard/Action screens reuse same system | STYLE-01 / A11Y-01 / RESP-01..03 |
| Migration | Forward data-preserving Lab 3 history | Add forward Lab 4 structures only | MIG-01..03 |
| Seed | Repeat-safe identity/workflow fixtures | Add isolated Lab 4 Action/dashboard fixtures without resetting old state | SEED-01 |
| Evidence harness | Existing Lab 2/3 suites and frozen artifact history | Add Lab 4 discovery/output roots; do not rewrite Lab 3 evidence | HAR-01..03 / TRACE-01 |

## 3. Expected current-test updates

These are not permission to weaken coverage.

### Role-home tests

Old expectations that a Requester lands directly on My Tickets, Staff on Queue, or Administrator on User Management may change to the approved Dashboard routes. Tests must still verify authentication bootstrap, mandatory password gate, wrong-role denial, Logout, and reachability of the original permitted screens.

### Ticket resolution tests

Existing Lab 3 successful Resolve fixtures must add qualifying current-cycle Action data once Lab 4 is active. The old matrix, owner, Resolution Summary, confirmation, stale-version, and direct-request security assertions remain. New negative cases prove the Action gate.

### Ticket Detail transport/component tests

DTO fixtures may gain Action/history/permitted-transition context. Existing ownership, resolution/advisory, Attachment, Public Comment, Internal Note, and safe-error projections remain asserted.

### Administrator eligibility tests

Existing self-deactivation, last-active-Administrator, primary-Ticket-owner, duplicate-email, stale-version, and session-revocation checks remain. Add outstanding Action-assignee cases and both assignment/deactivation race orders.

### Query tests

Add only `statusGroup`, `resolvedFrom`, and `resolvedBefore` semantics documented in `api-spec.md`. Existing search/category/priority/owner/sort/page defaults, deterministic tie-breaks, unknown/repeated query rejection, and Requester ownership remain.

### Migration/seed tests

Add new forward migration/schema/fixture cleanup order while preserving all historical migration files, populated-upgrade assertions, repeat safety, and credential/history preservation.

### Browser/evidence helpers

Lab 4 output must use new artifact roots. Old Lab 3 screenshot counts/paths are historical and cannot be overwritten by a normal Lab 4 run.

## 4. Minimum final regression evidence

- Full current server suite on the Lab 4 release candidate and exact final `main`.
- Full current client suite on the same source states.
- Required current browser/E2E suite including retained role flows.
- Migration/seed/recovery verification on isolated data.
- Authentication/authorization direct-request matrix.
- Representative final browser journey for each role.
- Visual inspection of retained screens most likely to regress from new shell/navigation/Ticket Detail changes.

Actual commands/counts/source SHAs are recorded in `tests.md` and `release-checklist.md` only after execution.
