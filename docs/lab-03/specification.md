# Lab 3 Sprint Engineering Specification

Status: **Revised after peer Changes Requested; awaiting re-review.** This is the Issue #41 engineering contract. Product implementation, migration execution, and Lab 3 product-test results are not claimed here.

Primary source: `Lab_3_sheet.pdf`. This contract extends the delivered Lab 2 product and preserves still-valid Lab 2 behavior unless a Lab 3 requirement explicitly changes it.

## 1. Sprint Goal

Evolve the existing TokTickIT Requester application into an authenticated, role-authorized service desk without discarding the Lab 2 Ticket or Attachment increment. By the end of Lab 3, Requesters use their authenticated identity, IT Staff can operate a shared Ticket Queue and Ticket workflow, and Administrators can perform the required minimalist user-management functions. Every protected operation is enforced by the backend and is supported by traceable tests and review evidence.

## 2. Stakeholder Request

The temporary Development Requester selector must be replaced by secure email/password login. Existing Requester Ticket and Attachment functions must continue to work, but ownership must come from the authenticated account rather than a client-supplied requester ID. IT Staff need a shared queue, operational Ticket Detail, ownership, IT Priority, permitted status changes, Public Comments, and Internal Notes. Requesters may post Public Comments and indicate that a problem appears resolved, but may not formally resolve or close a Ticket. Administrators need a deliberately simple User Management screen for account creation, basic editing, one-role assignment, activation/deactivation, and setting a new initial password.

## 3. Scope

### Included

- Email/password authentication, current-user retrieval, logout, and mandatory first-login password change.
- Server-side authorization for Requester, IT Staff, and Administrator.
- Migration of Lab 2 Development Requesters into the real User model while preserving existing IDs, Ticket ownership, Attachments, Categories, and Related Systems.
- Continued Create Ticket, My Tickets, Requester Ticket Detail, and Attachment behavior using authenticated identity.
- Eight required Ticket statuses: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, and Cancelled.
- One optional primary Ticket Owner; Requested Priority remains Requester input; IT Priority becomes the operational priority.
- IT Staff Ticket Queue with search, filters, sorting, pagination, ownership, priority, status, and open-detail action.
- IT Staff Ticket Detail with claim/reassign, IT Priority, permitted status transitions, Public Comments, Internal Notes, and existing Attachments.
- Requester Public Comments and `Problem Appears Resolved` indication.
- Minimal Administrator User Management: list, name/email search, optional role filter, create, edit name/email/role/activation, and set new initial password.
- Zen Green UI continuity, role-specific navigation, loading/validation/success/empty/no-results/forbidden/not-found/conflict/failure states, responsive desktop/tablet/mobile behavior, and accessibility expectations inherited from Lab 2.
- Data-preserving migration, documented initial-password provisioning for migrated Requesters, idempotent seed/provisioning behavior, regression verification, and final-main evidence.

### Explicitly excluded

- Email invitations, password-reset email delivery, MFA, social login, SSO, and self-registration.
- Actions Taken.
- SLA calculations, escalation rules, notification services, KPI/analytics dashboards, and cloud/deployment changes.
- Multiple roles per user.
- User deletion, bulk user operations, import/export, role/account-history screens, departments, organizations, profile photos, and advanced identity-management workflows.
- Mandatory pagination, multi-column sorting, or multiple simultaneous filters on the Administrator user list.
- Any Lab 4 Actions Taken completion rule.

## 4. Functional Requirements

