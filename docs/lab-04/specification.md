# Lab 4 Sprint Engineering Specification

Status: **Sprint 4 engineering contract for Issue #71. Product implementation has not started. All Lab 4 tests are Planned / Not run until executable evidence exists.**

Primary authority: `SE+Lab+4.pdf`. This contract extends the delivered Lab 3 `main` baseline `d41ab98d9d40266b355fe5fb3b3bcb193df8a116` and preserves valid Labs 1-3 behavior unless this document explicitly evolves it.

The instructor handout intentionally leaves several details to the student/AI specification process. Those details are identified below as **project decisions** rather than being attributed to the instructor.

## 1. Sprint Goal

Complete the core TokTickIT service-desk workflow by adding auditable Actions Taken beneath Tickets, enforcing the final Ticket lifecycle and resolution gate, providing concise role-appropriate dashboards, and hardening the complete Labs 1-3 application without discarding historical data or weakening existing authentication, authorization, collaboration, Attachment, and Administrator behavior.

## 2. Stakeholder Request

IT Staff need a reliable record of the real work performed on each Ticket. The primary Ticket Owner remains responsible for coordinating the Ticket, but different eligible IT Staff members may record an Action, be assigned to it, and ultimately perform/complete it. The system must distinguish those roles rather than labeling the original recorder as the performer. Requesters must be able to see all Actions Taken on their own Tickets without changing them. Staff must formally control Ticket resolution; a Requester's `Problem Appears Resolved` indication remains advisory. Requesters and Staff also need concise dashboards that summarize authoritative Ticket data and drill down into existing detailed views. The finished product must remain one coherent Zen Green application and all earlier behavior must continue to work.

## 3. Scope

### Included

- Actions Taken as child records of exactly one Ticket.
- Action creation time, description, result, auto-recorded original recorder, assignee, auto-recorded actual performer on completion, follow-up flag/note, Attachment Notes, lifecycle status, optimistic version, and immutable audit revisions.
- Action create, edit, assign/reassign, start, complete, cancel, stable list ordering, read-only Requester visibility, and inactive-assignee rejection.
- Eight retained Ticket statuses and a complete permitted transition matrix.
- Backend-enforced resolution gate spanning Ticket and current-cycle Actions Taken.
- Work-cycle semantics for reopened Tickets so old completed work does not automatically satisfy new-cycle resolution.
- Forward-only Ticket workflow-event history from Lab 4 onward.
- Requester Dashboard with owned-only metrics, previews, empty states, and drill-down.
- IT Staff Dashboard with operational metrics, recent Tickets, and current-user Actions Taken. Administrator reuses the Staff Dashboard.
- Strict dashboard/list query contracts, deterministic date boundaries, bounded DTOs, and metric-to-database verification.
- Additive Prisma/PostgreSQL migration preserving all earlier Users, Tickets, Attachments, Public Comments, Internal Notes, sessions, and historical migrations.
- Repeat-safe Lab 4 seed fixtures covering zero/one/many Actions, major Ticket statuses/priorities, assigned/unassigned ownership, and zero/non-zero dashboard states.
- Concurrency, stale-update, duplicate-submit/retry, authorization, safe-failure, migration/recovery, performance-smoke, accessibility, responsive, E2E, and full Labs 1-3 regression coverage.
- Required six tracked `docs/lab-04` deliverables. Regression/release helper notes may be retained locally for execution but are not course deliverables.

### Explicitly excluded

- SLA clocks, escalation engines, on-call scheduling, and breach notifications.
- Email, SMS, LINE, push, or other external notifications.
- Inventory, spares, purchasing, service-cost accounting, timesheet billing, payroll, or labor-cost calculation.
- Multi-level approvals or electronic signatures.
- Advanced BI/report builders/export warehouses.
- Multi-tenancy or production-scale cloud infrastructure.
- A new Attachment storage model for Actions Taken. `Attachment Notes` is plain text pointing to relevant existing evidence/files; it does not grant new upload permissions.
- Backdating Action Date/Time.
- User deletion, multi-role accounts, or unrelated account-management expansion.
- Any framework/router/state-management replacement not required by the approved contract.

## 4. Functional Requirements

