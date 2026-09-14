# Lab 3 REST API Specification

Status: Issue #41 contract draft for peer review. No endpoint below is claimed implemented unless it already existed as Lab 2 behavior; all Lab 3-specific results remain planned.

## 1. Conventions and Security Boundary

- Base path: `/api`.
- JSON timestamps use ISO 8601 UTC.
- Resource IDs are positive base-10 integers.
- The server-derived authenticated User is authoritative. A body/header/query `requesterId`, role, author ID, owner override, status override, or backend timestamp never establishes identity or privilege.
- Successful User DTOs contain only documented safe fields; never password hash, session ID, session signing material, CSRF secret storage, or authorization-version internals.
- Protected-resource non-disclosure remains a backend rule. A missing Ticket/Attachment and an inaccessible foreign Ticket/Attachment use the documented safe resource response after authentication.
- The normal authenticated application uses credentialed requests. CORS permits only the configured frontend origin with credentials.
- Unsafe mutations require the selected CSRF token + allowed-Origin policy.
- All auth/session responses use conservative no-store caching.

## 2. Selected Authentication Contract

These are project decisions approved by the contract, not handout constants.

- Password hashing: Argon2id with independent salt. Initial target parameters are memory 19,456 KiB, iterations 2, parallelism 1, subject to dependency compatibility verification before implementation.
- Password policy: 15–128 Unicode code points; no trimming/normalization; confirmation must match; new value must differ from current password.
- Server-side session store: PostgreSQL.
- Cookie name: `toktickit.lab3.sid`; HttpOnly; SameSite=Lax; Path=/; Secure in HTTPS environments and explicitly false only for loopback HTTP development.
- Pre-auth session lifetime: 10 minutes.
- Authenticated idle timeout: 30 minutes.
- Absolute authenticated lifetime: 8 hours.
- Session ID is regenerated at successful login and password change.
- Selected login throttling: 10 failed attempts / 15 minutes for canonical email + IP, plus 100 failed attempts / 15 minutes per IP. Entries expire and the limiter is documented as local single-server protection, not distributed infrastructure.

## 3. Common Error Envelope

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

Common families:

| HTTP | Use |
|---:|---|
| 400 | Invalid path/query/body/value or correctable request validation |
| 401 | Missing/invalid/expired authentication |
| 403 | Authenticated but capability denied, mandatory password change, or policy denial |
| 404 | Missing/non-disclosable protected resource |
| 409 | Version/state/identity/assignment conflict |
| 413 | Attachment too large (retained Lab 2 behavior) |
| 415 | Unsupported/mismatched Attachment type (retained Lab 2 behavior) |
| 429 | Login throttling |
| 500 | Safe unexpected failure |

Unexpected errors must not expose stack traces, SQL, Prisma details, filesystem paths, password/hash/session/cookie values, secrets, or private database information.

## 4. Authentication Endpoints

### GET `/api/auth/csrf`

Purpose: create/reuse a pre-auth or authenticated session and return the request token used on unsafe methods.

Success `200`:

```json
{ "csrfToken": "opaque-session-bound-token" }
```

The value is CSRF material, not an authentication bearer token.

### POST `/api/auth/login`

Request:

```json
{ "email": "user@example.test", "password": "exact user input" }
```

Success `200` regenerates the session and returns:

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

Invalid/unknown credential: safe `401`. Inactive account: safe authentication failure/guidance without role or protected account data. Throttle: `429` with safe retry guidance.

### GET `/api/auth/me`

Success `200`: same safe User shape. Missing/invalid/expired session: `401`.

### POST `/api/auth/change-password`

Request:

```json
{
  "currentPassword": "current exact value",
  "newPassword": "new exact value",
  "confirmPassword": "new exact value"
}
```

Success `200`: persist new hash atomically, clear `mustChangePassword`, invalidate older sessions/account authorization version, regenerate current session, and return safe User. Invalid current/new/confirmation input: `400` or safe credential failure according to implementation detail finalized before code.

### POST `/api/auth/logout`

Success: `204` after server-side invalidation and matching cookie clear. If session-store invalidation fails, return safe failure rather than claiming logout completed.

## 5. Requester Ticket and Attachment APIs

Existing Lab 2 paths remain stable unless a reviewed implementation concern requires a contract update:

- `POST /api/tickets`
- `GET /api/tickets`
- `GET /api/tickets/:ticketId`
- `POST /api/tickets/:ticketId/attachments`
- `GET /api/tickets/:ticketId/attachments`
- `GET /api/tickets/:ticketId/attachments/:attachmentId/download`
- `DELETE /api/tickets/:ticketId/attachments/:attachmentId`

Changes from Lab 2:

1. `X-Development-Requester-Id` is not accepted as an identity source after authentication activation.
2. Requester identity is derived from the authenticated User and must have role `REQUESTER` for Requester-only mutations.
3. My Tickets `currentStatus` accepts all eight Lab 3 statuses.
4. Ticket DTOs may additionally expose safe operational read-only fields such as `itPriority`, current owner summary, resolution summary/timestamps, and Requester-resolution indication where the screen contract requires them.
5. Create keeps existing editable fields and server authority. Initial `currentStatus=NEW`, `ownerId=null`, and `itPriority=requestedPriority` occur exactly once. Exact replay returns existing operational state without resetting it.
6. Existing Lab 2 Attachment statuses, validation, 413/415/409 behavior, safe filenames, removal metadata, and download rules remain.
7. Authentication/resource/CSRF checks occur before unauthorized multipart work can stage bytes.