- **FR-01 — Authenticate user:** The system shall authenticate an active User using canonical email lookup and a valid password without exposing password or account secrets.
- **FR-02 — Enforce initial-password change:** The system shall prevent a User marked `mustChangePassword` from entering or using normal application capabilities until a valid new password is saved.
- **FR-03 — Provide authenticated identity:** The backend shall derive the current User from the authenticated session and expose only a safe current-user projection.
- **FR-04 — Logout:** The system shall invalidate authenticated access on logout so protected APIs cannot be reused with the old session.
- **FR-05 — Enforce authorization:** Every protected backend operation shall enforce role and resource scope independently of visible/hidden UI controls.
- **FR-06 — Continue Requester Ticket creation:** An authenticated Requester shall create Tickets using the retained Lab 2 Ticket validation, official Ticket Number, and duplicate-submission behavior.
- **FR-07 — Continue My Tickets:** An authenticated Requester shall search, filter, sort, paginate, and view only their own Tickets.
- **FR-08 — Continue Requester Ticket Detail and Attachments:** An authenticated Requester shall view their own Ticket Detail and use the retained permitted Attachment lifecycle.
- **FR-09 — Remove development identity:** The normal Lab 3 application shall not expose Development Requester selection, Change Requester, or a client-controlled requester identity mechanism after the authentication activation increment.
- **FR-10 — Support all required Ticket statuses:** Ticket list/detail/API projections and filters shall support all eight Lab 3 statuses without rejecting valid records.
- **FR-11 — Provide Staff Ticket Queue:** IT Staff shall retrieve shared Ticket work with documented search, filter, sorting, pagination, owner, status, and priority information.
- **FR-12 — Provide Staff Ticket Detail:** IT Staff shall open a permitted Ticket Detail with operational fields and existing Attachment information.
- **FR-13 — Claim and reassign ownership:** Authorized staff shall claim an unassigned Ticket or reassign its one primary owner to an eligible active account.
- **FR-14 — Set IT Priority:** Authorized staff shall change IT Priority independently of Requested Priority.
- **FR-15 — Change Ticket status:** Authorized staff shall perform only documented status transitions and required confirmations/validation.
- **FR-16 — Public Comments:** An owning Requester and authorized staff shall read and append Public Comments on a permitted Ticket.
- **FR-17 — Internal Notes:** Authorized IT Staff and Administrator shall read and append Internal Notes; Requesters shall receive no Internal Note content or private-note metadata.
- **FR-18 — Requester resolution indication:** The owning Requester shall be able to indicate that the problem appears resolved without changing the formal Ticket status to Resolved or Closed.
- **FR-19 — List and search users:** An Administrator shall view a safe user list, search by name/email, and optionally filter by one role.
- **FR-20 — Create user:** An Administrator shall create a User with name, canonical email, exactly one permitted role, activation state, and initial password.
- **FR-21 — Edit user:** An Administrator shall edit name, email, role, and activation state subject to Administrator safety rules.
- **FR-22 — Set new initial password:** An Administrator shall set a new initial password that forces password change at the next login and invalidates prior authenticated access.
- **FR-23 — Preserve data through migration:** The Lab 3 data increment shall preserve existing Lab 2 Requesters, Ticket IDs/relationships/content, Attachment metadata/bytes, Categories, and Related Systems.
- **FR-24 — Preserve Zen Green and responsive behavior:** New and retained screens shall use one coherent Zen Green application shell and remain usable at desktop, tablet, and mobile evidence viewports.
- **FR-25 — Produce traceable evidence:** Every Acceptance Criterion shall map to at least one planned automated test and final completion shall rely on fresh evidence from the delivered `main` branch.

## 5. Business Rules

The first five rules preserve the mandatory meanings from the Lab 3 handout.

