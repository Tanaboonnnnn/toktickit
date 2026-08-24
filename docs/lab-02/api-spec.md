# Lab 2 REST API Specification

## 1. Conventions

- Base path: `/api`.
- JSON request/response media type: `application/json`, except multipart Attachment upload and binary Attachment download.
- Resource IDs are positive base-10 integers.
- JSON timestamps are ISO 8601 UTC strings, for example `2026-08-23T09:30:00.000Z`.
- Requester-scoped endpoints require `X-Development-Requester-Id: <positive integer>`.
- `X-Development-Requester-Id` is a Lab 2 development/testing context only. It is not authentication and will be replaced by server-derived authenticated identity in Lab 3.
- Missing or syntactically invalid requester context returns `400 INVALID_REQUESTER_CONTEXT`.
- Unknown or inactive Development Requester context returns non-disclosing `404 RESOURCE_NOT_FOUND`.
- A missing owned Ticket/Attachment and a cross-Requester Ticket/Attachment use the same non-disclosing `404 RESOURCE_NOT_FOUND` behavior.
- Requester ownership is enforced in backend/database queries. The frontend is never the only ownership boundary.
- Searchable/validated strings are trimmed where this contract says so.
- Unknown Ticket-list query parameters are invalid and return `400 VALIDATION_ERROR`.
- Error responses never expose stack traces, SQL, Prisma details, credentials, filesystem paths, or generated storage filenames.

### 1.1 Safe Error Envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fieldErrors": {
      "summary": "Summary must contain 5 to 120 characters"
    }
  }
}
```

`fieldErrors` is included when the caller can correct named input.

Lab 2 safe error codes include:

- `VALIDATION_ERROR`
- `INVALID_REQUESTER_CONTEXT`
- `RESOURCE_NOT_FOUND`
- `DUPLICATE_REQUEST_CONFLICT`
- `ATTACHMENT_LIMIT_REACHED`
- `PAYLOAD_TOO_LARGE`
- `UNSUPPORTED_MEDIA_TYPE`
- `INTERNAL_ERROR`

Example unknown/inactive Development Requester response:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Development Requester not found"
  }
}
```

### 1.2 Shared Success Representations

```ts
type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";
type TicketStatus = "NEW";

interface ReferenceItem {
  id: number;
  name: string;
}

interface RequesterItem {
  id: number;
  name: string;
  email: string;
}

interface TicketListItem {
  id: number;
  ticketNumber: string;
  category: ReferenceItem;
  relatedSystem: ReferenceItem;
  summary: string;
  requestedPriority: RequestedPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
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

interface TicketDetail extends TicketListItem {
  requester: RequesterItem;
  description: string;
  attachments: AttachmentMetadata[];
}
```

`storedName` and server filesystem paths are never serialized.

---

## 2. Reference Data Endpoints

### GET `/api/categories`

**Context**

None.

**Parameters/body**

None.

**Success**

`200 OK` with a bare JSON array containing active Categories only.

Ordering:

1. `id asc`

Example:

```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" }
]
```

An empty array is a valid success response.

**Unexpected failure**