## 6. Staff Queue and Detail

### GET `/api/staff/tickets`

Authorized roles: `IT_STAFF`, explicitly permitted `ADMINISTRATOR`.

Query contract:

- `search`: trimmed case-insensitive substring across Ticket Number, Summary, Requester name; max 120; blank = no restriction.
- `categoryId`: positive integer.
- `currentStatus`: one of eight statuses.
- `requestedPriority`, `itPriority`: `LOW|MEDIUM|HIGH`.
- `owner`: `all` default, `unassigned`, `me`, or positive User ID.
- `sortBy`: `updatedAt|createdAt|ticketNumber|itPriority`.
- `sortDirection`: `asc|desc`.
- default sort: `updatedAt desc`, then `id desc`.
- `page`: default 1, positive integer.
- `pageSize`: default 10; permitted 10/20/50.
- repeated/unknown scalar parameters: `400`.

Success:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

### GET `/api/staff/tickets/:id`

Returns a safe Staff Detail projection for a permitted Ticket, including read-only Ticket information, owner/priority/status operational state, communication as authorized, and Attachment metadata/download capability.

### GET `/api/staff/assignees`

Returns active eligible assignee summaries only: `{id,name,role}` for `IT_STAFF|ADMINISTRATOR`.

### POST `/api/staff/tickets/:id/claim`

Request: `{ "expectedVersion": 3 }`.

Claims an unassigned Ticket for the authenticated eligible actor. Already assigned/stale state: `409`. No implicit status transition.

### PATCH `/api/staff/tickets/:id/owner`

Request: `{ "ownerId": 7, "expectedVersion": 3, "confirmed": true }`.

Target owner must be active and eligible. `ownerId:null` is allowed only in `NEW`, `CLOSED`, or `CANCELLED`. Reassignment is permitted on closed/cancelled records to allow safe account cleanup.

### PATCH `/api/staff/tickets/:id/priority`

Request: `{ "itPriority": "HIGH", "expectedVersion": 3 }`.

Allowed values: `LOW|MEDIUM|HIGH`. Closed/Cancelled priority edit is rejected.

### POST `/api/staff/tickets/:id/status`

Request:

```json
{
  "status": "RESOLVED",
  "expectedVersion": 4,
  "confirmed": true,
  "resolutionSummary": "Validated with the requester and access is restored."
}
```

Only the specification transition matrix is valid. Resolve requires 10–2000 trimmed characters; Cancel requires `cancelReason` 3–200 trimmed characters; Resolve/Close/Reopen/Cancel require explicit confirmation. Stale version/state returns `409` with no partial change.

## 7. Communication

### GET/POST `/api/tickets/:id/comments`

Owning Requester plus authorized Staff/Admin on the permitted Ticket.

POST accepts only:

```json
{ "body": "Plain text comment" }
```

Body: trimmed 1–2000 Unicode code points. Backend provides author/time. Order: `createdAt asc`, then `id asc`.

### GET/POST `/api/staff/tickets/:id/internal-notes`

IT Staff/Admin only. Same body rule. Requester must not receive Internal Note text/count/author/IDs through any projection.

### POST `/api/tickets/:id/resolution-indication`

Owning Requester only.

Request: `{ "expectedVersion": 5, "confirmed": true }`.

Allowed formal states: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`. Success sets a server timestamp and does not change formal Ticket status or Resolution Summary. Repeated indication is harmless.

## 8. Administrator Users

All endpoints require authenticated, password-change-complete `ADMINISTRATOR`.

### GET `/api/admin/users?search=&role=`

- search: name/email substring.
- optional one-role filter.
- no mandatory pagination or multi-column sorting.
- safe response fields: `id,name,email,role,active,mustChangePassword,version`.

### POST `/api/admin/users`

Request:

```json
{
  "name": "Fictional Staff",
  "email": "staff@example.test",
  "role": "IT_STAFF",
  "active": true,
  "initialPassword": "local-lab initial passphrase"
}
```

Selected validation: name trimmed 2–100; canonical valid email max 254; exactly one role; initial password follows the project password policy. Canonical duplicate: `409`.

### PATCH `/api/admin/users/:id`

Request: `{ "name": "...", "email": "...", "role": "REQUESTER", "active": true, "expectedVersion": 2 }`.

Password cannot be changed through this body. Self-deactivation, last-active-Administrator removal, assigned-owner safety, duplicate email, stale version, and concurrent invariant violations are rejected atomically.

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

Success stores only a hash, sets mandatory next-login change, increments account invalidation/edit versions, and invalidates old authenticated access. Password/hash is never returned.

## 9. Activation / Cutover Contract

- #44 may add and test the authentication/session foundation without declaring the existing Requester application converted.
- #45 is the authentication activation point: the existing frontend authenticated context/transport and the existing protected Requester backend routes are switched together. In the accepted integrated state after #45, Development Requester selection/header identity is not a fallback path.
- #43 may add the eight-status schema/fixtures only with enough current consumer compatibility that integrated My Tickets/Detail does not reject valid status records. Before #45 activation, any still-active temporary selector is filtered to role `REQUESTER` only.
- #46 then audits and completes the full authenticated Requester/Attachment regression surface rather than introducing the identity boundary for the first time.