- **BR-01:** Only an active User with valid credentials may authenticate.
- **BR-02:** A User marked `mustChangePassword` cannot enter or use the normal application until a valid new password is saved.
- **BR-03:** Authenticated User identity, not any `requesterId` or legacy Requester header supplied by the client, determines Requester ownership.
- **BR-04:** Public Comments are visible to the owning Requester and authorized staff roles. Internal Notes are visible only to IT Staff and Administrator.
- **BR-05:** A Requester may indicate that a problem appears resolved but cannot formally set the Ticket to Resolved or Closed.
- **BR-06:** One User has exactly one Lab 3 role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`.
- **BR-07:** Email identity is canonicalized by trimming surrounding whitespace and lowercasing for lookup/uniqueness. Canonical collisions block migration or mutation; accounts are never silently merged.
- **BR-08:** Passwords are never stored in plaintext. The selected project implementation uses salted Argon2id hashing. Password values are never trimmed or normalized before verification/storage.
- **BR-09:** A new password must contain 15–128 Unicode code points, match confirmation, and differ from the current password. These lengths are a project decision, not a lecturer-provided constant.
- **BR-10:** Unknown email, incorrect password, and an unprovisioned migrated account share generic invalid-credential feedback. An inactive account may receive safe inactive guidance only after the supplied credential is otherwise valid.
- **BR-11:** Normal protected capabilities require a valid active session, current account state, matching authorization state, and completed mandatory password change.
- **BR-12:** The selected implementation uses a server-side PostgreSQL session with an HttpOnly cookie; authentication secrets, session identifiers, hashes, and signing material are never serialized in User DTOs.
- **BR-13:** The selected session policy uses a 10-minute pre-auth session, 30-minute authenticated idle timeout, and 8-hour absolute lifetime. These values are project decisions and are tested as such.
- **BR-14:** Logout invalidates the server-side session. Password reset, role/email change, and deactivation invalidate existing authenticated access through an account authorization version.
- **BR-15:** Unsafe state-changing requests use the selected CSRF-token plus allowed-Origin policy in addition to SameSite cookie protection. Authentication and authorization are checked before mutation.
- **BR-16:** The selected failed-login policy limits repeated attempts per canonical email/IP and per IP. Exact thresholds are implementation decisions documented in `api-spec.md` and tested.
- **BR-17:** Requester ownership remains the submitter relationship and does not change when a Ticket is assigned to staff.
- **BR-18:** Each Ticket may have zero or one primary Ticket Owner. An eligible owner is an active IT Staff or Administrator account because the Lab 3 handout explicitly permits either in Ticket ownership rules.
- **BR-19:** Requested Priority remains the value supplied by the Requester. IT Priority is initialized by copying Requested Priority once and may later be changed only by authorized IT Staff/Administrator operations.
- **BR-20:** Existing Lab 2 Ticket creation validation, official Ticket Number uniqueness, `clientRequestId` idempotency, query behavior, safe failures, and Attachment constraints remain in force unless this contract explicitly changes them.
- **BR-21:** Replaying an existing Ticket creation request never resets current owner, IT Priority, Current Status, or later operational timestamps.
- **BR-22:** Required Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-23:** Same-state status requests are invalid. Only the transition matrix in this specification is permitted.
- **BR-24:** A non-Cancelled operational destination requires an active eligible Ticket Owner. Claim changes owner only; it does not silently change status.
- **BR-25:** Resolve requires a trimmed Resolution Summary of 10–2000 code points. Cancel requires a trimmed reason of 3–200 code points. Resolve, Close, Reopen, and Cancel require explicit confirmation.
- **BR-26:** Reopening clears the current-cycle Resolution Summary, resolved/closed timestamps, and Requester resolution indication while preserving append-only communication history.
- **BR-27:** Public Comments and Internal Notes are separate append-only plain-text records. Each body is trimmed and must contain 1–2000 Unicode code points. Backend supplies author and creation time; client-supplied author/time are not authoritative.
- **BR-28:** Requester responses never contain Internal Note text, count, author, IDs, or nested private objects that reveal note existence.
- **BR-29:** `Problem Appears Resolved` records a server timestamp only. It does not set formal status or Resolution Summary. A repeated indication is harmless; reopening clears the current-cycle indication.
- **BR-30:** Administrator User Management uses deactivation rather than deletion.
- **BR-31:** Duplicate canonical email addresses and invalid/multiple roles are rejected.
- **BR-32:** An Administrator cannot deactivate their own account and the system cannot deactivate/demote the last active Administrator.
- **BR-33:** A User who is still the primary owner of any Ticket must be reassigned before deactivation or demotion to Requester. This is a project safety decision and must be enforced atomically with the same account/assignment locking policy.
- **BR-34:** Administrator password reset stores only a hash, sets `mustChangePassword`, invalidates prior authenticated access, and never returns an existing password/hash.
- **BR-35:** Backend authorization is authoritative. Role-specific navigation and disabled/hidden controls are feedback only.
- **BR-36:** Missing or foreign protected Ticket/Attachment resources use non-disclosing resource responses after authentication. Forbidden role capability is rejected without protected-resource detail.
- **BR-37:** Public Comments/Internal Notes are rendered as text, never trusted HTML.
- **BR-38:** Existing Attachment rules remain: JPG/JPEG/PNG/WEBP/PDF, 1–5,242,880 bytes inclusive, maximum five active Attachments, private generated storage names, signature validation, soft removal, retained removed metadata, removed download denial, and safe compensation.
- **BR-39:** Authentication/authorization/CSRF/resource checks must occur before an unauthorized multipart upload can be staged or persisted.
- **BR-40:** Tests use a distinct approved test database and temporary upload roots and never silently fall back to development data.

### Authorization Matrix

`Allow` always means the backend still checks the resource/state preconditions in the Business Rules.

| Operation | Requester | IT Staff | Administrator | Resource / state rule |
|---|---|---|---|---|
| Login / current user / own password change / logout | Allow | Allow | Allow | Own authenticated account only |
| Create Ticket / My Tickets | Allow | Deny | Deny | Requester uses own authenticated identity |
| Requester Ticket Detail | Allow | Deny via Requester route | Deny via Requester route | Own submitted Ticket only |
| Requester Attachment upload/remove | Allow | Deny | Deny | Own Ticket; retained Lab 2 rules |
| Attachment metadata/download | Allow | Allow | Allow | Requester own Ticket; Staff/Admin permitted Ticket |
| Shared Staff Queue / Staff Detail | Deny | Allow | Allow | Administrator permission is explicitly granted by this matrix |
| Claim / reassign owner | Deny | Allow | Allow | Active eligible owner; version/state rules |
| Update IT Priority | Deny | Allow | Allow | Not Closed/Cancelled |
| Formal status transition | Deny | Allow | Allow | Transition matrix + confirmations/fields |
| Public Comment | Allow | Allow | Allow | Requester only on own Ticket; staff on permitted Ticket |
| Internal Note | Deny | Allow | Allow | Never exposed through Requester projection |
| Problem Appears Resolved | Allow | Deny | Deny | Own Ticket; allowed Requester states only |
| User list/search/create/edit/reset | Deny | Deny | Allow | Password-change-complete Administrator only |

### Status-Transition Matrix

This exact edge set is a project decision required to resolve the handout's instruction to define a matrix.

| Current | Permitted next |
|---|---|
| `NEW` | `OPEN`, `CANCELLED` |
| `OPEN` | `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED` |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` |
| `RESOLVED` | `CLOSED`, `REOPENED` |
| `CLOSED` | `REOPENED` |
| `REOPENED` | `OPEN`, `IN_PROGRESS`, `CANCELLED` |
| `CANCELLED` | none |