- **FR-01 - List Actions Taken:** An authenticated permitted user shall retrieve all Actions Taken for a permitted Ticket using stable pagination/order.
- **FR-02 - Create Action Taken:** IT Staff and Administrators shall create an Action Taken under an accessible active-cycle Ticket with server-controlled recorder/time and an eligible assignee; `performedBy` remains unset until real completion.
- **FR-03 - Edit Action Taken:** IT Staff and Administrators shall edit permitted Action fields subject to lifecycle, Ticket state, cycle, and optimistic-version rules.
- **FR-04 - Assign Action Taken:** IT Staff and Administrators shall assign/reassign non-cancelled active-cycle Actions to active eligible IT Staff/Administrator users without changing the primary Ticket Owner.
- **FR-05 - Transition Action Taken:** IT Staff and Administrators shall start, complete, or cancel an Action only through the documented Action transition matrix and required validation; successful completion auto-records the authenticated completing actor as the actual performer.
- **FR-06 - Preserve Action audit history:** Every accepted Action mutation shall append an immutable Action revision; ordinary users shall have no destructive Action/history operation.
- **FR-07 - Requester Action visibility:** An owning Requester shall see all Actions Taken for their own Ticket, including completed/cancelled and prior-cycle records, in read-only form.
- **FR-08 - Preserve privacy:** Requester Action/history responses shall not expose Internal Notes, private account/session data, storage internals, or hidden staff-only metadata.
- **FR-09 - Enforce final Ticket workflow:** Staff/Admin shall perform only documented Ticket status transitions, with existing owner/confirmation/text rules plus the Lab 4 resolution gate.
- **FR-10 - Enforce resolution across records:** The backend shall block transition into `RESOLVED` when the current-cycle Action state fails the approved resolution predicate, even if a client bypasses the UI.
- **FR-11 - Support reopen cycles:** Reopening shall begin a new Ticket workflow cycle while preserving earlier Action/history data.
- **FR-12 - Preserve Requester advisory semantics:** `Problem Appears Resolved` shall remain advisory and shall never itself formally resolve/close a Ticket.
- **FR-13 - Provide Requester Dashboard:** The backend shall return concise owned-only Requester metrics and bounded recent/attention previews.
- **FR-14 - Provide Staff Dashboard:** The backend shall return concise Staff/Admin operational metrics, bounded recent-Ticket previews, and bounded current-user Actions Taken.
- **FR-15 - Provide metric drill-down:** Dashboard cards shall navigate to supported filtered detailed views using the exact approved predicates/date window.
- **FR-16 - Preserve role homes and navigation:** Lab 4 shall add Dashboard destinations while retaining every earlier screen still permitted for the authenticated role.
- **FR-17 - Preserve Labs 1-3 behavior:** Authentication, mandatory password change, role/ownership authorization, Create Ticket, My Tickets, Ticket Detail, Attachments, Public Comments, Internal Notes, Staff Ticket operations, Requester advisory resolution, and Administrator User Management shall remain correct.
- **FR-18 - Preserve data through migration:** The Lab 4 migration shall be additive and shall not discard or rewrite earlier valid data/history.
- **FR-19 - Provide repeat-safe seed:** Re-running seed shall not silently reset edited credentials, roles, activation, Ticket workflow, Actions, Comments, Notes, or Attachments.
- **FR-20 - Handle concurrency safely:** Action writes, Ticket resolution/cancellation, assignment, and account eligibility changes shall not commit a cross-record invalid state under races/stale clients.
- **FR-21 - Handle duplicate/retry safely:** Ambiguous Action creation retry shall reconcile one logical request rather than creating duplicate Actions.
- **FR-22 - Preserve safe drafts:** Recoverable UI failures/conflicts shall preserve safe user-entered data and shall not silently replay a stale mutation.
- **FR-23 - Preserve Zen Green/accessibility:** New screens shall reuse the existing design language, responsive conventions, keyboard/focus behavior, semantic labels, and non-color state meaning.
- **FR-24 - Produce traceable evidence:** Every Acceptance Criterion shall map to at least one planned Test ID and an explicit handout Rubric/Answer Part evidence destination; final completion shall depend on fresh evidence from the delivered final `main` SHA.

## 5. Business Rules

The handout explicitly supplies the meanings of BR-01 and BR-02; the remaining numbered rules are approved project decisions needed to make the incomplete stakeholder request testable.

