# Lab 3 REST API Specification

Status: Issue #41 engineering-contract draft for peer review. No Lab 3 endpoint below is claimed implemented until its implementation issue supplies fresh evidence.

Primary authority: `Lab_3_sheet.pdf` §6. This file makes endpoint paths, request/response shapes, session behavior, validation, safe errors, and HTTP status codes explicit before implementation.

## 1. Conventions and Security Boundary

- Base path: `/api`.
- JSON requests/responses use `application/json`, except multipart Attachment upload and binary Attachment download.
- JSON timestamps are ISO 8601 UTC strings.
- Resource IDs are positive base-10 integers.
- The server-derived authenticated User is authoritative. A client-supplied `requesterId`, role, author ID, owner override, status override, or backend timestamp never establishes identity or privilege.
- After the #45 authentication activation gate, `X-Development-Requester-Id` is not accepted as identity by protected application routes.
- Protected Requester resources are non-disclosing: a missing Ticket/Attachment and a foreign Ticket/Attachment use the same safe `404 RESOURCE_NOT_FOUND` response after authentication.
- Wrong-role access to a role-only endpoint is rejected with `403 FORBIDDEN` without first disclosing protected resource existence.
- Unsafe requests require both the configured allowed Origin and the current session-bound CSRF token.
- Credential/session responses use `Cache-Control: no-store`.
- CORS permits only the configured frontend origin with credentials; wildcard credentialed CORS is not permitted.
- Password hashes, session IDs, CSRF storage material, authorization-version internals, database/storage paths, and implementation stack traces are never serialized to clients.

## 2. Selected Authentication and Session Contract

These are project design decisions, not lecturer-provided constants.

- Password hashing: Argon2id with independent salt. Initial target parameters: memory 19,456 KiB, iterations 2, parallelism 1; dependency compatibility is verified before implementation.
- Password policy: 15–128 Unicode code points; exact input is preserved (no trim/normalization); confirmation must match; a changed password must differ from the current password.
- Session mechanism: `express-session` with a PostgreSQL-backed server-side store.
- Cookie name: `toktickit.lab3.sid`; `HttpOnly`; `SameSite=Lax`; `Path=/`; `Secure` in HTTPS environments and false only for loopback HTTP development.
- Pre-authentication session lifetime: 10 minutes.
- Authenticated idle timeout: 30 minutes.
- Authenticated absolute lifetime: 8 hours.
- Successful login and successful password change regenerate the session ID. The client obtains a new CSRF token after regeneration before its next unsafe request.
- Logout destroys the server-side session and clears the matching cookie. If destruction of a known live session fails, the server returns a safe `500` instead of claiming successful logout.
- Protected requests re-check current User activation, role, `mustChangePassword`, and `authVersion`; stale sessions do not remain authorized after password reset, role/email change, or deactivation.
- Selected bounded login throttling: 10 failed attempts / 15 minutes for canonical email + IP and 100 failed attempts / 15 minutes per IP. These are local single-server course-project limits.

### 2.1 Session-store data contract

The migration owns the session table; runtime startup must not silently create an unmanaged production table.

| Field | Type / rule | Purpose |
|---|---|---|
| `sid` | opaque string, primary key | Session-store key; sensitive and never returned/logged |
| `sess` | JSONB | Serialized server-side session payload |
| `expire` | timestamp with time zone | Store expiry used for cleanup |

Required index: `expire` for cleanup/expiry scans.

The serialized session payload contains only the minimum server-side state needed by the selected adapter/policy, including nullable authenticated `userId`, the authenticated `authVersion` snapshot, a session-bound CSRF secret/token state, and absolute-expiry metadata. Passwords and password hashes are never stored in the session payload.

## 3. Shared Response Types

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

interface ReferenceItem {
  id: number;
  name: string;
}

interface UserSummary {
  id: number;
  name: string;
  role: UserRole;
}

interface RequesterSummary {
  id: number;
  name: string;
  email: string;
}

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

interface AdminUser extends CurrentUser {
  active: boolean;
  version: number;
}