## 6. UI Specification Summary

The detailed UI contract is in `ui-spec.md`.

- Reuse the Lab 2 Zen Green design tokens, form conventions, badges, cards, validation placement, focus behavior, and responsive breakpoints.
- Replace Development Requester identity and Change Requester with authenticated User name/role and Logout.
- Primary route destinations are Login, Change Password, Requester My Tickets/Create/Detail, Staff Queue/Detail, Administrator Users, Access Denied, and Not Found.
- The selected routing approach is a small typed hash-route map; this is a project choice, not a handout requirement.
- The first integrated state that enforces authenticated Requester APIs must also provide a usable Login/mandatory-change/authenticated-client path. There is no accepted state in which authentication is considered activated while the normal UI can only use the legacy Requester header.
- Staff Ticket Detail visually separates Public Comments from Internal Notes to reduce accidental disclosure.
- User Management remains intentionally simple and does not add excluded advanced identity features.
- Required evidence viewports remain Desktop `1440×900`, Tablet `834×1112`, Mobile `390×844` to preserve the established Lab 2 evidence convention.

## 7. Data Changes

The implementation uses forward migrations and preserves previously applied Lab 2 migrations. Exact Prisma naming may vary only where the physical-table mapping below is preserved; observable relationships and constraints are contract requirements.

### 7.1 User / existing `RequesterUser` table

Prisma model `User` maps to the existing physical PostgreSQL table `RequesterUser` so current IDs and Ticket requester FKs do not change.