`500 INTERNAL_ERROR`

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unable to load categories"
  }
}
```

---

### GET `/api/related-systems`

**Context**

None.

**Parameters/body**

None.

**Success**

`200 OK` with a bare JSON array containing active Related Systems only.

Each item contains:

- `id`
- `name`

Ordering:

1. `name asc`
2. `id asc`

An empty array is a valid success response.

**Unexpected failure**

`500 INTERNAL_ERROR`

Message:

`Unable to load related systems`

---

### GET `/api/development-requesters`

**Context**

None. This endpoint exists only for the temporary Lab 2 development/testing workflow.

**Parameters/body**

None.

**Success**

`200 OK` with a bare JSON array containing active Development Requesters only.

Each item contains:

- `id`
- `name`
- `email`

Ordering:

1. `name asc`
2. `id asc`

Inactive rows are omitted rather than returned as disabled options.

An empty array is a valid success response and causes the UI to present the no-active-Requester state.

**Unexpected failure**

`500 INTERNAL_ERROR`

Message:

`Unable to load Development Requesters`

---

## 3. Ticket Endpoints

### POST `/api/tickets`

**Purpose**

Create one validated Ticket for the selected Development Requester.

**Context**

Required:

`X-Development-Requester-Id`

The body cannot override requester ownership.

**Headers**

`Content-Type: application/json`

**Request**

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

**Validation**

`clientRequestId`

- required;
- valid UUID.

`categoryId`

- required;
- positive integer;
- for a new Ticket, references an active Category.

`relatedSystemId`

- required;
- positive integer;
- for a new Ticket, references an active Related System.

`summary`

- required;
- trimmed;
- `5–120` characters after trimming.

`requestedPriority`

- required;
- one of `LOW`, `MEDIUM`, `HIGH`.

`description`

- required;
- trimmed;
- `10–2000` characters after trimming.

System-controlled values such as Ticket Number, Ticket Date, Current Status, and final requester ownership are derived/validated by the backend rather than trusted from client input.

### First-create Success

`201 Created`

```json
{
  "ticket": {
    "id": 42,
    "ticketNumber": "TKT-20260823-4Z8Q2M",
    "requester": {
      "id": 1,
      "name": "Anan Student",
      "email": "anan.student@example.test"
    },
    "category": {
      "id": 1,
      "name": "Account and Access"
    },
    "relatedSystem": {
      "id": 3,
      "name": "University Email"
    },
    "summary": "Cannot access university email",
    "requestedPriority": "HIGH",
    "currentStatus": "NEW",
    "createdAt": "2026-08-23T09:30:00.000Z",
    "updatedAt": "2026-08-23T09:30:00.000Z",
    "description": "Sign-in repeatedly returns an access denied message.",
    "attachments": []
  },
  "replayed": false
}
```

### Duplicate-submission Contract

A logical Ticket create request is identified by `clientRequestId`.

Normalized Ticket content for duplicate comparison is:

- Requester context;
- `categoryId`;
- `relatedSystemId`;
- trimmed `summary`;
- `requestedPriority`;
- trimmed `description`.

Attachments are excluded because they upload only after Ticket creation.

Behavior:

1. Validate requester context and basic request field types/formats needed to interpret the request.
2. Look up `clientRequestId`.
3. If the key already exists:
   - same Requester + same normalized Ticket content => return the original Ticket with `200 OK` and `replayed: true`;
   - different Requester or different normalized Ticket content => return `409 DUPLICATE_REQUEST_CONFLICT` and create nothing.
4. If the key does not already exist:
   - validate that Category and Related System are currently active;
   - create the new Ticket.

Concurrent identical requests must resolve the unique-constraint race without creating duplicate Tickets. If one request loses the `clientRequestId` uniqueness race, it rereads the winning Ticket and applies the same replay/conflict rules rather than exposing a raw database error.

Replay does not modify the existing Ticket's `updatedAt`.

### Ticket Number Contract

The Ticket Number is generated only by the backend.

Format:

`TKT-YYYYMMDD-XXXXXX`

- `YYYYMMDD` is the backend UTC create date.
- `XXXXXX` uses uppercase `A–Z` and `0–9`.

A database unique constraint is authoritative.

If a generated Ticket Number collides:

- retry safely with a fresh candidate;
- attempt at most five candidates total;
- do not leave a partial Ticket after a failed candidate.

Exhausting the retry limit returns safe `500 INTERNAL_ERROR`.

### Ticket-create Failure Cases

**Validation**

`400 VALIDATION_ERROR`

- invalid UUID;
- invalid scalar/enum;
- invalid Summary/Description boundaries;
- invalid/inactive Category for a new Ticket;
- invalid/inactive Related System for a new Ticket.

**Requester context**

- missing/malformed context => `400 INVALID_REQUESTER_CONTEXT`;
- unknown/inactive Development Requester => `404 RESOURCE_NOT_FOUND`.

**Duplicate conflict**

`409 DUPLICATE_REQUEST_CONFLICT`

Message:

`clientRequestId was already used for a different request`

**Unexpected failure**

`500 INTERNAL_ERROR`

Message:

`Unable to create ticket`

No partial Ticket is committed.

---

### GET `/api/tickets`

**Purpose**

Retrieve only Tickets owned by the selected Development Requester, with search, filters, sorting, and pagination.

**Context**

Required:

`X-Development-Requester-Id`

**Body**

None.

### Query Parameters

| Parameter | Default | Allowed / behavior |
|---|---|---|
| `search` | absent | Trimmed string up to 120 chars; case-insensitive substring across `ticketNumber` OR `summary`; empty after trim means no search restriction |
| `categoryId` | absent | Positive integer Category ID; combines with other restrictions using AND |
| `requestedPriority` | absent | `LOW`, `MEDIUM`, `HIGH` |
| `currentStatus` | absent | `NEW` |
| `sortBy` | `updatedAt` | `createdAt`, `updatedAt`, `ticketNumber`, `summary` |
| `sortDirection` | `desc` | `asc`, `desc` |
| `page` | `1` | Positive integer, 1-based |
| `pageSize` | `10` | `10`, `20`, `50` |

Rules:

- search fields combine with OR;
- search and supplied filters combine with AND;
- primary sort is always followed by `id desc` as deterministic secondary ordering;
- unknown query parameters are invalid;
- repeated scalar query parameters are invalid rather than silently choosing one;
- invalid values never cause an unrestricted fallback query.

A positive page beyond the current last page is valid and returns an empty `items` array.

When `totalItems = 0`, `totalPages = 0`.

### Success

`200 OK`

```json
{
  "items": [],
  "page": 1,
  "pageSize": 10,
  "totalItems": 0,
  "totalPages": 0
}
```

Each non-empty `items` entry is a `TicketListItem`.

The ownership predicate is applied in the database query.

### Invalid Query

`400 VALIDATION_ERROR`

`fieldErrors` uses the invalid query parameter name.

### Empty vs No Results

The API returns the same successful empty page shape for:

- Requester owns zero Tickets; or
- current search/filter restrictions match zero Tickets.

The client distinguishes the states using one additional unrestricted request under the same Requester context:

`GET /api/tickets?page=1&pageSize=10`

- unrestricted `totalItems > 0` => No Results;
- unrestricted `totalItems = 0` => Empty.

### Unexpected Failure

`500 INTERNAL_ERROR`

Message:

`Unable to load tickets`

---

### GET `/api/tickets/:ticketId`

**Purpose**

Retrieve one Ticket owned by the selected Development Requester.

**Context**

Required:

`X-Development-Requester-Id`

**Path**

`ticketId`

- positive integer.

**Query/body**

None.

### Success

`200 OK`

```json
{
  "ticket": {
    "...": "TicketDetail"
  }
}
```

`TicketDetail` includes active and removed Attachment metadata.

Attachment ordering:

1. `createdAt asc`
2. `id asc`

### Validation

Malformed/non-positive `ticketId`:

`400 VALIDATION_ERROR`

Use `fieldErrors.ticketId`.

### Missing / Ownership

A missing Ticket and a Ticket belonging to another Development Requester both return:

`404 RESOURCE_NOT_FOUND`

Message:

`Ticket not found`

### Unexpected Failure

`500 INTERNAL_ERROR`

Message:

`Unable to load ticket`

---

## 4. Attachment Endpoints

### POST `/api/tickets/:ticketId/attachments`

**Purpose**

Upload one Attachment to an owned Ticket.

**Context**

Required:

`X-Development-Requester-Id`

**Path**

`ticketId`

- positive integer.

**Request**

`multipart/form-data`

Exactly one file is uploaded in field:

`file`

One request uploads one file.

### Allowed Types

| Extension | MIME type |
|---|---|
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.png` | `image/png` |
| `.webp` | `image/webp` |
| `.pdf` | `application/pdf` |