- **BR-01:** Action Taken belongs to exactly one Ticket.
- **BR-02:** The Ticket Owner coordinates the Ticket, but an Action Taken may be performed/assigned to a different eligible IT Staff member.
- **BR-03:** Action Date/Time is the immutable server creation timestamp stored in UTC; the normal UI does not backdate it. Display uses Asia/Bangkok where a local zone is helpful.
- **BR-04:** `recordedBy` is the authenticated User who originally creates the Action. It is immutable and backend-controlled. `assignee` is a separate field and defaults to the recorder but may be another active `IT_STAFF` or `ADMINISTRATOR`.
- **BR-05:** `performedBy` means the actual authenticated actor who completes the work. It is `null` before completion, is set automatically on the successful transition to `COMPLETED`, and is immutable afterward. `COMPLETED` requires non-null `performedBy`/`completedAt`; non-completed states have neither. Later correction/cancellation/edit actors remain separately recorded in immutable revision/provenance fields.
- **BR-06:** Action Description is trimmed and 1-2000 Unicode code points. Result is optional while work is outstanding but is trimmed and 1-2000 code points when the Action is completed.
- **BR-07:** `followUpRequired=true` requires a trimmed Follow-up Note of 1-2000 Unicode code points. When false, a supplied note is allowed up to 2000 code points and is normalized consistently by the approved request contract.
- **BR-08:** Attachment Notes is optional plain text up to 2000 Unicode code points and does not create an Attachment relationship or new upload permission.
- **BR-09:** Action lifecycle statuses are `PENDING`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`.
- **BR-10:** A created Action begins `PENDING`.
- **BR-11:** Permitted Action transitions are `PENDING -> IN_PROGRESS|COMPLETED|CANCELLED` and `IN_PROGRESS -> COMPLETED|CANCELLED`. `COMPLETED` and `CANCELLED` have no status reversal.
- **BR-12:** While the parent Ticket/current work cycle is active, public Action content and assignee may be edited for `PENDING`/`IN_PROGRESS`. A `COMPLETED` Action may receive a content/follow-up correction while the same parent cycle remains active, but assignee and completion provenance are immutable. `CANCELLED` is read-only.
- **BR-13:** An Action from a previous workflow cycle is read-only even if the Ticket is later reopened.
- **BR-14:** Parent `RESOLVED`, `CLOSED`, or `CANCELLED` blocks normal Action writes. Reopen creates a new work cycle for new work.
- **BR-15:** Eligible Action assignee is an active `IT_STAFF` or `ADMINISTRATOR`. A stale/inactive/wrong-role assignee is rejected by the backend even if shown in an old client dropdown.
- **BR-16:** A User with outstanding `PENDING`/`IN_PROGRESS` Actions assigned to them cannot be deactivated or demoted to Requester until those Actions are reassigned/completed/cancelled. Existing Ticket-owner safety remains in force.
- **BR-17:** Public Comments and Internal Notes remain their existing separate append-only records. Actions Taken do not replace either communication mechanism.
- **BR-18:** Each successful Action creation/change appends exactly one immutable Action revision containing approved public Action snapshot fields, actor, event type, action version, and timestamp. Retries/no-ops append nothing.
- **BR-19:** Successful Lab 4 Ticket workflow transitions append immutable forward-only Ticket workflow events. No pre-Lab-4 history is fabricated.
- **BR-20:** Required Ticket statuses remain `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-21:** Same-state Ticket status requests are invalid. Only the matrix below is permitted.
- **BR-22:** A non-cancelled operational destination continues to require an active eligible primary Ticket Owner. Claim/reassign changes owner only and does not silently change formal status.
- **BR-23:** Resolve continues to require a trimmed Resolution Summary of 10-2000 Unicode code points and explicit confirmation. Cancel continues to require a 3-200 code-point reason and confirmation. Close/Reopen retain their existing confirmation rules.
- **BR-24:** Let `C` be Actions whose `workflowCycle` equals the Ticket's current cycle. Transition into `RESOLVED` is permitted only when the ordinary role/source/owner/summary/confirmation checks pass **and** `count(C status=COMPLETED) >= 1`, `count(C status in {PENDING,IN_PROGRESS}) = 0`, and `count(C status != CANCELLED and followUpRequired=true) = 0`.
- **BR-25:** Cancelled Actions do not satisfy the completed-work requirement. All-cancelled/no-action current cycles cannot resolve.
- **BR-26:** Legacy Tickets already `RESOLVED`/`CLOSED` with zero Actions remain valid and visible; the new gate is not retroactive. A legacy `RESOLVED` Ticket may still be closed through the retained matrix.
- **BR-27:** Reopening increments `workflowCycle`, clears current resolution/close/advisory fields according to the retained Lab 3 contract, preserves history, and requires new-cycle qualifying work before any later resolution.
- **BR-28:** Cancelling a Ticket atomically cancels any current-cycle `PENDING`/`IN_PROGRESS` Actions using the authentic actor/time and immutable Action revisions. Already terminal Actions remain unchanged.
- **BR-29:** A Requester's `Problem Appears Resolved` indication remains advisory, is ownership-scoped, and never satisfies or bypasses the formal resolution gate.
- **BR-30:** Action list/history ordering is deterministic. Default Action order is ascending `(createdAt, id)` so work history reads chronologically; pagination must make every Action reachable.
- **BR-31:** Every Action mutation uses optimistic Action/Ticket versions where applicable and rechecks parent state/cycle/authorization inside the database transaction.
- **BR-32:** Action writes and Ticket resolution/cancellation share the parent Ticket row lock. The selected deterministic lock discipline is eligible User rows in ascending ID order -> Ticket -> affected Action rows in stable ID order.
- **BR-33:** Concurrent valid operations may produce one winner and one safe conflict/revalidation outcome; they must not silently overwrite or commit an impossible resolved/outstanding-work state.
- **BR-34:** Action create uses an actor-scoped persistent `clientRequestId` plus a server-computed fingerprint of the canonical original business payload. A matching authorized replay returns the same logical Action; the same key with changed original payload returns conflict.
- **BR-35:** A successful replay after later Action edits/parent closure returns the current public representation of the same Action and creates no new Action/revision.
- **BR-36:** Requesters may retrieve all public Actions/revisions/workflow events for their own Tickets read-only. They cannot create/change Actions through UI or direct requests.
- **BR-37:** Backend authorization is authoritative. Hidden/disabled controls are feedback, not security.
- **BR-38:** Missing/foreign nested Ticket/Action resources use the existing non-disclosing resource behavior after authentication. Wrong-role capability is safely forbidden without leaking protected data.
- **BR-39:** Dashboard metrics are computed by the backend from authoritative data; UI code does not derive official counts by counting a preview array or current page.
- **BR-40:** Active Ticket set `A = {NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED}`.
- **BR-41:** Dashboard response uses one server `asOf` instant `T`. The selected recent-resolved window is `[T-168h, T)` in UTC. The API returns the exact window so drill-down reuses it rather than recomputing a new one in the browser.
- **BR-42:** Requester Dashboard predicates are: `My active` = own Ticket and status in `A`; `Waiting for me` = own Ticket and status `WAITING_FOR_REQUESTER`; `Recently resolved` = own Ticket and status in `{RESOLVED,CLOSED}` and `resolvedAt` in the returned recent window.
- **BR-43:** Staff Dashboard predicates are: `Unassigned active` = owner null and status in `A`; `My active` = owner=actor and status in `A`; `High-priority active` = `itPriority=HIGH` and status in `A`; `Waiting for Requester` = status `WAITING_FOR_REQUESTER`.
- **BR-44:** Staff current-user Actions preview matches `recordedById=actor OR assigneeId=actor OR performedById=actor`, deduplicated by Action ID, and is labeled `My Actions` with explicit `Recorded` / `Assigned` / `Performed` attribution.
- **BR-45:** Dashboard previews are bounded to five rows per preview group ordered `updatedAt DESC, id DESC`. Counts cover all rows matching the metric, not only preview/page rows.
- **BR-46:** Dashboard empty counts are numeric `0` and empty previews are `[]`. Loading/failure states are not displayed as authoritative zero.
- **BR-47:** Dashboard/list predicates are shared through one deep query/policy module per role so metric and drill-down semantics do not drift across callers. The module interface owns normalization, predicates, deterministic ordering, and safe query errors; route/UI adapters remain shallow.
- **BR-48:** Requester list/dashboard queries apply ownership before aggregation/filter return. No foreign Ticket/Action information, including counts, IDs, authors, or timing metadata, is exposed.
- **BR-49:** Existing authentication/session/password/CSRF rules and Internal Note privacy remain unchanged unless explicitly evolved here.
- **BR-50:** Tests use an isolated test database and temporary upload/evidence roots; destructive development-data reset is never a verification shortcut.
- **BR-51:** Historical applied migration SQL is immutable. Lab 4 uses forward additive migrations only.
- **BR-52:** Repeat seed does not reset edited credentials, role, activation, authVersion, ownership, priority, workflow, comments, notes, Actions, or Attachment state.
- **BR-53:** `Recently updated` Dashboard previews use the authoritative Ticket `updatedAt`. Accepted public Action mutations update the parent Ticket's `updatedAt`; creating Public Comments or Internal Notes does not gain new Ticket-recency semantics solely for Lab 4.
- **BR-54:** Every accepted non-replay, non-no-op Action mutation increments the parent Ticket optimistic version exactly once and updates parent `updatedAt` in the same transaction. Matching create replay and explicit no-op edit do not change parent version/time.

