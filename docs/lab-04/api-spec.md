# Lab 4 REST Interface Specification

Status: **Reviewed Issue #71 REST contract implemented and released to `main`. The final promotion merged as `39a7afbcd44da82990b5b79ecf0060830a7b960a`, and exact-main Lab 4 CI run `37129118888` succeeded. Executable evidence is recorded in `tests.md`.**

Primary authority: `SE+Lab+4.pdf` sections 4-6 and 8-10, refined by the project decisions in `specification.md`.

## 1. Conventions and security seam

- Base path: `/api`.
- JSON requests/responses use `application/json`, except retained multipart Attachment upload and binary Attachment download.
- JSON timestamps are ISO 8601 UTC strings.
- Resource IDs are positive base-10 integers.
- Existing authenticated session identity is authoritative.
- Requester ownership is enforced in backend queries/projections before protected data is returned.
- Unsafe requests retain the existing Origin + CSRF policy.
- Password-change-required, inactive, revoked, wrong-role, and foreign-resource behavior retain the Lab 3 safe-error contract unless this file explicitly extends it.
- New Lab 4 modules expose a small interface: route adapters provide validated request intent; workflow/query modules own authorization/state/predicate/locking complexity and return public DTOs. Database lock/order details are implementation, not route-level interface knowledge.
- No response exposes password/hash/session/CSRF material, Action create fingerprints, raw database errors, internal storage paths, or Internal Note existence to Requesters.

## 2. Shared enums and public types

```ts
type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

type ActionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface UserSummary {
  id: number;
  name: string;
  role: UserRole;
}

interface ActionTakenPublic {
  id: number;
  ticketId: number;
  workflowCycle: number;
  createdAt: string;
  recordedBy: UserSummary;
  assignee: UserSummary;
  performedBy: UserSummary | null;
  description: string;
  result: string | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: ActionStatus;
  version: number;
  updatedAt: string;
  updatedBy: UserSummary;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: UserSummary | null;
  cancellationReason: string | null;
  readOnly: boolean;
}

interface ActionRevisionPublic {
  actionId: number;
  actionVersion: number;
  eventType: "CREATED" | "EDITED" | "ASSIGNED" | "STARTED" | "COMPLETED" | "CANCELLED" | "CONTENT_CORRECTED";
  actor: UserSummary;
  occurredAt: string;
  snapshot: {
    assignee: UserSummary;
    performedBy: UserSummary | null;
    description: string;
    result: string | null;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    status: ActionStatus;
  };
}

interface TicketWorkflowEventPublic {
  ticketId: number;
  ticketVersion: number;
  workflowCycle: number;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  actor: UserSummary;
  occurredAt: string;
  resolutionSummary: string | null;
  cancellationReason: string | null;
}
```

`recordedBy`, `performedBy`, creation/completion timestamps, workflow cycle, fingerprints, and historical actors are server-controlled. `recordedBy` is the immutable creator; `performedBy` is `null` until the server records the authenticated completing actor. Public DTOs never include internal fingerprint/session/storage fields.

## 3. Canonical error envelope