| Field | Planned type / constraint | Migration rule |
|---|---|---|
| `id` | `Int`, existing PK | Preserve existing values |
| `name` | `String` | Preserve existing value; Administrator may later edit |
| `email` | canonical `String`, unique | Preflight canonical collisions before canonicalization; abort rather than merge |
| `active` | `Boolean` | Preserve existing activation state |
| `role` | enum `REQUESTER|IT_STAFF|ADMINISTRATOR` | Existing rows backfill `REQUESTER` |
| `passwordHash` | nullable `String` | Existing rows start null until explicit local provisioning; never plaintext |
| `mustChangePassword` | `Boolean` | Existing/migrated provisioned accounts remain true until first valid change |
| `authVersion` | positive `Int` default 1 | Increment on credential reset, role/email change, or deactivation to revoke stale sessions |
| `version` | positive `Int` default 1 | Optimistic edit/version conflict detection |
| `createdAt`, `updatedAt` | existing timestamps | Preserve/continue current behavior |

Relationships:

- submitted Tickets: existing `Ticket.requesterId -> User.id` (`onDelete: Restrict`);
- owned Tickets: new nullable `Ticket.ownerId -> User.id` (`onDelete: Restrict`);
- authored Public Comments and Internal Notes: `authorId -> User.id` (`onDelete: Restrict`).

Indexes/constraints:

- unique canonical `email`;
- index supporting active role/user selection, e.g. `(active, role, name, id)`;
- no user-delete cascade is introduced.

### 7.2 Ticket

Existing Ticket ID, Ticket Number, client request ID, requester/category/system relationships, Summary, Description, Requested Priority, and timestamps remain.

New/changed fields:

| Field | Planned type / constraint | Rule |
|---|---|---|
| `ownerId` | nullable `Int` FK to User | zero/one primary owner; eligible active IT Staff/Admin |
| `itPriority` | priority enum | backfill exactly once from `requestedPriority` |
| `currentStatus` | eight-value enum | existing rows remain `NEW` |
| `version` | positive `Int` default 1 | optimistic workflow/ownership conflict detection |
| `resolutionSummary` | nullable `String` | required only on transition to Resolved; 10–2000 trimmed code points |
| `resolvedAt` | nullable timestamp | backend-managed |
| `closedAt` | nullable timestamp | backend-managed |
| `cancelReason` | nullable `String` | required only on Cancel; 3–200 trimmed code points |
| `cancelledAt` | nullable timestamp | backend-managed |
| `requesterResolutionIndicatedAt` | nullable timestamp | backend-managed; no formal status change |

Required operational indexes include owner/status/update lookup and status/IT-Priority/update lookup in addition to retained requester/query indexes. Exact index order may be tuned only if query behavior remains identical and migration tests prove no data loss.

### 7.3 PublicComment

- `id`: integer PK.
- `ticketId`: required FK to Ticket, `onDelete: Restrict`.
- `authorId`: required FK to User, `onDelete: Restrict`.
- `body`: plain text, trimmed 1–2000 Unicode code points.
- `createdAt`: backend-created timestamp.
- append-only in Lab 3; no update/delete endpoint.
- deterministic index/order support: `(ticketId, createdAt, id)`; author lookup index where needed.

### 7.4 InternalNote

Same structural fields/index/order as PublicComment, but available only to IT Staff/Administrator projections and endpoints. Requester DTOs/errors must not expose note text, IDs, authors, counts, or note-existence metadata.

### 7.5 PostgreSQL session store

The selected `express-session` PostgreSQL adapter uses a migration-owned session table rather than runtime table creation.

| Field | Type / constraint | Purpose |
|---|---|---|
| `sid` | opaque string PK | session-store key; sensitive; never serialized/logged |
| `sess` | JSONB | adapter session payload |
| `expire` | timestamp with time zone | store expiry/cleanup |

Required index: `expire`.

The serialized payload may contain nullable authenticated `userId`, `authVersion` snapshot, session-bound CSRF state, cookie metadata, and absolute-expiry state. It must not contain plaintext passwords or password hashes. Protected requests re-read current User authorization state rather than trusting stale session role/activation alone.