Extension matching is case-insensitive.

The backend validates agreement between:

- allowed extension;
- declared MIME type; and
- expected JPEG/PNG/WEBP/PDF file signature.

### Size

Valid file size:

`1–5,242,880` bytes inclusive.

An empty file is invalid.

A file above 5 MB returns `413`.

### Filename and Storage

The user-supplied original filename:

- is retained only as metadata;
- is never used directly as a server filesystem path;
- is displayed/rendered as text rather than HTML.

The backend uses a generated UUID-based stored filename.

Stored bytes are placed in a local server upload directory excluded from Git and not directly served as public static files.

`storedName` and server filesystem paths never appear in API responses.

### Five-active-Attachment Rule

A Ticket may contain at most five Attachments with:

`removedAt = null`

The backend enforces this rule atomically so concurrent uploads cannot cause the Ticket to exceed five active Attachments.

Removed Attachments do not count toward the active limit.

### Storage / Compensation Behavior

Upload processing uses temporary/staging storage before the Attachment becomes valid application data.

Required outcome:

- validate file;
- place bytes under generated storage name;
- create Attachment metadata;
- update parent Ticket `updatedAt`;
- expose the Attachment only after the operation succeeds.

If storage or database work fails:

- do not leave valid API-addressable Attachment metadata pointing to an invalid file;
- remove temporary/final request-created bytes where possible;
- any leftover unreferenced bytes remain outside API reach;
- return a safe error without claiming cleanup succeeded when it did not.