Retain the Lab 3 shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fieldErrors": {
      "description": "Description is required"
    }
  }
}
```

| HTTP | Code | Lab 4 meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Malformed path/query/body, unknown/repeated fields, invalid enum/date/text/confirmation |
| 401 | `AUTHENTICATION_REQUIRED` | Missing/expired/revoked session |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Mandatory password-change gate |
| 403 | `CSRF_INVALID` | Retained Origin/CSRF failure |
| 403 | `FORBIDDEN` | Authenticated role/capability denial |
| 404 | `RESOURCE_NOT_FOUND` | Missing or non-disclosable nested resource |
| 409 | `CONFLICT` | Stale version, parent/cycle/state conflict, ineligible assignee, blocked deactivation, invalid current invariant |
| 409 | `DUPLICATE_REQUEST_CONFLICT` | Existing create key with different canonical original payload |
| 500 | `INTERNAL_ERROR` | Safe unexpected failure |

Unexpected errors never expose stack traces, SQL/Prisma internals, filesystem paths, credentials, hashes, cookie/session values, or private record information.

## 4. Actions Taken read interface

### `GET /api/tickets/:ticketId/actions-taken`

Purpose: list all public Actions Taken for a permitted Ticket with stable chronological pagination.

Authorization:

- Requester: own Ticket only.
- IT Staff/Administrator: permitted Ticket according to retained Staff access rules.

Query:

```text
page=1..N          default 1
pageSize=1..50     default 20
```

Unknown or repeated query parameters -> `400 VALIDATION_ERROR`.

Response `200`:

```ts
interface ActionListResponse {
  items: ActionTakenPublic[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
```

Ordering: `(createdAt ASC, id ASC)`.

The list includes all statuses and all workflow cycles. `readOnly` is authoritative UI guidance derived from role/parent/cycle/lifecycle, not authorization by itself. Issue #76 also exposes narrow backend-derived UI guidance so React does not copy lifecycle authority: the list response includes `capabilities: { canCreate }`, while each public Action includes `{ canEdit, canReassign, permittedTransitions }`. Requesters and terminal-parent list contexts receive `canCreate=false`; Requesters and other read-only Action records receive `false`, `false`, and `[]`; active current-cycle Staff/Admin records receive values derived from `action-policy.ts`. Direct writes remain server-authorized regardless of these projections.

## 5. Create Action interface

### `POST /api/staff/tickets/:ticketId/actions-taken`

Authorization: IT Staff/Administrator only; normal session/password/CSRF gates apply.

Request:

```json
{
  "clientRequestId": "a persistent UUID for this logical submission",
  "expectedTicketVersion": 7,
  "description": "Inspect and replace the damaged cable",
  "result": null,
  "assigneeId": 23,
  "followUpRequired": true,
  "followUpNote": "Confirm connectivity after replacement",
  "attachmentNotes": "See the existing cable-photo.png attachment"
}
```

Rules:

- Reject unknown fields.
- `recordedById`, `performedById`, `createdAt`, `completedAt`, `workflowCycle`, owner, status, version, and cancellation provenance are not accepted from the client.
- `clientRequestId` is required and must satisfy the selected UUID/key format used by implementation.
- `expectedTicketVersion` must match the locked parent before a new logical create.
- `assigneeId` is optional on create. When omitted, the backend selects the authenticated recording actor as assignee; when supplied, it must identify another active eligible Staff/Admin. The UI preselects the actor but still renders the selected assignee explicitly before submission.
- Parent must be in an active status and current cycle.
- Assignee must be active IT Staff/Administrator under lock.

Success:

- First successful logical create -> `201`.
- Matching authorized replay -> `200`.

```json
{
  "action": { "...": "ActionTakenPublic" },
  "ticketVersion": 8,
  "replayed": false
}
```

Replay semantics:

1. Authorization is checked first.
2. If `(recordedById,clientRequestId)` already committed with matching immutable create fingerprint, return current public Action representation and `replayed:true` without new Action/revision/version mutation.
3. Same key with changed canonical original business payload -> `409 DUPLICATE_REQUEST_CONFLICT`.
4. A new key still must satisfy current parent/assignee/state/version rules.

## 6. Edit/assign Action interface

### `PATCH /api/staff/tickets/:ticketId/actions-taken/:actionId`

Request:

```json
{
  "expectedTicketVersion": 8,
  "expectedActionVersion": 2,
  "description": "Replaced cable and re-tested port",
  "result": "Connectivity restored",
  "assigneeId": 24,
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Cable photo remains relevant"
}
```

At least one editable business field must be present. Unknown/immutable fields are rejected.

Lifecycle rules:

- `PENDING`/`IN_PROGRESS`: approved public content and assignee editable while parent/current cycle active.
- `COMPLETED`: only approved content/follow-up correction; `assigneeId` rejected; completion provenance unchanged.
- `CANCELLED`: no edit.
- Previous-cycle or terminal-parent Action: no edit.

Identical canonical valid PATCH may return `200` as explicit no-op without incrementing versions/revision. Implementation must test and document the exact chosen no-op response; this contract selects `200` with unchanged Action/ticket versions and `changed:false`.

```json
{
  "action": { "...": "ActionTakenPublic" },
  "ticketVersion": 8,
  "changed": true
}
```

Stale parent or Action version -> `409 CONFLICT` with safe reload/reapply guidance.

## 7. Action status interface

### `POST /api/staff/tickets/:ticketId/actions-taken/:actionId/status`

Request shape:

```json
{
  "expectedTicketVersion": 8,
  "expectedActionVersion": 2,
  "status": "COMPLETED",
  "result": "Connectivity restored",
  "followUpRequired": false,
  "followUpNote": null,
  "confirmation": true,
  "cancellationReason": null
}
```

Rules:

- `PENDING -> IN_PROGRESS` does not require Result/confirmation beyond ordinary request validity.
- `PENDING|IN_PROGRESS -> COMPLETED` requires valid Result. `confirmation:true` is required for completion to make the terminal Action transition explicit. On the successful locked transition, the backend sets `performedBy` to the authenticated completing actor and `completedAt` to server time; both remain immutable afterward.
- `PENDING|IN_PROGRESS -> CANCELLED` requires `confirmation:true` and trimmed `cancellationReason` 3-200 code points.
- Any undocumented/same-state/terminal reversal -> `409 CONFLICT` or `400 VALIDATION_ERROR` according to whether syntax is valid but current state disallows it. The project selects `409 CONFLICT` for valid-enum current-state/lifecycle rejection.

Response `200`:

```json
{
  "action": { "...": "ActionTakenPublic" },
  "ticketVersion": 9
}
```

Action transition does not automatically change Ticket status.

## 8. Action revision interface

### `GET /api/tickets/:ticketId/actions-taken/:actionId/revisions`

Authorization matches Action read access and nested parent relationship.

Query: `page`, `pageSize` with same 20/default, 50/max contract.

Ordering: `actionVersion ASC`.

Response includes only public immutable snapshots. No fingerprint/raw request/private-note/session/storage fields.

## 9. Ticket workflow-event interface

### `GET /api/tickets/:ticketId/workflow-events`

Authorization:

- owning Requester may read public Ticket workflow events for own Ticket;
- Staff/Admin may read on permitted Tickets.

Ordering: `(ticketVersion ASC, occurredAt ASC)` with stable paging. Pre-Lab-4 transitions are not fabricated.

## 10. Ticket status interface extension

The existing Staff Ticket status endpoint is retained; Lab 4 extends behavior rather than creating a competing status interface.

For transition into `RESOLVED`, the workflow module must lock/re-read the Ticket and current-cycle Actions and enforce all of:

```text
allowed source/destination
active eligible Ticket owner
valid resolution summary
explicit confirmation
current-cycle COMPLETED count >= 1
current-cycle PENDING/IN_PROGRESS count == 0
current-cycle non-CANCELLED followUpRequired count == 0
expected Ticket version matches
```

Blocked resolution -> `409 CONFLICT` with a safe structured reason suitable for Staff feedback, for example:

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Ticket cannot be resolved yet",
    "fieldErrors": {
      "status": "Complete current work and clear required follow-up before resolving"
    }
  }
}
```

The client must not infer that this message alone is authorization/state authority.

Reopen increments `workflowCycle` atomically with the retained resolution/advisory reset. Ticket cancellation atomically cancels current-cycle outstanding Actions and appends required revisions/events.

## 11. Requester Dashboard interface

### `GET /api/dashboard/requester`

Authorization: authenticated Requester only; password-change-complete; ownership derived from session.

No client-supplied requester ID.

Response:

```ts
interface RequesterDashboardResponse {
  asOf: string;
  resolvedWindow: { from: string; before: string };
  metrics: {
    myActiveTickets: number;
    waitingForMe: number;
    recentlyResolved: number;
  };
  recentTickets: RequesterTicketListItem[];   // max 5
  attentionTickets: RequesterTicketListItem[]; // max 5, WAITING_FOR_REQUESTER
  drillDown: {
    myActiveTickets: string;
    waitingForMe: string;
    recentlyResolved: string;
  };
}
```

Predicates:

- Active set `A = NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED`.
- `myActiveTickets`: own Ticket and status in `A`.
- `waitingForMe`: own Ticket and status=`WAITING_FOR_REQUESTER`.
- `recentlyResolved`: own Ticket, status in `{RESOLVED,CLOSED}`, `resolvedAt >= from AND resolvedAt < before`.
- `asOf=T`; `from=T-168h`; `before=T`; all UTC.
- Preview order: `(updatedAt DESC,id DESC)`.
- Counts cover all matching rows.

Empty: numeric `0`; arrays `[]`.

## 12. Staff Dashboard interface

### `GET /api/dashboard/staff`

Authorization: IT Staff or Administrator.

Response:

```ts
interface StaffDashboardResponse {
  asOf: string;
  metrics: {
    unassignedActive: number;
    myActiveTickets: number;
    highPriorityActive: number;
    waitingForRequester: number;
  };
  recentTickets: StaffQueueItem[]; // max 5
  myActions: Array<{
    action: ActionTakenPublic;
    ticket: { id: number; ticketNumber: string; summary: string };
    attribution: Array<"RECORDED" | "ASSIGNED" | "PERFORMED">;
  }>; // max 5
  drillDown: Record<string,string>;
}
```

Predicates:

- `unassignedActive`: owner is null and status in active set.
- `myActiveTickets`: owner is actor and status in active set.
- `highPriorityActive`: `itPriority=HIGH` and status in active set.
- `waitingForRequester`: status=`WAITING_FOR_REQUESTER`.
- `myActions`: `recordedById=actor OR assigneeId=actor OR performedById=actor`, deduplicated by Action ID, `(updatedAt DESC,id DESC)`, max 5. `attribution` contains every matching role so one Action is never duplicated just because the actor recorded, was assigned, and/or completed it.
- `recentTickets`: Ticket `(updatedAt DESC,id DESC)`, max 5. Accepted public Action mutations count as Ticket updates because they atomically bump the parent Ticket version/`updatedAt`; Public Comment/Internal Note creation keeps its retained Lab 3 timestamp semantics.

Administrator uses this same interface; extra Admin account-count cards are not selected scope.

## 13. Ticket-list query extension for drill-down

Requester and Staff list parsers remain strict. Add only the documented fields:

```text
statusGroup=active|resolved
resolvedFrom=<ISO UTC/offset timestamp>
resolvedBefore=<ISO UTC/offset timestamp>
```

Rules:

- `currentStatus` and `statusGroup` are mutually exclusive.
- `resolvedFrom` and `resolvedBefore` are accepted only together with `statusGroup=resolved`.
- Both dates must parse to instants and `resolvedFrom < resolvedBefore`.
- Unknown, repeated, contradictory query fields -> `400 VALIDATION_ERROR`.
- `statusGroup=active` expands to the exact active set.
- `statusGroup=resolved` expands to `{RESOLVED,CLOSED}` and applies `[from,before)` to `resolvedAt`.
- Existing search/category/priority/owner/sort/page behavior remains unchanged.

Dashboard drill-down URLs:

```text
Requester my active: #/tickets?statusGroup=active
Requester waiting: #/tickets?currentStatus=WAITING_FOR_REQUESTER
Requester recent resolved: #/tickets?statusGroup=resolved&resolvedFrom=<F>&resolvedBefore=<T>
Staff unassigned active: #/staff/tickets?owner=unassigned&statusGroup=active
Staff my active: #/staff/tickets?owner=me&statusGroup=active
Staff high priority: #/staff/tickets?itPriority=HIGH&statusGroup=active
Staff waiting: #/staff/tickets?currentStatus=WAITING_FOR_REQUESTER
```

The browser must reuse the Dashboard-provided resolved window rather than compute a later one.

## 14. Transaction and concurrency contract

The external mutation interface remains concise; all lock/recheck complexity belongs behind the workflow module seam.

For Action/Ticket/Admin mutations that participate in cross-record invariants:

1. Authenticate/authorize and validate syntax/immutable-field overpost.
2. Determine candidate User IDs and lock relevant User rows in ascending numeric order.
3. Lock parent Ticket; re-read status, owner, cycle, version.
4. Lock addressed Action rows in stable Action ID order when applicable.
5. Recheck actor/account/assignee/owner eligibility and lifecycle under locks.
6. Perform business mutation, optimistic version changes, and Action/Ticket audit writes atomically.
7. Roll back everything on any failure.

Race expectations:

- Action write vs resolution: one serializes first; the loser rechecks and safely conflicts/denies as appropriate.
- Assignment vs deactivation/demotion: final committed state cannot contain outstanding work assigned to an ineligible user.
- Two Action edits: stale version cannot overwrite the winner.
- Duplicate creates: one logical record/revision.
- Ticket cancel vs child Action mutation: no half-cancelled state.

## 15. Dashboard performance interface expectations

- Dashboard endpoints return aggregates + bounded previews, never entire Ticket/Action collections.
- No per-row N+1 query loop.
- Current project smoke dataset target: ~1,000 Tickets / ~3,000 Actions in isolated test data.
- Proposed smoke budget: <=12 business-data SQL queries per dashboard response (excluding documented session/bootstrap overhead), JSON <=64 KiB, and local p95 <=2 seconds after 3 warmups / 20 measured requests. These are course-project smoke alarms, not production SLAs.
- Correctness and ownership isolation outrank micro-optimization.

## 16. Retained interfaces

All approved Labs 2-3 interfaces remain valid unless this contract explicitly extends their behavior. In particular:

- authentication/current-user/logout/password change/session/CSRF;
- Category/Related System reads;
- Requester Ticket create/list/detail;
- Attachment upload/list/download/soft removal;
- Staff queue/detail/assignees/owner/IT Priority/status;
- Public Comments/Internal Notes;
- Requester `Problem Appears Resolved`;
- Administrator user list/create/edit/password reset.

Lab 4 does not re-document every retained request/response field; the retained verification surface is defined in `tests.md`.