### 7.6 Forward-migration and provisioning sequence

1. **Preflight/recovery:** before touching development data, create and verify a private backup/recovery path; rehearse the populated upgrade in the isolated test environment.
2. **Canonical-email preflight:** compute the selected trim/lowercase canonical form for every existing Requester email. Any collision aborts before mutation; accounts are never silently merged.
3. **Expand in place:** map Prisma `User` to physical `RequesterUser`; add role/credential/version fields; add Ticket workflow/owner/IT-Priority fields; add comment/note/session tables; extend Ticket status enum. Do not drop/recreate Lab 2 Ticket/Attachment tables.
4. **Backfill:** existing Users -> `role=REQUESTER`; preserve `active`; existing Tickets keep requester IDs/FKs and `NEW`; `itPriority=requestedPriority`; new edit/auth versions receive initial values.
5. **Unprovisioned migrated state:** existing Requesters have `passwordHash=null` and `mustChangePassword=true` until explicit local provisioning. This state cannot authenticate.
6. **Local initial-password provisioning:** a local-only command selects migrated Requesters with null `passwordHash`, generates a cryptographically random one-time initial password per account, stores only its Argon2id hash, keeps `mustChangePassword=true`, and prints the email + one-time password once to the local terminal. It is not automatic server startup behavior and does not write plaintext credentials to the repository/database.
7. **Repeat safety:** rerunning provisioning skips accounts that already have a hash and therefore does not reset edited passwords, roles, activation, auth versions, or Ticket workflow. Later intentional resets use the Administrator initial-password action.
8. **Seed:** idempotently provide at least 4 active + 1 inactive Requester, 3 active + 1 inactive IT Staff, and 1 active Administrator, plus realistic Tickets across statuses/priorities/ownership and safe example Public Comments/Internal Notes. Seed credentials are fictional local-development credentials only and are clearly documented as such; no real personal password/secret is committed.
9. **Integration gate:** when #43 first exposes non-`NEW` records, the same integrated change supplies the minimum backend/client DTO/query/display compatibility needed to read them. Before #45 activation, any remaining temporary selector lists only role `REQUESTER` accounts.

Destructive reset, `db push` used as an upgrade substitute, silent account merging, or a migration that rewrites existing Ticket requester identity is not an accepted Lab 2 -> Lab 3 upgrade.

## 8. API Contract

The exact endpoint/request/response/error/status contract is in `api-spec.md`. Endpoint families are:

- `GET /api/auth/csrf`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/logout`
- Existing `/api/tickets` and nested Attachment endpoints, changed to session-derived Requester identity.
- `GET /api/staff/tickets`
- `GET /api/staff/tickets/:id`
- `GET /api/staff/assignees`
- `POST /api/staff/tickets/:id/claim`
- `PATCH /api/staff/tickets/:id/owner`
- `PATCH /api/staff/tickets/:id/priority`
- `POST /api/staff/tickets/:id/status`
- `GET/POST /api/tickets/:id/comments`
- `GET/POST /api/staff/tickets/:id/internal-notes`
- `POST /api/tickets/:id/resolution-indication`
- `GET/POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/initial-password`

The common HTTP/error families are `400` invalid input, `401` unauthenticated/invalid credentials, `403` authenticated policy/role/CSRF/password-change denial, `404` missing/non-disclosable protected resource, `409` state/version/identity/assignment conflict, retained `413/415` Attachment errors, `429` login throttling, and safe `500` unexpected failure. `api-spec.md` defines which families apply to each endpoint and the exact safe response DTOs.

## 9. Acceptance Criteria

- **AC-01 — Valid login:** Given an active User with valid credentials, login establishes authenticated access and returns only safe current-user identity/role data.
- **AC-02 — Mandatory password change:** Given a User with an initial password, normal application APIs/screens remain unavailable until a valid password change succeeds.
- **AC-03 — Client identity spoofing resistance:** Given an authenticated Requester, a supplied legacy Requester header/body ID cannot change backend ownership or reveal another Requester's data.
- **AC-04 — Internal Note denial:** Given a Requester, a direct Internal Note request is forbidden/non-disclosing and no Internal Note content or metadata is returned.
- **AC-05 — Inactive/invalid credential safety:** Wrong, unknown, inactive, and unprovisioned credential cases fail safely without exposing password/hash/role details.
- **AC-06 — Session lifecycle:** Logout, expiration, password reset, role/email change, and deactivation remove or invalidate prior protected access as specified.
- **AC-07 — CSRF/origin enforcement:** Unsafe authenticated mutations without the approved CSRF/Origin conditions change no data.
- **AC-08 — Authenticated Requester continuation:** All retained Lab 2 Ticket/Attachment capabilities work using authenticated Requester identity with no Development Requester selector.
- **AC-09 — Requester isolation:** Requester A cannot list, view, mutate, download, remove, comment on, or otherwise infer protected Ticket/Attachment data owned by Requester B through Requester routes.
- **AC-10 — Ticket creation continuity:** Existing validation, unique Ticket Number, `clientRequestId` replay/conflict/concurrency, and ambiguous-outcome behavior remain correct; replay never resets operational state.
- **AC-11 — Attachment continuity:** Retained file type/signature/size/five-active/private-storage/soft-removal/compensation rules remain correct under authentication.
- **AC-12 — Eight-status compatibility:** Existing `NEW` Tickets and Tickets in each additional required status are accepted by API projections, client runtime validation, filters, badges, and Detail views.
- **AC-13 — Queue query behavior:** Authorized Staff/Admin can search/filter/sort/page the shared queue according to the documented contract; Requester direct access is denied.
- **AC-14 — Queue states/responsive behavior:** Loading, Empty, No Results, Failure, Forbidden, pagination, and desktop/tablet/mobile representations are meaningful and usable.
- **AC-15 — Ownership operations:** Claim/reassign maintains exactly one eligible primary owner and concurrent/stale operations cannot silently overwrite another successful mutation.
- **AC-16 — IT Priority:** IT Priority can be changed only by authorized staff operations, remains distinct from Requested Priority, and invalid/stale operations change nothing.
- **AC-17 — Status matrix:** Every permitted edge succeeds only with required role/state/confirmation/text; every other source/destination pair is rejected without partial mutation.
- **AC-18 — Formal resolution boundary:** Requester cannot formally set Resolved/Closed; authorized staff can resolve/close only through the transition contract.
- **AC-19 — Public Comments:** Authorized Ticket participants can append/read Public Comments with authentic backend author/time and deterministic ordering.
- **AC-20 — Internal Note privacy:** Staff/Admin can append/read Internal Notes while every Requester projection/error remains free of private note data.
- **AC-21 — Resolution indication:** Owning Requester can indicate that the problem appears resolved in documented states without formal status change; repeat and reopen behavior match the contract.
- **AC-22 — User list/search/filter:** Administrator can view the safe User list, search name/email, optionally filter by role, and non-Administrators are denied through direct API.
- **AC-23 — User create/edit:** Administrator can create/edit only the permitted account fields; exactly one valid role and canonical unique email are enforced.
- **AC-24 — Administrator safety:** Self-deactivation and removal/deactivation/demotion of the last active Administrator are prevented without partial mutation, including concurrent requests.
- **AC-25 — Assigned-owner account safety:** Deactivation/demotion cannot leave an ineligible account as primary Ticket Owner; assignment/account races preserve the invariant.
- **AC-26 — Initial-password reset:** Administrator reset stores no plaintext password, forces next-login password change, and invalidates old password/session access.
- **AC-27 — Data-preserving migration:** Populated Lab 2 Requesters/Tickets/Attachments/Categories/Related Systems preserve required IDs, relationships, content, and file bytes after the forward migration, and migrated Requesters enter the documented safe provisioning flow.
- **AC-28 — Repeat-safe seed/provisioning:** Repeated seed/provisioning creates no duplicate required fixtures and does not reset existing edited passwords/roles/activation/workflow state.
- **AC-29 — Safe errors:** Representative authentication, database, storage, and session-store failures expose no SQL, Prisma, stack, filesystem path, password/hash, session, or secret material.
- **AC-30 — Zen Green and accessibility:** Major Lab 3 screens preserve the documented design tokens, editable/read-only states, labels, keyboard focus, non-color meaning, and no unintended clipping/overlap/horizontal overflow at required viewports.
- **AC-31 — Traceability:** Every AC maps to at least one planned test path before implementation and later to actual executed evidence; `Planned/Not run` is never reported as Pass.
- **AC-32 — Final-main completion:** Product completion is not claimed until the exact delivered `main` SHA has fresh required test/build/migration/regression/E2E evidence and real peer-review evidence.

## 10. Product Definition of Done

Product completion requires all of the following:

- All FR/BR/AC in the approved contract are implemented or explicitly unresolved as release blockers.
- Authentication, first-login password change, session lifecycle, and backend authorization satisfy their tests.
- Development Requester selection/header identity is absent from the active authenticated application after the #45 activation increment.
- Existing Requester Ticket/Attachment behavior remains working under authenticated identity.
- Staff Queue/Detail, ownership, IT Priority, status workflow, Public Comments, Internal Notes, and Requester resolution indication satisfy the contract.
- Minimalist Administrator User Management and its safety rules satisfy the contract.
- Populated migration, existing-Requester initial-password provisioning, and repeat-safe seed/provisioning evidence preserve existing data.
- Current server/client builds and all required unit/API/integration/UI/style/security/regression/responsive/E2E tests pass in the approved test environment.
- Required desktop/tablet/mobile evidence is generated from the actual app and manually inspected against `ui-spec.md`.
- `specification.md`, `tests.md`, `api-spec.md`, `ui-spec.md`, `reviewer.md`, and `ai-use.md` truthfully reflect implemented behavior and evidence.
- Feature work uses the Lab 3 branch/PR/staged-integration workflow; peer review is real and recorded.
- No secret, real password, `.env`, live upload, private backup, transient report, or fabricated review/test result is committed.
- The final release is freshly verified on the exact merged `main` SHA.

## 11. Assumptions and Decisions

The following are engineering decisions made to remove ambiguity. They are not claims that the handout mandated these exact values or libraries.

- Use Argon2id for password hashing.
- Use `express-session` with a migration-owned PostgreSQL session store and HttpOnly/SameSite cookie rather than a browser-stored JWT.
- Use CSRF token plus allowed-Origin validation for unsafe requests.
- Use password length 15–128 Unicode code points and preserve exact password characters.
- Use pre-auth 10-minute, authenticated idle 30-minute, and absolute 8-hour session limits.
- Use bounded local-lab login throttling; implementation constants are specified in `api-spec.md`.
- Map Prisma `User` to the existing physical `RequesterUser` table to preserve IDs and relationships.
- Migrate existing Requesters first as unprovisioned `REQUESTER` accounts, then issue one-time local initial passwords through the explicit repeat-safe provisioning flow; do not place migrated-user plaintext passwords in a migration, database, repository file, or normal server log.
- Explicitly permit Administrator Ticket operations in the authorization matrix where the handout's ownership/priority/note rules allow Administrator, while keeping User Management as the Administrator's primary responsibility.
- Permit Staff/Admin read-only Attachment metadata/download on permitted Tickets but do not add Staff/Admin Attachment upload/removal in Lab 3.
- Use 1–2000-codepoint Public Comment/Internal Note bodies.
- Use the status-transition matrix in this specification and optimistic version checks for operational edits.
- Keep the existing simple React architecture and extend it with typed hash routes instead of adding a new routing/global-state framework.
- Activate real authentication across backend identity enforcement and frontend authenticated transport together in #45. #44 may establish the auth/session foundation, but the application is not considered converted while the legacy selector/header still drives normal Requester behavior.
- When #43 first exposes additional status values/role fixtures, include the minimum current-consumer compatibility needed so the integrated application can read those records; #46 completes and regression-tests the full Requester continuity.
- Update current source/tests/seed/configuration in Lab 3 commits when requirements evolve; preserve historical Lab 2 commits, evidence, and applied migrations rather than freezing current files.

No later implementation issue may silently change an observable decision in this contract. A required change first updates the specification, affected AC/Test mapping, and review record.