A background/startup reconciliation subsystem is not required by Lab 2.

### Ambiguous Client Outcome

Attachment upload is not automatically retried.

After a lost/unknown upload response, the client reloads Attachment metadata before offering a manual retry.

Attachment-level idempotency is outside Lab 2.

### Success

`201 Created`

```json
{
  "attachment": {
    "id": 7,
    "ticketId": 42,
    "originalName": "email-error.png",
    "mimeType": "image/png",
    "sizeBytes": 125331,
    "state": "ACTIVE",
    "createdAt": "2026-08-23T09:35:00.000Z",
    "removedAt": null,
    "removalReason": null,
    "downloadUrl": "/api/tickets/42/attachments/7/download"
  }
}
```

### Failure Cases

**Validation**

`400 VALIDATION_ERROR`

Examples:

- malformed/non-positive Ticket ID;
- missing file;
- multiple files in one request;
- empty file.

**Unsupported/mismatched type**

`415 UNSUPPORTED_MEDIA_TYPE`

Message identifies the permitted file types safely.

**Oversized**

`413 PAYLOAD_TOO_LARGE`

Message:

`Attachment must not exceed 5 MB`

**Active Attachment limit**

`409 ATTACHMENT_LIMIT_REACHED`

Message:

`A ticket may have at most five active attachments`

**Missing / Ownership**

Missing Ticket and cross-Requester Ticket:

`404 RESOURCE_NOT_FOUND`

Message:

`Ticket not found`

**Unexpected failure**

`500 INTERNAL_ERROR`

Message:

`Unable to upload attachment`

No internal storage path/name is returned.

---

### GET `/api/tickets/:ticketId/attachments`

**Purpose**

Retrieve Attachment metadata for an owned Ticket.

**Context**

Required:

`X-Development-Requester-Id`

**Path**

`ticketId`

- positive integer.

**Query/body**

None.

### Success

`200 OK`

```json
{
  "items": []
}
```

`items` contains `AttachmentMetadata`.

Both Active and Removed metadata are returned.

Ordering:

1. `createdAt asc`
2. `id asc`

Removed Attachments have:

- `state: "REMOVED"`;
- non-null `removedAt`;
- non-null `removalReason`;
- `downloadUrl: null`.

`storedName` and filesystem paths are never returned.

### Validation

Malformed/non-positive `ticketId`:

`400 VALIDATION_ERROR`

### Missing / Ownership

Missing/cross-Requester Ticket:

`404 RESOURCE_NOT_FOUND`

Message:

`Ticket not found`

### Unexpected Failure

`500 INTERNAL_ERROR`