### Authorization Matrix

`Allow` always means all authentication, password-change, ownership/resource, lifecycle, cycle, eligibility, validation, CSRF/origin, and optimistic-version preconditions also pass.

| Operation | Requester | IT Staff | Administrator | Resource / state rule |
|---|---|---|---|---|
| Authentication / own password / logout | Allow | Allow | Allow | Retained Lab 3 contract |
| Requester Dashboard | Allow | Deny | Deny | Own Ticket aggregates/previews only |
| Staff Dashboard | Deny | Allow | Allow | Shared operational scope; current-user identity from session |
| My Tickets / Requester Ticket Detail | Allow | Deny via Requester route | Deny via Requester route | Own submitted Ticket only |
| Staff Queue / Staff Ticket Detail | Deny | Allow | Allow | Retained Staff/Admin ticket scope |
| Read Actions / public Action revisions / workflow events | Own Ticket | Allow | Allow | Stable pages; no Internal Note/private data |
| Create Action | Deny | Allow | Allow | Active parent cycle; eligible assignee |
| Edit/assign Action | Deny | Allow | Allow | Lifecycle/cycle/version rules |
| Start/complete/cancel Action | Deny | Allow | Allow | Action matrix + required fields/confirmation |
| Formal Ticket transition | Deny | Allow | Allow | Ticket matrix + Lab 4 resolution/cycle rules |
| Problem Appears Resolved | Own Ticket | Deny | Deny | Advisory only; retained states/version rules |
| Public Comment | Own Ticket | Allow | Allow | Retained Lab 3 contract |
| Internal Note | Deny | Allow | Allow | Never present in Requester projections |
| Attachment upload/remove | Own Ticket | Deny | Deny | Retained Lab 2/3 rules |
| Attachment metadata/download | Own Ticket | Allow | Allow | Retained permitted Ticket rules |
| Administrator User Management | Deny | Deny | Allow | Retained rules + outstanding Action-assignee safety |