interface AttachmentMetadata {
  id: number;
  ticketId: number;
  originalName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  sizeBytes: number;
  state: "ACTIVE" | "REMOVED";
  createdAt: string;
  removedAt: string | null;
  removalReason: string | null;
  downloadUrl: string | null;
}

interface RequesterTicketListItem {
  id: number;
  ticketNumber: string;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
  requestedPriority: Priority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

interface RequesterTicketDetail extends RequesterTicketListItem {
  requester: RequesterSummary;
  description: string;
  attachments: AttachmentMetadata[];
  resolutionSummary: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  requesterResolutionIndicatedAt: string | null;
  version: number;
}

interface StaffQueueItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: ReferenceItem;
  requester: RequesterSummary;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  owner: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface StaffTicketDetail extends StaffQueueItem {
  relatedSystem: ReferenceItem;
  description: string;
  attachments: AttachmentMetadata[];
  resolutionSummary: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  requesterResolutionIndicatedAt: string | null;
}

interface PublicComment {
  id: number;
  ticketId: number;
  author: UserSummary;
  body: string;
  createdAt: string;
}

interface InternalNote {
  id: number;
  ticketId: number;
  author: UserSummary;
  body: string;
  createdAt: string;
}
```

`storedName` and filesystem paths are never serialized. Internal Note objects, IDs, counts, authors, or existence metadata never appear in Requester projections.

## 4. Safe Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fieldErrors": {
      "email": "Email is required"
    }
  }
}
```

`fieldErrors` appears only for caller-correctable named input.

Canonical Lab 3 error codes:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid path/query/body/value/confirmation/current-password input |
| 401 | `AUTHENTICATION_REQUIRED` | Missing, invalid, expired, or revoked session |
| 401 | `INVALID_CREDENTIALS` | Unknown/wrong/unprovisioned login credentials without account enumeration |
| 403 | `ACCOUNT_INACTIVE` | Correct credential for an inactive account; no extra protected data returned |
| 403 | `PASSWORD_CHANGE_REQUIRED` | Authenticated initial-password session attempted a normal capability |
| 403 | `CSRF_INVALID` | Unsafe request failed CSRF/Origin policy |
| 403 | `FORBIDDEN` | Authenticated role/capability denial |
| 404 | `RESOURCE_NOT_FOUND` | Missing/non-disclosable protected resource |
| 409 | `CONFLICT` | Stale version, invalid current state, assignment/account invariant conflict |
| 409 | `DUPLICATE_REQUEST_CONFLICT` | Retained Ticket idempotency-key conflict |
| 409 | `ATTACHMENT_LIMIT_REACHED` | Retained five-active-Attachment limit |
| 413 | `PAYLOAD_TOO_LARGE` | Retained Attachment size rule |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Retained Attachment extension/MIME/signature rule |
| 429 | `LOGIN_RATE_LIMITED` | Selected bounded login-attempt policy |
| 500 | `INTERNAL_ERROR` | Safe unexpected failure |

Unexpected errors never expose stack traces, SQL, Prisma internals, filesystem paths, credentials, hashes, session/cookie values, secrets, or private database information.

## 5. Authentication Endpoints

### GET `/api/auth/csrf`

Creates/reuses the pre-authenticated or authenticated server-side session and returns the current request token.

- Success: `200 OK`

```json
{ "csrfToken": "opaque-session-bound-token" }
```

- Failure: `500 INTERNAL_ERROR`.

The token is CSRF material, not an authentication bearer token.

### POST `/api/auth/login`

Headers: valid configured `Origin` and `X-CSRF-Token`.

Request:

```json
{ "email": "user@example.test", "password": "exact user input" }
```

Success: `200 OK`. The session ID is regenerated.

```json
{
  "user": {
    "id": 1,
    "name": "Fictional User",
    "email": "user@example.test",
    "role": "REQUESTER",
    "mustChangePassword": true
  }
}
```

Failures:

- `400 VALIDATION_ERROR`: malformed/missing email or password field.
- `401 INVALID_CREDENTIALS`: unknown email, wrong password, or not-yet-provisioned migrated account.
- `403 ACCOUNT_INACTIVE`: credential is otherwise valid but the account is inactive.
- `403 CSRF_INVALID`: CSRF/Origin policy failure.
- `429 LOGIN_RATE_LIMITED`: throttle policy reached.
- `500 INTERNAL_ERROR`: safe unexpected failure.

### GET `/api/auth/me`

- Success: `200 OK` with `{ "user": CurrentUser }`.
- `401 AUTHENTICATION_REQUIRED`: no valid session.
- `500 INTERNAL_ERROR`: safe unexpected failure.

A `mustChangePassword=true` session may call this endpoint.

### POST `/api/auth/change-password`

Headers: valid configured `Origin` and `X-CSRF-Token`.

Request:

```json
{
  "currentPassword": "current exact value",
  "newPassword": "new exact value",
  "confirmPassword": "new exact value"
}
```

Success: `200 OK` with `{ "user": CurrentUser }`. The new hash is saved atomically, `mustChangePassword` becomes false, `authVersion` is incremented, older sessions become invalid, and the current session ID is regenerated.

Failures:

- `400 VALIDATION_ERROR`: wrong current password, policy violation, same-as-current value, or confirmation mismatch. `fieldErrors` identifies the correctable field without exposing hash state.
- `401 AUTHENTICATION_REQUIRED`: no valid session.
- `403 ACCOUNT_INACTIVE`: account became inactive.
- `403 CSRF_INVALID`: CSRF/Origin policy failure.
- `500 INTERNAL_ERROR`: safe unexpected failure.

A `mustChangePassword=true` session is explicitly permitted to call this endpoint.

### POST `/api/auth/logout`

Headers: valid configured `Origin` and `X-CSRF-Token` when a session exists.

- Success: `204 No Content`; known session row destroyed and cookie cleared. Repeating logout with no live authenticated session is also `204` and clears the cookie.
- `403 CSRF_INVALID`: a live session submitted an unsafe request without the required CSRF/Origin conditions.
- `500 INTERNAL_ERROR`: a known live session could not be invalidated safely.

## 6. Retained Reference Data and Authenticated Requester APIs

### 6.0 Retained Category and Related System reference data

The retained Create Ticket and Ticket-filter UI still depends on Category and Related System lookup data. After the #45 authentication activation, both lookup routes are normal protected application capabilities rather than public pre-authentication data.

Both endpoints require a valid, active, password-change-complete authenticated session. All three Lab 3 roles may read them because the values are shared non-user reference data. They are safe `GET` requests and therefore do not require `X-CSRF-Token` or an Origin check solely for CSRF protection.

#### GET `/api/categories`

- Query/body: none; unknown query parameters are rejected with `400 VALIDATION_ERROR` rather than ignored.
- Success: `200 OK` with a bare `ReferenceItem[]`, preserving the Lab 2 response shape.
- Contents: active Categories only.
- Ordering: `id asc`.
- Empty active set: `200 OK` with `[]`.
- Failures: `400 VALIDATION_ERROR`, `401 AUTHENTICATION_REQUIRED`, `403 PASSWORD_CHANGE_REQUIRED`, `500 INTERNAL_ERROR` using the safe error envelope.

#### GET `/api/related-systems`

- Query/body: none; unknown query parameters are rejected with `400 VALIDATION_ERROR` rather than ignored.
- Success: `200 OK` with a bare `ReferenceItem[]`, preserving the Lab 2 response shape.
- Contents: active Related Systems only.
- Ordering: `name asc`, then `id asc`.
- Empty active set: `200 OK` with `[]`.
- Failures: `400 VALIDATION_ERROR`, `401 AUTHENTICATION_REQUIRED`, `403 PASSWORD_CHANGE_REQUIRED`, `500 INTERNAL_ERROR` using the safe error envelope.

If an authenticated session becomes invalid because the account is deactivated or its authorization version changes, the normal session-revocation contract applies and protected lookup access is rejected rather than returning reference data.

#### Retirement of `GET /api/development-requesters`

The Lab 2 Development Requester lookup is transitional only. Before #45 it may exist while the old selector still drives the unconverted application. Completion of #45 removes the route and all normal client calls to it. On the post-#45 application, an authenticated password-change-complete request to `/api/development-requesters` receives the application's safe `404 RESOURCE_NOT_FOUND` response and never a Requester list. No compatibility alias or test-only production fallback is retained.

The Lab 2 Ticket Number rules, idempotency behavior, Attachment validation/storage/compensation rules, and 5 MiB / five-active limits remain authoritative except where this Lab 3 contract explicitly changes identity or Ticket status. `docs/lab-02/api-spec.md` remains historical rationale, but the active Lab 3 request contract is repeated here so implementation does not have to infer current behavior from two documents.

All Requester mutations below require the valid configured `Origin` and `X-CSRF-Token` in addition to an authenticated, active, password-change-complete `REQUESTER` session. No Requester endpoint accepts `requesterId`, role, author identity, Ticket Owner, IT Priority, Current Status, or backend timestamps as client authority unless a field is explicitly listed below.

### 6.1 `POST /api/tickets` request

`Content-Type: application/json`

```json
{
  "clientRequestId": "c5404d4c-0b9b-4c52-9f3a-24872db6996f",
  "categoryId": 1,
  "relatedSystemId": 3,
  "summary": "Cannot access university email",
  "requestedPriority": "HIGH",
  "description": "Sign-in repeatedly returns an access denied message."
}
```

Validation retained from Lab 2:

- `clientRequestId`: required UUID;
- `categoryId`, `relatedSystemId`: required positive integers and active references for a first create;
- `summary`: required, trimmed, 5–120 characters;
- `requestedPriority`: `LOW|MEDIUM|HIGH`;
- `description`: required, trimmed, 10–2000 characters.

Requester ownership is always the authenticated User. A new Ticket starts `currentStatus=NEW`, `ownerId=null`, and `itPriority=requestedPriority`. The retained `clientRequestId` replay/conflict/concurrency rules still apply; exact replay returns the current Ticket without resetting later operational state.

### 6.2 `GET /api/tickets` query

No body. Query contract:

| Parameter | Default | Allowed / behavior |
|---|---|---|
| `search` | absent | Trimmed string up to 120 characters; case-insensitive substring across Ticket Number or Summary; blank after trim = unrestricted |
| `categoryId` | absent | positive integer Category ID |
| `requestedPriority` | absent | `LOW|MEDIUM|HIGH` |
| `currentStatus` | absent | any of the eight Lab 3 `TicketStatus` values |
| `sortBy` | `updatedAt` | `createdAt|updatedAt|ticketNumber|summary` |
| `sortDirection` | `desc` | `asc|desc` |
| `page` | `1` | positive integer, 1-based |
| `pageSize` | `10` | `10|20|50` |

Search fields combine with OR; supplied filters combine with search using AND. Primary ordering uses deterministic `id desc` as the secondary key. Unknown or repeated scalar query parameters return `400 VALIDATION_ERROR`; invalid values never fall back to an unrestricted query. A positive page beyond the last page is a successful empty page. `totalPages=0` when `totalItems=0`.

### 6.3 Requester Ticket/Attachment path and body rules

- `GET /api/tickets/:ticketId`: positive-integer `ticketId`; no query/body.
- `POST /api/tickets/:ticketId/attachments`: positive-integer `ticketId`; `multipart/form-data`; exactly one file in field `file`; 1–5,242,880 bytes; permitted JPG/JPEG/PNG/WEBP/PDF extension + MIME + signature agreement; maximum five active Attachments.
- `GET /api/tickets/:ticketId/attachments`: positive-integer `ticketId`; no query/body; returns active and removed Attachment metadata ordered `createdAt asc, id asc`.
- `GET /api/tickets/:ticketId/attachments/:attachmentId/download`: both IDs positive; no query/body; Attachment must belong to the Ticket and be active.
- `DELETE /api/tickets/:ticketId/attachments/:attachmentId`: both IDs positive; `Content-Type: application/json`; body `{ "removalReason": "Contained an outdated screenshot" }`; reason is required, trimmed, 3–200 characters; already-removed/missing/foreign resources use the non-disclosing resource contract.

The upload path validates authentication/authorization/resource/CSRF conditions before unauthorized bytes can be staged. Stored filenames and filesystem paths never appear in any response.

| Endpoint | Success | Response | Lab 3-specific failures |
|---|---|---|---|
| `POST /api/tickets` | `201 Created` new / `200 OK` exact replay | `{ticket: RequesterTicketDetail, replayed: boolean}` | `401`, `403 PASSWORD_CHANGE_REQUIRED`, `403 CSRF_INVALID`, retained `400/409/500` |
| `GET /api/tickets` | `200 OK` | `{items: RequesterTicketListItem[], page, pageSize, totalItems, totalPages}` | `400` query, `401`, `403 PASSWORD_CHANGE_REQUIRED`, `500` |
| `GET /api/tickets/:ticketId` | `200 OK` | `{ticket: RequesterTicketDetail}` | `400` path, `401`, `403 PASSWORD_CHANGE_REQUIRED`, `404` missing/foreign, `500` |
| `POST /api/tickets/:ticketId/attachments` | `201 Created` | `{attachment: AttachmentMetadata}` | `400/401/403/404/409/413/415/500`; auth/resource/CSRF checks precede unauthorized byte staging |
| `GET /api/tickets/:ticketId/attachments` | `200 OK` | `{items: AttachmentMetadata[]}` | `400/401/403/404/500` |
| `GET /api/tickets/:ticketId/attachments/:attachmentId/download` | `200 OK` binary | binary body with safe `Content-Type`/download filename | `400/401/403/404/500` |
| `DELETE /api/tickets/:ticketId/attachments/:attachmentId` | `200 OK` | `{attachment: AttachmentMetadata}` in removed state | `400/401/403/404/409/500` |

Requester-specific rules:

1. Requester identity is the authenticated User with role `REQUESTER`.
2. Client `requesterId` overposting and legacy `X-Development-Requester-Id` do not select ownership after activation.
3. My Tickets `currentStatus` accepts all eight Lab 3 statuses.
4. Ticket create initializes `currentStatus=NEW`, `ownerId=null`, and `itPriority=requestedPriority` exactly once. Exact replay returns current operational state and never resets owner/IT Priority/status/version/timestamps.
5. Staff/Admin may use the shared Attachment metadata/download path on a permitted Staff Ticket; Staff/Admin cannot use Requester upload/remove operations.

## 7. IT Staff Queue and Ticket Detail

Authorized roles for this section: `IT_STAFF` and, by explicit project authorization-matrix decision, `ADMINISTRATOR`.

### GET `/api/staff/tickets`

Query:

- `search`: trimmed case-insensitive substring across Ticket Number, Summary, Requester name; max 120; blank = unrestricted.
- `categoryId`: positive integer.
- `currentStatus`: one of eight statuses.
- `requestedPriority`, `itPriority`: `LOW|MEDIUM|HIGH`.
- `owner`: `all` default, `unassigned`, `me`, or positive eligible User ID.
- `sortBy`: `updatedAt|createdAt|ticketNumber|itPriority`.
- `sortDirection`: `asc|desc`.
- default sort: `updatedAt desc`, then `id desc`.
- `page`: default 1, positive integer.
- `pageSize`: default 10; allowed 10/20/50.
- unknown or repeated scalar parameters: `400 VALIDATION_ERROR`.

Success: `200 OK`.

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

Non-empty items are `StaffQueueItem`.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `500`.

### GET `/api/staff/tickets/:id`

- Success: `200 OK` with `{ "ticket": StaffTicketDetail }`.
- Failures: `400` invalid ID, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `404 RESOURCE_NOT_FOUND`, `500`.

### GET `/api/staff/assignees`

- Success: `200 OK` with `{ "items": UserSummary[] }`, containing only active eligible `IT_STAFF|ADMINISTRATOR`, ordered `name asc, id asc`.
- Failures: `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `500`.

### POST `/api/staff/tickets/:id/claim`

Request:

```json
{ "expectedVersion": 3 }
```

Success: `200 OK` with `{ "ticket": StaffTicketDetail }`. Claim sets the authenticated eligible actor as owner only; no implicit status change.

Failures: `400` invalid body/ID, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT` already-assigned/stale/ineligible-state, `500`.

### PATCH `/api/staff/tickets/:id/owner`

Request:

```json
{ "ownerId": 7, "expectedVersion": 3, "confirmed": true }
```

`ownerId` may be `null` only in `NEW`, `CLOSED`, or `CANCELLED`. Non-null target owner must be active and eligible. Reassignment is permitted on Closed/Cancelled records so account cleanup does not require deleting history.

Success: `200 OK` with `{ "ticket": StaffTicketDetail }`.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT`, `500`.

### PATCH `/api/staff/tickets/:id/priority`

Request:

```json
{ "itPriority": "HIGH", "expectedVersion": 3 }
```

Success: `200 OK` with `{ "ticket": StaffTicketDetail }`. Requested Priority is unchanged.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT` stale/Closed/Cancelled, `500`.

### POST `/api/staff/tickets/:id/status`

Request examples:

```json
{
  "status": "RESOLVED",
  "expectedVersion": 4,
  "confirmed": true,
  "resolutionSummary": "Validated with the requester and access is restored."
}
```

```json
{
  "status": "CANCELLED",
  "expectedVersion": 4,
  "confirmed": true,
  "cancelReason": "Duplicate request"
}
```

Only the specification transition matrix is valid. Resolve requires 10–2000 trimmed code points; Cancel requires 3–200; Resolve/Close/Reopen/Cancel require `confirmed=true`. Unsupported enum/input is `400`; a syntactically valid but disallowed/stale transition is `409` with no partial change.

Success: `200 OK` with `{ "ticket": StaffTicketDetail }`.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT`, `500`.

## 8. Public Comments, Internal Notes, and Requester Resolution Indication

### GET `/api/tickets/:id/comments`

Owning Requester or authorized Staff/Admin.

- Success: `200 OK` with `{ "items": PublicComment[] }`, ordered `createdAt asc, id asc`.
- Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `404` where the caller is entitled to a non-disclosing resource response, `500`.

### POST `/api/tickets/:id/comments`

Request:

```json
{ "body": "Plain text comment" }
```

Body is trimmed and must contain 1–2000 Unicode code points. Backend supplies author and creation time; author/timestamp overposting is rejected.

- Success: `201 Created` with `{ "comment": PublicComment }`.
- Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `500`.

### GET `/api/staff/tickets/:id/internal-notes`

IT Staff/Admin only.

- Success: `200 OK` with `{ "items": InternalNote[] }`, ordered `createdAt asc, id asc`.
- Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `404` for permitted-role missing Ticket, `500`.

Requester denial occurs at the role boundary and does not return Internal Note objects/counts/IDs.

### POST `/api/staff/tickets/:id/internal-notes`

Request:

```json
{ "body": "Plain text internal note" }
```

Same 1–2000 trimmed-codepoint/body-author rules as Public Comments.

- Success: `201 Created` with `{ "note": InternalNote }`.
- Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `500`.

### POST `/api/tickets/:id/resolution-indication`

Owning Requester only.

Request:

```json
{ "expectedVersion": 5, "confirmed": true }
```

Allowed current formal states: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. The operation sets a backend timestamp only; it does not change formal Ticket status or Resolution Summary. Repeating an already-recorded indication is an idempotent `200` and does not bump the version again.

Success: `200 OK`.

```json
{
  "ticket": {
    "id": 42,
    "requesterResolutionIndicatedAt": "2026-09-15T00:00:00.000Z",
    "version": 6
  }
}
```

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404` missing/foreign, `409 CONFLICT` stale/disallowed state, `500`.

## 9. Administrator User Management

All endpoints require an authenticated, active, password-change-complete `ADMINISTRATOR`.

### GET `/api/admin/users`

Query:

- `search`: optional trimmed name/email substring; max 120; blank = unrestricted.
- `role`: optional single `REQUESTER|IT_STAFF|ADMINISTRATOR`.
- unknown/repeated scalar parameters: `400 VALIDATION_ERROR`.

No pagination or multi-column sorting is required. Ordering is `name asc, id asc`.

Success: `200 OK`.

```json
{ "items": [] }
```

Non-empty items are `AdminUser`.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN`, `500`.

### POST `/api/admin/users`

Request:

```json
{
  "name": "Fictional Staff",
  "email": "staff@example.test",
  "role": "IT_STAFF",
  "active": true,
  "initialPassword": "local-lab initial passphrase",
  "confirmPassword": "local-lab initial passphrase"
}
```

Validation: name trimmed 2–100; email trimmed/lowercased for canonical storage/uniqueness, max 254 and syntactically valid; exactly one role; password follows the selected policy and confirmation matches.

Success: `201 Created` with `{ "user": AdminUser }`; `mustChangePassword=true`; password/hash is not returned.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `409 CONFLICT` canonical duplicate/concurrent duplicate, `500`.

### PATCH `/api/admin/users/:id`

Request:

```json
{
  "name": "Fictional Staff Updated",
  "email": "staff.updated@example.test",
  "role": "REQUESTER",
  "active": true,
  "expectedVersion": 2
}
```

Only name/email/role/active plus expected version are accepted. Password fields and authorization/version internals are rejected as overposting.

Success: `200 OK` with `{ "user": AdminUser }`.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT` duplicate email/stale version/self-deactivation/last-active-Administrator/assigned-owner safety, `500`.

### POST `/api/admin/users/:id/initial-password`

Request:

```json
{
  "initialPassword": "new local-lab initial passphrase",
  "confirmPassword": "new local-lab initial passphrase",
  "expectedVersion": 2,
  "confirmed": true
}
```

Success: `200 OK` with `{ "user": AdminUser }`; stores only the new hash, sets `mustChangePassword=true`, increments account edit/auth invalidation versions, and invalidates prior authenticated access. Password/hash is never returned.

Failures: `400`, `401`, `403 PASSWORD_CHANGE_REQUIRED|FORBIDDEN|CSRF_INVALID`, `404`, `409 CONFLICT` stale/concurrent invariant, `500`.

No User deletion, bulk/import/export, role history, multi-role assignment, email-delivery, or advanced account-management endpoint belongs to Lab 3.

## 10. Local Migration Credential Provisioning

This is a non-HTTP migration/provisioning contract required by the handout's Lab 2 -> Lab 3 migration rule.

1. The forward database migration preserves each existing `RequesterUser.id`, email/name/active state, and Ticket requester FK. It does **not** invent or store plaintext credentials.
2. Existing Requesters initially enter the migrated schema with `role=REQUESTER`, `passwordHash=null`, and `mustChangePassword=true`; this is an intentionally unprovisioned state and login returns the same generic `401 INVALID_CREDENTIALS` as other invalid credentials.
3. A local-only provisioning command selects existing migrated Requesters whose `passwordHash` is still null, generates a cryptographically random one-time initial password per account, stores only its Argon2id hash, keeps `mustChangePassword=true`, and prints the email + one-time password once to the local terminal for the lab operator.
4. The provisioning command is not run automatically on server startup, is not run in hosted CI against real accounts, does not write plaintext credentials into the repository/database, and clearly labels its output as local-development-only.
5. Re-running provisioning skips already-provisioned accounts and therefore does not reset an edited password, role, activation state, or workflow data. A later intentional reset uses the Administrator initial-password API rather than silently regenerating credentials.
6. Inactive migrated Requesters may be provisioned but remain unable to authenticate until an Administrator activates them; the initial-password-change requirement still applies on their first successful login.
7. Migration/integration tests exercise this provisioning flow with injected deterministic test-only password generation so assertions do not depend on real random secrets.

## 11. Activation / Cutover Contract

- #44 adds/tests authentication, session, credential, and authorization foundations without claiming the existing Requester browser flow is converted.
- #45 is the cross-layer activation point: protected Requester backend identity and the frontend Login/mandatory-change/authenticated transport/context switch together.
- After #45, the normal application contains no Development Requester selector, Change Requester action, `X-Development-Requester-Id` identity authority, body requester identity authority, or production/test-only impersonation fallback.
- #43 may introduce eight-status schema/fixtures only with enough backend/client DTO/query/display compatibility that the integrated application can read those records. Before #45, any temporary selector still present is filtered to role `REQUESTER` only.
- #46 completes the exhaustive authenticated Requester/Ticket/Attachment regression surface rather than introducing the identity boundary for the first time.