Message:

`Unable to load attachments`

---

### GET `/api/tickets/:ticketId/attachments/:attachmentId/download`

**Purpose**

Download one active owned Attachment.

**Context**

Required:

`X-Development-Requester-Id`

**Paths**

`ticketId`

- positive integer.

`attachmentId`

- positive integer;
- Attachment must belong to the specified Ticket.

### Success

`200 OK` binary response.

Headers include:

- validated `Content-Type`;
- `Content-Length` where available;
- `Content-Disposition: attachment` using the safe original filename;
- `X-Content-Type-Options: nosniff`;
- conservative no-store/private cache behavior.

### Validation

Malformed/non-positive path IDs:

`400 VALIDATION_ERROR`

Use named field errors.

### Missing / Ownership / Removed

The following all return identical non-disclosing:

`404 RESOURCE_NOT_FOUND`

Message:

`Attachment not found`

Cases:

- missing Ticket;
- cross-Requester Ticket;
- missing Attachment;
- Attachment belongs to another Ticket;
- removed Attachment.

### Active Metadata but Missing File Bytes

`500 INTERNAL_ERROR`

Message:

`Attachment is temporarily unavailable`

Do not expose its stored path.

### Other Unexpected Failure

Same safe `500 INTERNAL_ERROR` behavior.

---

### DELETE `/api/tickets/:ticketId/attachments/:attachmentId`

**Purpose**

Soft-remove one active Attachment from an owned Ticket.

**Context**

Required:

`X-Development-Requester-Id`

**Paths**

`ticketId`

- positive integer.

`attachmentId`

- positive integer;
- Attachment must belong to the specified Ticket.

**Header**

`Content-Type: application/json`

**Request**

```json
{
  "removalReason": "Contained an outdated screenshot"
}
```

`removalReason`:

- required;
- string;
- trimmed;
- `3–200` characters.

### Success

`200 OK`

```json
{
  "attachment": {
    "id": 7,
    "ticketId": 42,
    "originalName": "email-error.png",
    "mimeType": "image/png",
    "sizeBytes": 125331,
    "state": "REMOVED",
    "createdAt": "2026-08-23T09:35:00.000Z",
    "removedAt": "2026-08-23T10:10:00.000Z",
    "removalReason": "Contained an outdated screenshot",
    "downloadUrl": null
  }
}
```

Metadata removal state and parent Ticket `updatedAt` are changed atomically as part of the successful database operation.

Physical-byte deletion may be attempted after metadata state changes, but access denial depends on `removedAt`, not successful file deletion.

### Repeated Removal

A previously removed Attachment returns the same non-disclosing:

`404 RESOURCE_NOT_FOUND`

Message:

`Attachment not found`

The original removal metadata remains unchanged.

### Validation

Malformed IDs or invalid `removalReason`:

`400 VALIDATION_ERROR`

No removal occurs.

### Missing / Ownership

Missing/cross-Requester Ticket, mismatched/missing Attachment, or already removed Attachment:

`404 RESOURCE_NOT_FOUND`

Message:

`Attachment not found`

### Unexpected Failure

`500 INTERNAL_ERROR`

Message:

`Unable to remove attachment`

If the database operation did not commit, the Attachment remains active.

---

## 5. Status-code Matrix

| Status | Lab 2 use |
|---|---|
| `200` | Successful retrieval, successful exact Ticket replay, successful soft removal |
| `201` | First Ticket creation or Attachment upload |
| `400` | Invalid requester-context syntax, path/query/body validation, missing/empty upload |
| `404` | Unknown/inactive Development Requester context or non-disclosing missing/cross-Requester/removed resource |
| `409` | Conflicting `clientRequestId` reuse or five-active-Attachment limit |
| `413` | Attachment exceeds the 5 MB limit |
| `415` | Unsupported or mismatched Attachment type |
| `500` | Safe unexpected server failure |

Lab 2 does not use `401` or `403` because real authentication/authorization is explicitly outside this sprint. This does not make the Development Requester header a security mechanism.