### Action Transition Matrix

| Current Action status | Permitted next status | Content / assignment behavior |
|---|---|---|
| `PENDING` | `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Approved public fields editable; eligible reassignment allowed |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` | Approved public fields editable; eligible reassignment allowed |
| `COMPLETED` | none | Public content/follow-up correction allowed only while same parent cycle active; assignment/completion provenance immutable |
| `CANCELLED` | none | Read-only |

### Ticket Status-Transition Matrix

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

- Add Requester `#/dashboard` and Staff/Admin `#/staff/dashboard` role homes while preserving earlier permitted destinations.
- Reuse the existing Zen Green tokens, authenticated shell, cards, forms, tables/cards, badges, validation placement, focus treatment, and three evidence viewports.
- Add Actions Taken to existing Staff/Requester Ticket Detail rather than creating a disconnected standalone work-tracking application.
- Staff/Admin Action UI clearly distinguishes primary Ticket Owner, original recorder, Action assignee, actual performer, later mutation actor, and automatic creation time.
- Requester Action UI is read-only and includes all Action statuses/cycles without leaking Internal Notes.
- Dashboard cards show backend counts plus concise bounded previews and navigate to supported filtered list/detail destinations.
- Dashboard -> list -> Detail -> Back, browser Back/Forward, and refresh preserve supported query context.
- Recoverable failures/conflicts retain drafts. Ambiguous create retry keeps the same logical request key/payload until reconciled.
- `409` conflict shows authoritative-change guidance; the client does not auto-overwrite newer server state.
- Every major state has accessible loading, empty/no-results, validation, busy, success, forbidden, unavailable/not-found, conflict, safe failure, and retry behavior where applicable.

## 7. Data Changes

Exact Prisma syntax and SQL are implemented only after this contract is reviewed. The approved logical design is:

### 7.1 Ticket increment

- Add `workflowCycle Int NOT NULL DEFAULT 1` with positive-value constraint.
- Migration must not rewrite legacy Ticket timestamps/versions solely to initialize this default.
- Existing Ticket fields/relationships remain valid.

### 7.2 ActionTaken

| Field | Contract |
|---|---|
| `id` | Positive generated primary key |
| `ticketId` | Required FK to Ticket; restrictive delete |
| `workflowCycle` | Positive immutable cycle copied from parent at create |
| `createdAt` | Server-controlled UTC create timestamp |
| `recordedById` | Required immutable FK to original recording User |
| `assigneeId` | Required FK to active eligible Staff/Admin at write time |
| `performedById` | Nullable FK to actual completing User; server-set only on `COMPLETED`, immutable afterward |
| `description` | Trimmed 1-2000 Unicode code points |
| `result` | Nullable while outstanding; required 1-2000 when completed |
| `followUpRequired` | Boolean |
| `followUpNote` | Required when flag true; max 2000 otherwise |
| `attachmentNotes` | Nullable plain text max 2000 |
| `status` | `PENDING|IN_PROGRESS|COMPLETED|CANCELLED` |
| `version` | Positive optimistic version, starts 1 |
| `updatedAt`, `updatedById` | Last accepted mutation provenance |
| `completedAt` | Server completion timestamp; paired with immutable `performedById` |
| `cancelledAt`, `cancelledById`, `cancellationReason` | Cancellation provenance; reason 3-200 |
| `clientRequestId` | Actor-scoped persistent create key |
| `createFingerprint` | Server-computed canonical original-payload fingerprint |

Required unique constraint: `(recordedById, clientRequestId)`.

Required indexes at minimum: `(ticketId, workflowCycle, status)`, `(ticketId, createdAt, id)`, recorder/assignee/performer current-user lookup paths, and any measured dashboard lookup not already supported by retained Ticket indexes.

### 7.3 ActionTakenRevision

Immutable append-only Action audit record with Action FK, Action version/event type, actor/time, and bounded approved public Action snapshot. Unique per `(actionId, actionVersion)`. No credentials, CSRF/session material, Internal Notes, raw request body, fingerprint, or storage internals.

### 7.4 TicketWorkflowEvent

Immutable forward-only Lab 4 Ticket transition record with Ticket FK, resulting Ticket version, workflow cycle, from/to status, actor/time, and bounded public resolution/cancellation context. No fabricated backfill for unknown pre-Lab-4 events.

### 7.5 Migration and legacy policy

- Additive forward migration only; historical migration SQL remains unchanged.
- Preserve all earlier Users, Tickets, Attachments, Public Comments, Internal Notes, sessions, Categories, Related Systems, IDs/FKs/content/timestamps unless a new default/constraint necessarily adds metadata without rewriting history.
- Legacy `RESOLVED`/`CLOSED` Tickets with zero Actions remain valid.
- Migration/recovery is rehearsed on isolated disposable data before any real development-data migration.
- Recovery is documented and tested; no automatic destructive down-migration strategy is required.
- Issue #73 recovery procedure: if the new migration fails, first verify the failed migration left no Lab 4 product objects/data mutation in the isolated target, correct the forward migration, mark that failed migration rolled back with `prisma migrate resolve --rolled-back <migration-name>`, and re-run `prisma migrate deploy`. Never drop retained Lab 3 tables or reset a populated database as the recovery shortcut; any real-data execution requires a separately authorized private backup/restore rehearsal first.

### 7.6 Seed

Add a distinct Lab 4 fixture namespace with: all major Ticket statuses/priorities; assigned/unassigned Tickets; zero/one/many Actions; different owner/recorder/assignee/actual-performer combinations; completed/cancelled/outstanding/follow-up cases; Requester owned metrics with zero/non-zero examples; and Staff metric/current-user Action examples. Re-running seed must preserve intentional edits to existing fixture state.

### Database design justifications

1. **Independent optimistic versions plus shared Ticket locking:** Action and Ticket have independent logical versions for precise stale-client feedback, while parent Ticket locking provides cross-record consistency for resolution/cancellation. This yields a deep workflow module: callers use one mutation interface while lock ordering/rechecks stay inside its implementation.
2. **Immutable revisions/events instead of destructive history edits:** The rubric requires stable/append-only workflow evidence while Actions are editable. Current public state stays simple to query; audit history remains append-only and testable without reconstructing mutable rows from ad-hoc logs.
3. **Persistent create key + immutable fingerprint:** Ambiguous network retry can return one logical Action even after that Action later changes. Fingerprint remains tied to the original canonical create payload rather than mutable current content.

## 8. API Contract Summary

The detailed endpoint/DTO/error contract is in `api-spec.md`.

Planned new capabilities:

- `GET /api/tickets/:ticketId/actions-taken`
- `POST /api/staff/tickets/:ticketId/actions-taken`
- `PATCH /api/staff/tickets/:ticketId/actions-taken/:actionId`
- `POST /api/staff/tickets/:ticketId/actions-taken/:actionId/status`
- `GET /api/tickets/:ticketId/actions-taken/:actionId/revisions`
- `GET /api/tickets/:ticketId/workflow-events`
- `GET /api/dashboard/requester`
- `GET /api/dashboard/staff`
- Existing `GET /api/staff/assignees` retained and reused.
- Existing Ticket status endpoint retained and extended with the approved Lab 4 gate/history/cycle behavior.

The list/query contract is extended deliberately for dashboard drill-down rather than accepting unknown parameters. All responses remain bounded and safe. Requester ownership is enforced before protected projection/aggregation.

## 9. Acceptance Criteria

- **AC-01:** Given a permitted Staff/Admin actor and valid Action input, create saves exactly one Action under the addressed Ticket/current cycle with server-controlled create time/recorder and approved assignee, while actual performer remains unset until completion.
- **AC-02:** Client-supplied recorder/performer/time/owner/privileged fields cannot spoof server authority.
- **AC-03:** Description, Result, Follow-up, Attachment Notes, cancellation reason, and enum validation match the documented boundaries and safe error shape.
- **AC-04:** Action assignment accepts only active eligible Staff/Admin users and remains safe when assignment races account deactivation/demotion.
- **AC-05:** All permitted Action lifecycle transitions/edits succeed; completion records the authenticated completing actor as immutable actual performer; invalid, terminal, old-cycle, terminal-parent, wrong-role, and stale writes fail without partial mutation.
- **AC-06:** An owning Requester can retrieve every public Action for their Ticket read-only, across statuses/cycles, while foreign Requesters and all Requester writes are denied without private-note leakage.
- **AC-07:** Replaying the same authorized `clientRequestId` and canonical original payload creates no duplicate, including after the Action is later edited/parent closed; changed original payload conflicts.
- **AC-08:** Accepted Action changes update Action/parent versions and append exactly one revision atomically; stale/no-op/rejected writes cannot overwrite newer state or append false history.
- **AC-09:** Concurrent Action and Ticket workflow operations cannot leave a Ticket formally resolved/cancelled while violating the approved current-cycle invariant.
- **AC-10:** Every one of the 64 Ticket source/destination pairs obeys the documented transition matrix plus role/owner/confirmation/text conditions.
- **AC-11:** Resolution rejects zero completed work, outstanding work, all-cancelled work, and unresolved current-cycle follow-up; it succeeds only when all approved gate conditions hold inside the transaction.
- **AC-12:** Requester advisory indication and Action completion never silently set formal Ticket status to Resolved/Closed.
- **AC-13:** Legacy terminal zero-Action Tickets remain valid; reopening starts a new cycle and old-cycle completed Actions cannot satisfy later resolution.
- **AC-14:** Action revisions, Ticket workflow events, Public Comments, and Internal Notes preserve stable append-only history and deterministic ordering.
- **AC-15:** Requester Dashboard returns only authenticated-owner metrics/previews with exact documented predicates and meaningful zero/empty behavior.
- **AC-16:** Staff/Admin Dashboard returns exact documented operational counts plus deduplicated current-user Actions attributed by recorder, current assignee, and/or actual performer with bounded previews.
- **AC-17:** Dashboard metric counts/time-window boundaries match independent database queries and the corresponding filtered-list `totalItems`, including beyond-first-page cases.
- **AC-18:** Dashboard drill-down, exact date window, list -> Detail -> Back, refresh, browser Back/Forward, and Action target behavior retain supported context without leaking unsupported query keys.
- **AC-19:** Clean install, populated Lab 3 upgrade, repeat migration/deploy, late-failure recovery, and referential cleanup preserve required earlier data and Attachment bytes.
- **AC-20:** Repeat seed creates required Lab 4 demo cases without duplicate fixtures or silently resetting edited identity/workflow/Action/Attachment state.
- **AC-21:** Existing authentication, logout, mandatory password change, session revocation, CSRF/origin, safe errors, role checks, and Requester ownership remain correct.
- **AC-22:** Existing Requester Create Ticket, My Tickets, Ticket Detail, and full Attachment lifecycle remain correct.
- **AC-23:** Existing Staff Queue/Detail, owner/priority workflow, Public Comments, Internal Notes, Requester advisory resolution, and Administrator User Management remain correct, including new outstanding-Action deactivation safety.
- **AC-24:** Recoverable validation/conflict/network/API failures preserve safe drafts/retry identity, expose no sensitive internals, and produce no unhandled client failure.
- **AC-25:** All major Lab 4 screens meet Zen Green, labels/focus/non-color semantics, keyboard operation, long-content handling, and 1440x900 / 834x1112 / 390x844 responsive requirements without page-level horizontal overflow.
- **AC-26:** Required Lab 4 and retained regression tests are discovered and traced honestly; every AC maps to planned Test IDs and a Rubric/Answer Part evidence destination; no planned test is labeled Pass without an executed check and no Lab 3 evidence is rewritten.
- **AC-27:** Git history, Issue/PR Development links, real peer review, `feature/* -> lab4-staging -> main`, actual board state, and exact-final-main verification support release completion.
- **AC-28:** The single final submission PDF contains readable `Answer Part 1` through `Answer Part 9`, working links, actual evidence, and student-confirmed reflection.

Every AC maps to one or more planned Test IDs in `tests.md`.

## 10. Product Definition of Done

Lab 4 Product Completion requires all of the following; a feature PR merge alone is not Product Done.

- Approved Sprint 4 specification, API, UI, Test DD, AI-use, and reviewer evidence remain internally consistent.
- Actions Taken model, lifecycle, assignment, Requester visibility, audit history, duplicate retry, optimistic versions, and cross-record races satisfy the contract.
- Final Ticket transition matrix, resolution gate, cancellation behavior, legacy policy, reopen cycles, and Requester advisory boundary satisfy the contract.
- Requester and Staff/Admin dashboards use backend-authoritative calculations and complete drill-down behavior.
- Additive migration/recovery and repeat-safe seed are verified on isolated data with preserved earlier records/Attachment bytes.
- All relevant unit, API/integration, UI, style/accessibility, authorization, workflow, migration/regression, performance-smoke, responsive, and E2E tests exist, run, and pass on the appropriate candidate.
- Labs 1-3 retained behavior passes the representative/full regression surface defined in `tests.md`.
- Major UI/state evidence is captured from the tested application at all required viewports and manually inspected for clipping/overlap/overflow/focus/accessibility defects.
- No `.env`, credentials, session secrets, passwords, live uploads, private backups, transient reports, or unrelated historical artifacts are committed.
- Every feature PR is linked to its Issue, receives real peer review, and merges only through the approved staging flow.
- Release candidate is freshly verified, staging -> main receives required real review/authorization, and exact resulting final `main` is verified again.
- Final GitHub Project/Kanban evidence reflects actual workflow state rather than cosmetic movement.
- README/setup/demo/migration/seed/test instructions are current by release time.
- The final nine-part PDF is generated from real repository/review/test/evidence state and is visually inspected before submission.

## 11. Assumptions and Decisions

### 11.1 Mandatory source reconciliation for Issue #71

The handout leaves several details open. The table below records the source fragment, the selected project decision, and the final PR #81 review state. PR #81 received human approval before merge; later implementation and release reviews remain separate evidence.

| # | Handout source fragment | Selected project decision | Review status |
|---:|---|---|---|
| 1 | §8.3: “Requesters will see all Actions Taken items.” | Owning Requesters see all public Actions across statuses/cycles, read-only; Internal Notes remain private. | Reviewer explicitly confirmed this behavior; approved in PR #81. |
| 2 | Rubric Part 6: “list, create, assign, edit, status transition, complete, cancel” plus inactive-assignee rejection. | Actions include assignment, editable active states, explicit lifecycle transitions, completion/cancellation, and backend eligibility checks. | No correction requested; approved in PR #81. |
| 3 | Rubric Part 5: “current-user Actions Taken”. | Staff `My Actions` is the deduplicated union where the actor is recorder, current assignee, and/or actual performer; attribution states why each row appears. | Reviewer confirmed the dashboard requirement; approved in PR #81. |
| 4 | §4.5: “The backend must enforce the resolution rule even when a client bypasses the normal screen.” | BR-24 current-cycle gate: >=1 completed, no pending/in-progress, no unresolved non-cancelled follow-up, plus retained owner/summary/confirmation rules. | Reviewer explicitly confirmed the resolution predicate; approved in PR #81. |
| 5 | §6: “create and update Actions Taken as permitted”; Rubric Part 6 requires assign/status/complete/cancel. | Lifecycle is `PENDING -> IN_PROGRESS|COMPLETED|CANCELLED`, `IN_PROGRESS -> COMPLETED|CANCELLED`; no terminal reversal; audited content correction only for eligible completed Actions. | No correction requested; approved in PR #81. |
| 6 | Stakeholder request/§8.3: “Performed by (auto)” while Rubric Part 6 separately requires assign and complete. | Ticket Owner, immutable `recordedBy`, mutable eligible `assignee`, and immutable actual `performedBy` are distinct. `performedBy` is server-set to the authenticated completing actor only on `COMPLETED`; mutation actors remain in revisions. | **Corrected from the initial contract in response to PR #81 Changes Requested**; approved in PR #81. |
| 7 | §8.3: “Action create date/time” and “Attachment Notes (what file to look for images etc.)”. | Action Date/Time is immutable server creation time in UTC with Bangkok display; no normal backdating. Attachment Notes is bounded plain text, not a new upload relationship. | No correction requested; approved in PR #81. |
| 8 | Rubric Part 7: “stable ordering, append-only behavior” while §8.3 requires view/edit mode. | Mutable current Action state is reconciled with append-only evidence using immutable Action revisions and forward-only Ticket workflow events; no destructive history deletion. | Reviewer found no blocker in append-only/history behavior; approved in PR #81. |
| 9 | §5.2: students must “define how legacy Tickets without Actions Taken behave”. | Existing terminal zero-Action Tickets remain valid; the new gate applies to future resolution attempts. Reopen starts a new cycle and old-cycle completed work cannot satisfy it. | Reviewer confirmed legacy/reopen decisions were present; approved in PR #81. |

### 11.2 Additional project decisions

The following are also **project decisions**, not instructor-provided constants:

1. Action lifecycle = `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` with no terminal reversal.
2. `recordedBy` is immutable original recorder; `assignee` is current planned worker; `performedBy` is the server-recorded actual completing actor and remains `null` until completion.
3. Action Date/Time is immutable server create time; no normal backdating.
4. Resolution predicate is the current-cycle completed/no-outstanding/no-unresolved-follow-up rule in BR-24 plus retained owner/summary/confirmation rules.
5. Completed Action content/follow-up correction is allowed only while the same parent cycle is active and is preserved through immutable revisions without changing `performedBy`.
6. Legacy terminal zero-Action Tickets remain valid; reopen starts a new work cycle.
7. Ticket cancellation atomically cancels current-cycle outstanding Actions.
8. Dashboard active set is the five non-terminal statuses in BR-40; recently resolved is a rolling 168-hour UTC window returned by the backend.
9. Requester has three primary metric cards and Staff has four primary metric cards plus bounded previews/current-user Actions as defined in BR-42..45.
10. Action list default chronological order is `(createdAt,id)` ascending; dashboard previews are `(updatedAt,id)` descending.
11. Persistent create key/fingerprint and User -> Ticket -> Action lock discipline are the selected retry/concurrency strategy.
12. Requester `#/dashboard` and Staff/Admin `#/staff/dashboard` are selected role homes while all earlier permitted screens remain reachable.

These decisions must receive final peer approval before dependent schema/product implementation. If peer review identifies another defensible correction, update this contract and its tests first rather than silently drifting implementation.
