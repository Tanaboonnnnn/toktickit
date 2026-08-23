# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal

Deliver a Requester-facing TokTickIT minimum viable product specification that is clear enough to design, implement, test, review, and demonstrate without requiring the implementation agent to guess product behavior.

Lab 2 allows a tester to select a seeded Development Requester, create IT support Tickets, view only that Requester's Tickets, inspect Ticket Detail, and manage permitted Attachments. The Development Requester selector is temporary testing context only and is not authentication.

This specification defines the engineering contract for later Lab 2 implementation Issues. This specification Issue itself introduces no application behavior.

---

## 2. Stakeholder Request Interpretation

The stakeholder needs a complete Requester-facing ticket workflow before real authentication is introduced in Lab 3.

A tester must be able to:

- choose one of several active seeded Development Requesters;
- create an IT support Ticket;
- select a Category and Related System;
- indicate Requested Priority;
- provide a summary and description;
- attach permitted supporting files;
- receive an official backend-generated Ticket Number;
- locate the Ticket in My Tickets;
- search, filter, sort, and page through owned Tickets;
- open an owned Ticket Detail screen;
- inspect Attachment metadata;
- add, download, and soft-remove permitted Attachments; and
- switch Development Requester context and verify requester-specific ownership behavior.

The selected Development Requester represents only a development/testing context. It does not prove identity and must not be described as secure authentication.

The backend is authoritative for:

- official Ticket identity;
- Ticket defaults;
- Requester ownership;
- validation;
- reference-data validity;
- duplicate-submission handling;
- Attachment constraints; and
- safe error behavior.

The UI must provide meaningful states for:

- loading;
- validation;
- empty data;
- no matching results;
- success;
- partial Attachment success;
- unavailable data; and
- safe failure.

Lab 2 intentionally focuses on the Requester workflow and reusable UI foundations. Authentication, IT Staff workflow, collaboration features, administration, and later Ticket lifecycle behavior remain outside this sprint.

---

## 3. Scope

### Included

- Active Development Requester selection.
- Browser-tab `sessionStorage` persistence of the selected Development Requester ID.
- Validation and switching of Development Requester context.
- Active Category reference data.
- Active Related System reference data.
- Ticket creation with backend-generated identity and defaults.
- Duplicate Ticket-submission protection.
- Requester-owned My Tickets listing.
- Search, filtering, sorting, and pagination.
- Requester-owned Ticket Detail.
- Attachment selection and upload.
- Attachment metadata retrieval.
- Download of active owned Attachments.
- Soft removal of owned Attachments.
- Retention of removed Attachment metadata.
- Zen Green reusable UI presentation rules.
- Desktop, tablet, and mobile responsive behavior.
- Baseline keyboard and non-color accessibility.
- PostgreSQL/Prisma data-model design.
- Additive migration and idempotent seed strategy.
- REST API contract.
- Acceptance Criteria and Definition of Done.
- Planned Unit, API/Integration, UI Component, UI Style, Responsive, and E2E verification.

### Excluded

- Real login or logout.
- Passwords or password hashing.
- Authentication sessions.
- Authentication tokens.
- Authenticated identities.
- Real role-based authorization.
- IT Staff dashboards or queue.
- Ticket assignment or reassignment.
- IT Priority editing.
- Public Comments.
- Internal Notes.
- Actions Taken.
- Ticket status transitions after the initial New state.
- Resolution confirmation.
- Resolving or closing Tickets.
- Reopening or cancelling Tickets.
- Administrator functions.
- Administration of users or reference data.
- A dedicated inline Attachment preview feature.
- Product implementation code in this specification Issue.
- Prisma schema changes or migrations in this specification Issue.
- Express endpoint implementation in this specification Issue.
- React screen implementation in this specification Issue.
- Automated test implementation in this specification Issue.

---

## 4. Functional Requirements

- **FR-01 — Select Development Requester:**  
  The system shall retrieve and display only active Development Requesters and require a valid selection before Requester-scoped functionality can be used.

- **FR-02 — Persist and switch Development Requester context:**  
  The client shall retain the selected Development Requester ID in browser-tab `sessionStorage`, safely recover from a missing, malformed, unknown, or inactive value, and allow the tester to change Requester context.

- **FR-03 — Load Ticket reference data:**  
  The Create Ticket experience shall retrieve active Categories and active Related Systems from the backend and display the currently selected Development Requester as read-only context.

- **FR-04 — Create Ticket:**  
  The system shall create one Ticket from valid Category, Related System, Ticket Summary, Description, and Requested Priority input and return its official system-generated values.

- **FR-05 — Prevent duplicate Ticket creation:**  
  The system shall use a client-generated `clientRequestId` for each logical Ticket submission so that retrying the same submission cannot create a duplicate Ticket.

- **FR-06 — List My Tickets:**  
  The system shall return only Tickets owned by the currently selected Development Requester.

- **FR-07 — Search My Tickets:**  
  The tester shall be able to search owned Tickets by Ticket Number or Ticket Summary.

- **FR-08 — Filter My Tickets:**  
  The tester shall be able to filter owned Tickets by Category, Requested Priority, and Current Status.

- **FR-09 — Sort My Tickets:**  
  The tester shall be able to sort owned Tickets by documented sortable fields and direction using deterministic ordering.

- **FR-10 — Paginate My Tickets:**  
  The system shall provide 1-based pagination, permitted page sizes, and pagination metadata.

- **FR-11 — View Ticket Detail:**  
  The tester shall be able to open a read-only Ticket Detail screen for a Ticket owned by the selected Development Requester.

- **FR-12 — Upload Attachments:**  
  The tester shall be able to upload permitted Attachments to an owned Ticket without exceeding Attachment type, size, or active-count constraints.

- **FR-13 — Retrieve Attachment metadata:**  
  The system shall provide metadata for active and removed Attachments belonging to an owned Ticket.

- **FR-14 — Download Attachments:**  
  The tester shall be able to download an active Attachment belonging to an owned Ticket.

- **FR-15 — Soft-remove Attachments:**  
  The tester shall be able to soft-remove an active owned Attachment by supplying a valid removal reason while retaining removal metadata.

- **FR-16 — Communicate UI and failure states:**  
  The UI shall distinguish loading, validation, empty, no-results, success, partial-success, unavailable, and safe-failure states and shall retain recoverable user-entered data where specified.

- **FR-17 — Present Zen Green UI responsively:**  
  Development Requester Selection, Create Ticket, My Tickets, and Requester Ticket Detail shall follow the shared Zen Green visual and responsive contract.

- **FR-18 — Support keyboard and non-color understanding:**  
  Interactive controls shall provide programmatic labels, logical keyboard navigation, visible focus, and textual or iconic state information in addition to color.

---

## 5. Business Rules

- **BR-01:**  
  The official Ticket Number is generated by the backend and must be unique.

- **BR-02:**  
  A newly created Ticket begins with Current Status `NEW`, displayed to the user as `New`.

- **BR-03:**  
  Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not authentication.

- **BR-04:**  
  Ticket `id`, `ticketNumber`, `currentStatus`, `createdAt` (displayed as Ticket Date), and `updatedAt` are system-generated and read-only. Requester comes from validated Development Requester context and is displayed read-only. Category, Related System, Ticket Summary, Requested Priority, Description, and pre-submit Attachment selection are editable.

- **BR-05:**  
  The Development Requester selector displays active Requesters only. An inactive Requester cannot establish valid Development Requester context or create a Ticket.

- **BR-06:**  
  The client stores only the selected Requester's integer ID in browser-tab `sessionStorage`. A missing, malformed, unknown, or inactive stored value is cleared and returns the tester to Development Requester Selection before requester-owned data is shown.

- **BR-07:**  
  Changing Development Requester clears Requester-specific query, pagination, form, cached Ticket Detail, selected Attachment, validation, success, and failure state before data for the newly selected Requester is loaded.

- **BR-08:**  
  Ticket creation requires an active Development Requester, active Category, and active Related System when the backend validates the request.

- **BR-09:**  
  Ticket Summary is required, trimmed before validation/storage, and must contain 5–120 characters after trimming. Description is required, trimmed before validation/storage, and must contain 10–2000 characters after trimming. Whitespace-only input is invalid.

- **BR-10:**  
  Requested Priority is one of `LOW`, `MEDIUM`, or `HIGH`. The only Ticket Current Status value introduced in Lab 2 is `NEW`.

- **BR-11:**  
  Each logical Ticket submission uses a client-generated UUID `clientRequestId`, stored under a database unique constraint.

  Duplicate-request comparison uses the normalized Ticket content:

  - `requesterId`;
  - `categoryId`;
  - `relatedSystemId`;
  - trimmed `summary`;
  - `requestedPriority`; and
  - trimmed `description`.

  Attachment selection is not part of duplicate-request comparison because Attachments are uploaded only after Ticket creation.

  The first successful creation returns HTTP `201` with `replayed: false`.

  If the same Requester repeats the same normalized request using the same `clientRequestId`, no second Ticket is created and the API returns the existing Ticket with HTTP `200` and `replayed: true`.

  Reusing the same `clientRequestId` with different normalized Ticket content or a different Requester returns HTTP `409` and creates nothing.

  Concurrent identical requests must resolve the database uniqueness race without creating duplicate Tickets.

- **BR-12:**  
  Ticket Numbers use the human-readable format:

  `TKT-YYYYMMDD-XXXXXX`

  The date portion is the backend UTC creation date. `XXXXXX` contains uppercase `A–Z` and `0–9`.

  A database unique constraint is authoritative for Ticket Number uniqueness. If a generated candidate collides, the backend retries safely using a fresh candidate, up to five total attempts. A failed attempt must not leave a partial Ticket. Exhausting the retry limit returns a safe HTTP `500`.

- **BR-13:**  
  Requester-scoped endpoints require the development-only request header:

  `X-Development-Requester-Id`

  A missing or syntactically invalid header returns HTTP `400`.

  An unknown or inactive Requester context returns a non-disclosing HTTP `404`.

  An owned resource that does not exist and a resource owned by another Requester return the same non-disclosing HTTP `404` response.

  This header is development scoping input only and is not authentication.

- **BR-14:**  
  My Tickets search is case-insensitive, trims surrounding whitespace, and performs substring matching against `ticketNumber` and `summary`.

  A missing or trimmed-empty search value means no search restriction.

  The trimmed search term may contain at most 120 characters. A longer value returns HTTP `400`.

- **BR-15:**  
  Optional My Tickets filters are:

  - `categoryId`;
  - `requestedPriority`; and
  - `currentStatus`.

  Search and all supplied filters combine using logical AND.

- **BR-16:**  
  Allowed My Tickets sort fields are:

  - `createdAt`;
  - `updatedAt`;
  - `ticketNumber`; and
  - `summary`.

  Sort direction is `asc` or `desc`.

  Default ordering is:

  `updatedAt desc`

  followed by:

  `id desc`

  as the deterministic secondary order.

- **BR-17:**  
  My Tickets pagination is 1-based.

  `page`:

  - defaults to `1`;
  - must be a positive integer.

  `pageSize`:

  - defaults to `10`;
  - permitted values are `10`, `20`, or `50`.

  A positive page beyond the current `totalPages` returns HTTP `200` with an empty `items` array, the requested page number, and correct pagination totals.

  If `totalItems > 0`, the UI may request the final valid page after receiving an out-of-range empty page.

- **BR-18:**  
  The My Tickets UI distinguishes:

  **Empty:** the Requester owns zero Tickets with no active search/filter restrictions.

  **No Results:** the Requester owns at least one Ticket but the current search/filter combination matches zero Tickets.

  When the restricted result contains zero items, the UI determines the correct state using one additional first-page request under the same Requester context without search/filter restrictions.

  If that unrestricted request reports `totalItems > 0`, the state is No Results; otherwise the state is Empty.

- **BR-19:**  
  Allowed Attachment types are:

  - JPEG: MIME `image/jpeg`, extension `.jpg` or `.jpeg`;
  - PNG: MIME `image/png`, extension `.png`;
  - WEBP: MIME `image/webp`, extension `.webp`;
  - PDF: MIME `application/pdf`, extension `.pdf`.

  The normalized filename extension and declared MIME type must agree with the allowlist.

  The backend also verifies the expected file signature for the permitted file type so that a renamed unsupported file is not accepted only because its extension or declared MIME type appears valid.

- **BR-20:**  
  An Attachment may contain at most 5 MB (`5,242,880` bytes). Empty files are invalid.

- **BR-21:**  
  A Ticket may contain at most five active Attachments.

  An Attachment is active while `removedAt` is null.

  The backend enforces this count when an Attachment is created. A successfully removed Attachment no longer counts toward the active limit.

- **BR-22:**  
  Attachment metadata is stored in PostgreSQL.

  Attachment bytes are stored outside PostgreSQL in a local server upload directory excluded from Git.

  The backend uses a generated UUID-based stored filename. The original filename is retained only as metadata and must never be used directly as a filesystem path.

  Upload processing uses explicit temporary/staging cleanup and compensation behavior so that failed uploads do not leave valid downloadable Attachment metadata pointing to an invalid file and temporary files created by the failed request are removed where possible.

  Internal filesystem paths and generated storage names are never exposed through public API responses.

- **BR-23:**  
  Attachment removal is a soft removal of metadata.

  `removalReason`:

  - is required;
  - is trimmed;
  - must contain 3–200 characters.

  Removal records:

  - `removedAt`; and
  - `removalReason`.

  Removed Attachment metadata remains visible.

  Physical file bytes may be deleted after the metadata state changes, but denial of future download/preview depends on `removedAt`, not on physical file deletion succeeding.

- **BR-24:**  
  Removed Attachments cannot be downloaded or previewed.

  Download requests for:

  - a removed Attachment;
  - a missing Attachment; or
  - an Attachment belonging to another Requester

  return the same non-disclosing HTTP `404`.

  Lab 2 does not expose a dedicated inline-preview endpoint.

- **BR-25:**  
  Ticket creation completes before selected Attachments are uploaded.

  If one or more post-create Attachment uploads fail:

  - the Ticket remains created;
  - successful Attachment uploads remain;
  - the official Ticket Number remains visible;
  - failed filenames are identified safely;
  - user-entered Ticket information is not lost.

  While the Create Ticket success view remains mounted, an eligible failed file may remain selected for manual retry.

  After navigating away, the user must reselect a local file before retry because browsers do not persist local file bytes across navigation.

  After an ambiguous upload response, the client reloads Attachment metadata before offering another manual retry and does not automatically repeat the upload.

- **BR-26:**  
  Creating or soft-removing an Attachment updates the parent Ticket's `updatedAt` in the same successful database operation so My Tickets Last Updated and default sorting reflect Attachment activity.

  Reading Ticket data or downloading an Attachment does not update `updatedAt`.

- **BR-27:**  
  Frontend validation supplements but never replaces backend validation.

  During frontend validation failure or recoverable API failure, editable form values remain available for correction or retry. Eligible selected local files remain available while the current page is mounted.

  Unexpected API errors use a safe error envelope and expose no stack traces, filesystem paths, credentials, SQL, Prisma details, or database implementation details.

- **BR-28:**  
  Lab 3 will replace the Development Requester header with authenticated server-derived identity.

  Requester ownership checks should therefore be isolated behind a Requester-context boundary so changing the identity source does not change Ticket or Attachment ownership semantics.

---

## 6. UI Specification Summary

The detailed UI contract is defined in `ui-spec.md`. This section summarizes the product-level UI rules that implementation must follow.

### Application Shell and Navigation

The application shell displays:

- TokTickIT application identity;
- My Tickets navigation;
- Create Ticket navigation;
- currently selected Development Requester;
- Change Requester action; and
- a clear active-page indication.

Navigation must remain usable on desktop, tablet, and mobile.

### Development Requester Selection

The Development Requester Selection screen provides:

- TokTickIT identity;
- explanatory text stating that the selector is used only for Lab 2 testing;
- Development Requester dropdown;
- active Requesters loaded from PostgreSQL through the API;
- Continue action;
- loading state;
- no-active-Requester empty state;
- safe API-failure state; and
- keyboard-accessible controls.

### Create Ticket

Create Ticket:

- visually separates editable values from system-generated/read-only values;
- displays the selected Requester as read-only;
- displays Ticket Number and Ticket Date as pending system values before creation;
- loads Category and Related System reference data from the backend;
- displays required-field markers;
- provides field-level validation near the associated field;
- provides sufficient space for Ticket Summary and Description;
- presents Attachment selection and validation states;
- disables the Submit action and shows a visible busy state while processing;
- prevents duplicate submit actions during processing;
- retains editable input after recoverable failure; and
- displays the official backend-generated Ticket Number prominently after successful creation.

### My Tickets

My Tickets provides:

- search;
- Category filter;
- Requested Priority filter;
- Current Status filter;
- sorting;
- clear-search/filter behavior;
- pagination;
- Create Ticket action; and
- an action for opening Ticket Detail.

The UI distinguishes:

- Loading;
- Empty;
- No Results; and
- API Failure.

Desktop uses a table. Mobile uses a readable ticket-card representation.

The list contains enough information to identify a Ticket, including:

- Ticket Number;
- Created date;
- Ticket Summary;
- Category;
- Requested Priority;
- Current Status; and
- Last Updated.

### Requester Ticket Detail

Ticket Detail presents Ticket information as read-only.

Ticket information is visually separated from Attachment actions.

The screen does not include:

- Public Comments;
- Internal Notes;
- Actions Taken;
- IT Staff controls; or
- later Ticket-status workflow.

### Attachment Presentation

Attachment presentation distinguishes:

- selected;
- uploading;
- active;
- invalid;
- removed; and
- unavailable/error states.

Removed Attachment metadata remains readable, but download/preview actions are unavailable.

### Badges and States

Requested Priority and Current Status use consistent badge presentation.

Success, warning, validation, removal, priority, and status meaning must not rely on color alone.

### Zen Green Design Tokens

- Primary green: `#006B3C`
- Secondary green: `#0B7A46`
- Pale green: `#EAF6EF`
- Page background: `#F5F7F6` or a similarly quiet near-white
- Surfaces/cards: white with subtle border and restrained shadow
- Text: dark charcoal-green rather than pure black
- Editable fields: white with clear neutral border
- Read-only fields: distinct soft gray-green or warm-ivory treatment
- Errors: dark red text/border with field-level message
- Warnings: amber callout or badge
- Success: green confirmation plus readable text/non-color meaning

Controls must provide visually distinct:

- default;
- focused;
- invalid;
- disabled;
- read-only; and
- busy states.

### Responsive Behavior

Desktop (`>= 992px`):

- centered content with sensible maximum width;
- multi-column forms;
- My Tickets table.

Tablet (`768–991px`):

- two columns where practical;
- Ticket Summary and Description retain sufficient width.

Mobile (`< 768px`):

- fields stack vertically;
- ticket list uses readable cards;
- buttons remain touch-friendly;
- Attachment filenames wrap safely;
- no horizontal page scrolling.

At every supported width there must be:

- no clipped labels;
- no overlapping validation/messages;
- no hidden required actions;
- no unreadable Attachment names; and
- no unintended horizontal page scrolling.

---

## 7. Data Changes

The following is the target conceptual Prisma/PostgreSQL design for later Lab 2 implementation Issues. Names and enum values in this specification are normative unless changed through an explicit reviewed specification update.

| Model / table | Fields and constraints | Relationships and indexes |
|---|---|---|
| `RequesterUser` / `RequesterUser` | `id Int` PK autoincrement; `name String` non-null; `email String` non-null unique; `active Boolean` non-null default `true`; `createdAt DateTime` non-null default `now()`; `updatedAt DateTime` non-null auto-updated | One-to-many `tickets`; index `(active, name)` |
| `Category` / `Category` | Existing `id Int` PK autoincrement; `name String` non-null unique; `createdAt DateTime` non-null default `now()`; add `active Boolean` non-null default `true`; add `updatedAt DateTime` non-null auto-updated | One-to-many `tickets`; index `(active, name)` |
| `RelatedSystem` / `RelatedSystem` | `id Int` PK autoincrement; `name String` non-null unique; `active Boolean` non-null default `true`; `createdAt DateTime` non-null default `now()`; `updatedAt DateTime` non-null auto-updated | One-to-many `tickets`; index `(active, name)` |
| `Ticket` / `Ticket` | `id Int` PK autoincrement; `ticketNumber String` non-null unique; `clientRequestId String` non-null unique; `requesterId Int` non-null FK; `categoryId Int` non-null FK; `relatedSystemId Int` non-null FK; `summary String` non-null; `description String` non-null; `requestedPriority RequestedPriority` non-null; `currentStatus TicketStatus` non-null default `NEW`; `createdAt DateTime` non-null default `now()`; `updatedAt DateTime` non-null auto-updated | Belongs to Requester, Category, Related System; one-to-many Attachments; indexes `(requesterId, updatedAt, id)`, `(requesterId, createdAt, id)`, `(requesterId, categoryId)`, `(requesterId, requestedPriority)`, `(requesterId, currentStatus)` |
| `Attachment` / `Attachment` | `id Int` PK autoincrement; `ticketId Int` non-null FK; `originalName String` non-null; `storedName String` non-null unique; `mimeType String` non-null; `sizeBytes Int` non-null; `createdAt DateTime` non-null default `now()`; `removedAt DateTime` nullable; `removalReason String` nullable | Belongs to Ticket; indexes `(ticketId, removedAt, createdAt)` and `(ticketId, id)` |

### Enum Values

`RequestedPriority`:

- `LOW`
- `MEDIUM`
- `HIGH`

`TicketStatus` in Lab 2:

- `NEW`

### Required Relationships

- One Requester may own many Tickets.
- One Ticket belongs to one Requester.
- One Ticket may contain many Attachments.
- One Category may be referenced by many Tickets.
- One Related System may be referenced by many Tickets.

Required foreign keys use restrictive behavior so referenced Requesters/reference data cannot be silently deleted while Tickets still depend on them.

### Seed Data

The seed is deterministic and idempotent.

Categories are upserted by unique name:

- Account and Access
- Hardware
- Software
- Network

Related Systems are upserted by unique name:

- Student Portal
- Learning Management System
- Campus Wi-Fi
- University Email
- Library System
- Finance and Registration

Development Requesters are upserted by stable fictional email:

Active:

- Anan Student — `anan.student@example.test`
- Mali Student — `mali.student@example.test`
- Niran Student — `niran.student@example.test`
- Ploy Student — `ploy.student@example.test`

Inactive:

- Somchai Former Student — `somchai.former@example.test`

Re-running the seed:

- creates no duplicate required rows;
- updates the required Requester name/active values where needed;
- does not delete unrelated existing rows; and
- never exposes the inactive seeded Requester through the active Requester selector API.

### Migration Strategy and Rationale

Lab 2 creates one additive migration from the checked-in Lab 1 schema history.

The historical Lab 1 migration is not rewritten.

The Lab 2 migration:

- adds `active` and `updatedAt` to Category using safe migration behavior;
- creates the new enums;
- creates RequesterUser;
- creates RelatedSystem;
- creates Ticket;
- creates Attachment;
- creates required indexes;
- creates required foreign keys.

The idempotent seed runs after the migration.

**Database-design rationale:**  
Category remains a normalized reference model instead of becoming free-text Ticket data. This preserves the Lab 1 Category foundation, avoids spelling variants, allows Category deactivation for future creation while retaining historical Ticket relationships, and provides a clean path for later Administrator reference-data management.

Migration verification later includes:

- Prisma schema validation;
- Prisma client generation;
- applying migrations against the intended development/test database;
- repeated seed execution;
- checking migration status; and
- running database/API tests.

Destructive database reset and schema `db push` are not the normal Lab 2 delivery workflow.

---

## 8. API Contract

The detailed normative request/response JSON shapes are defined in `api-spec.md`.

### API Summary

| Capability | Method and Path | Requester Context | Successful Result |
|---|---|---|---|
| Retrieve active Categories | `GET /api/categories` | None | `200` active Category list |
| Retrieve active Related Systems | `GET /api/related-systems` | None | `200` active Related System list |
| Retrieve active Development Requesters | `GET /api/development-requesters` | None | `200` active Requester list |
| Create Ticket | `POST /api/tickets` | Required | `201` newly created Ticket or documented replay response |
| Retrieve My Tickets | `GET /api/tickets` | Required | `200` paginated owned Ticket list |
| Retrieve owned Ticket | `GET /api/tickets/:ticketId` | Required | `200` owned Ticket |
| Upload Attachment | `POST /api/tickets/:ticketId/attachments` | Required | `201` active Attachment metadata |
| Retrieve Attachment metadata | `GET /api/tickets/:ticketId/attachments` | Required | `200` Attachment metadata list |
| Download active Attachment | `GET /api/tickets/:ticketId/attachments/:attachmentId/download` | Required | `200` active Attachment bytes |
| Soft-remove Attachment | `DELETE /api/tickets/:ticketId/attachments/:attachmentId` | Required | `200` Removed Attachment metadata |

Requester-scoped endpoints use:

`X-Development-Requester-Id`

The header is a development testing mechanism and not authentication.

### Ticket Creation Request

`POST /api/tickets` accepts only client-editable Ticket input plus `clientRequestId`.

The request does not control authoritative values such as:

- Ticket Number;
- Ticket Date;
- Current Status; or
- final Requester ownership.

Those values are derived or validated by the backend.

### My Tickets Query

`GET /api/tickets` supports the search/filter/sort/pagination parameters defined in `api-spec.md`.

The successful response includes at least:

- `items`;
- `page`;
- `pageSize`;
- `totalItems`; and
- `totalPages`.

### Error Envelope

Validation errors use a safe structure such as:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fieldErrors": {
      "summary": "Summary is required"
    }
  }
}
```

Expected HTTP statuses include:

- `200` — successful retrieval, successful replay, successful soft removal;
- `201` — successful resource creation;
- `400` — invalid request/header/query/input;
- `404` — missing or non-disclosable owned resource/context;
- `409` — documented conflict;
- `413` — Attachment too large;
- `415` — unsupported or invalid Attachment type;
- `500` — safe unexpected server failure.

Unexpected errors never expose:

- stack traces;
- filesystem paths;
- credentials;
- SQL;
- Prisma implementation detail; or
- private database information.

`api-spec.md` remains authoritative for exact endpoint-specific request bodies, response bodies, query parameters, validation behavior, error codes, ownership behavior, and pagination semantics.

---

## 9. Acceptance Criteria

- **AC-01 — Active Requester selection:**  
  Given active and inactive seeded Requesters, when Development Requester Selection loads, then every active Requester and no inactive Requester is available for selection.

- **AC-02 — Missing Requester selection:**  
  Given no persisted Development Requester ID, when a Requester-scoped screen is opened, then the tester is returned to Development Requester Selection and no Requester-owned data is requested or displayed.

- **AC-03 — Invalid or inactive Requester selection:**  
  Given a malformed, unknown, or inactive persisted Development Requester ID, when context is restored, then the stored value is cleared and the tester returns to Development Requester Selection. Direct requester-scoped API use receives the documented `400` or non-disclosing `404`.

- **AC-04 — Requester switching:**  
  Given Requester A is selected with Requester-specific UI state, when the tester changes to Requester B, then A's form, query, pagination, detail, selected-file, validation, success, and failure state is cleared and only B's requester-specific data is loaded.

- **AC-05 — Valid Ticket creation:**  
  Given an active Requester, valid active reference data, and valid Ticket input, when the tester submits once, then exactly one Ticket is created and the success state displays its official Ticket Number.

- **AC-06 — Backend Ticket Number generation:**  
  Given a valid Ticket create request that does not provide an official Ticket Number, when creation succeeds, then the backend returns a unique Ticket Number matching `TKT-YYYYMMDD-XXXXXX`.

- **AC-07 — Defaults and read-only values:**  
  Given Create Ticket is displayed, then Requester is read-only and Ticket Number/Ticket Date are visibly system-generated values. After creation, Current Status is `NEW`, Ticket Date reflects `createdAt`, and system-generated values remain read-only.

- **AC-08 — Frontend validation:**  
  Given missing, whitespace-only, below-minimum, above-maximum, or otherwise invalid editable Ticket fields, when the tester attempts submission, then field-level validation is displayed, focus moves to the first invalid field, entered values remain, and no Ticket create request is sent.

- **AC-09 — Backend validation:**  
  Given invalid Ticket input or an inactive/invalid reference sent directly to the API, when the backend validates it, then no Ticket is created and the API returns the documented HTTP `400` safe validation response.

- **AC-10 — Duplicate submission:**  
  Given a Ticket was successfully created using a `clientRequestId`, when the same Requester repeats the same normalized logical request with that ID, then no second Ticket is created and the API returns HTTP `200` with the original Ticket and `replayed: true`. Reusing that ID with conflicting normalized content or another Requester returns HTTP `409`.

- **AC-11 — Ticket creation failure retains input:**  
  Given valid entered Ticket data and eligible selected files, when Ticket creation fails unexpectedly, then a safe error is displayed and editable Ticket data and eligible mounted file selections remain available for retry using the same logical `clientRequestId`.

- **AC-12 — My Tickets ownership:**  
  Given Tickets owned by multiple Development Requesters, when My Tickets loads for Requester A, then every returned and rendered Ticket belongs to A and no Ticket owned by another Requester is returned.

- **AC-13 — Search:**  
  Given owned Tickets containing matches in Ticket Number or Ticket Summary, when a valid trimmed case-insensitive search is applied, then matching Tickets are returned and non-matching Tickets are excluded.

- **AC-14 — Filters:**  
  Given owned Tickets with different Categories, Requested Priorities, and Current Status values, when one or more valid filters are applied, then every result satisfies all supplied filters.

- **AC-15 — Sorting:**  
  Given Tickets with equal and unequal sortable values, when an allowed sort field/direction is requested, then primary ordering is correct and ties use deterministic `id desc` ordering.

- **AC-16 — Pagination:**  
  Given more owned Tickets than one page can display, when the tester changes page or permitted page size, then the correct `items`, `page`, `pageSize`, `totalItems`, and `totalPages` are returned and displayed. An out-of-range positive page is valid at the API and returns an empty list with correct totals.

- **AC-17 — Invalid list parameters:**  
  Given an invalid page, page size, filter, search length, sort field, or sort direction, when My Tickets is requested, then the API returns HTTP `400` with safe validation detail and does not silently perform an unrestricted fallback.

- **AC-18 — Empty My Tickets:**  
  Given the selected Requester owns zero Tickets and no search/filter restriction is applied, when My Tickets loads, then the Empty state explains that no Tickets exist and provides a clear Create Ticket action.

- **AC-19 — No Results:**  
  Given the selected Requester owns at least one Ticket but the current search/filter combination matches none, when results load, then the No Results state is displayed, provides a way to clear search/filters, and does not claim that the Requester owns no Tickets.

- **AC-20 — Owned Ticket Detail:**  
  Given an owned Ticket ID, when Requester Ticket Detail opens, then Ticket header information is displayed read-only and Attachment metadata is presented in the separate Attachment area.

- **AC-21 — Cross-Requester Ticket access:**  
  Given a Ticket owned by Requester B, when Requester A requests that Ticket directly, then the API returns the same non-disclosing HTTP `404` shape used for a missing Ticket, exposes no Ticket information, and the UI presents a safe unavailable state.

- **AC-22 — Valid Attachment upload:**  
  Given an owned Ticket with fewer than five active Attachments and a valid non-empty JPG/JPEG, PNG, WEBP, or PDF no larger than 5 MB, when the file is uploaded, then active Attachment metadata is created and returned.

- **AC-23 — Unsupported Attachment:**  
  Given an unsupported file, an extension/MIME mismatch, or permitted-looking metadata whose bytes do not match the expected file signature, when upload is attempted, then no valid Attachment metadata/file is retained and the API returns HTTP `415` with a safe file error.

- **AC-24 — Oversized Attachment:**  
  Given a file larger than `5,242,880` bytes, when upload is attempted, then no valid Attachment metadata/file is retained and the API returns HTTP `413`.

- **AC-25 — Active Attachment limit:**  
  Given a Ticket already has five active Attachments, when another upload is attempted, then the API returns HTTP `409` and creates no additional active Attachment. After one existing Attachment is successfully soft-removed, one replacement Attachment may be uploaded.

- **AC-26 — Attachment metadata retrieval:**  
  Given active and removed Attachments belonging to an owned Ticket, when Attachment metadata is retrieved, then active and removed metadata is returned in deterministic order without exposing generated storage names or filesystem paths.

- **AC-27 — Active Attachment download:**  
  Given an active owned Attachment, when the tester requests download, then the API returns the file bytes with safe content-type and attachment filename headers.

- **AC-28 — Soft removal with reason:**  
  Given an active owned Attachment and a trimmed removal reason containing 3–200 characters, when removal is confirmed, then `removedAt` and `removalReason` are recorded and Removed metadata is returned. An invalid removal reason returns HTTP `400` and leaves the Attachment active.

- **AC-29 — Retained removed Attachment metadata:**  
  Given a removed Attachment, when Ticket Detail or Attachment metadata reloads, then the original filename, size, type, created time, removed time, removal reason, and Removed state remain visible.

- **AC-30 — Block removed Attachment download:**  
  Given a removed Attachment, when download is requested or Attachment actions render, then the API returns the non-disclosing HTTP `404` and the UI offers no download or preview action.

- **AC-31 — Cross-Requester Attachment access:**  
  Given an Attachment belongs to Requester B's Ticket, when Requester A attempts Attachment metadata retrieval, upload through that Ticket, download, or removal, then the relevant operation returns the documented non-disclosing HTTP `404` and changes nothing.

- **AC-32 — Partial Attachment failure:**  
  Given Ticket creation succeeds and one or more post-create Attachment uploads fail, then the Ticket and successful Attachment uploads remain, the official Ticket Number remains visible, and failed filenames are identified safely. Eligible files may be manually retried while the success view remains mounted. After navigation, retry requires reselecting the local file. After an ambiguous upload outcome, Attachment metadata is reloaded before another manual retry is offered.

- **AC-33 — Desktop layout:**  
  Given a viewport at least `992px` wide, when each Lab 2 screen renders, then the centered multi-column/table layout contains no clipped labels, overlapping messages, hidden required buttons, unreadable Attachment names, or unintended horizontal page scrolling.

- **AC-34 — Tablet layout:**  
  Given a viewport between `768px` and `991px`, when each Lab 2 screen renders, then two columns are used only where practical, Ticket Summary and Description remain comfortably readable, and no clipping, overlap, hidden actions, or horizontal overflow occurs.

- **AC-35 — Mobile layout:**  
  Given a viewport below `768px`, when each Lab 2 screen renders, then fields stack vertically, My Tickets uses a readable mobile representation, buttons remain touch-friendly, Attachment names wrap safely, and the page has no unintended horizontal scrolling.

- **AC-36 — Keyboard and focus accessibility:**  
  Given keyboard-only interaction, when the tester navigates the Lab 2 Requester workflows, then controls have programmatically associated labels, focus order is logical, focus is visible, validation is associated with the relevant field, icon-only controls have accessible names where present, and status meaning does not depend only on color.

- **AC-37 — Safe unexpected failure:**  
  Given an unexpected backend failure on a JSON endpoint, when the response is returned, then the endpoint uses the documented safe HTTP `500` error envelope and includes no stack trace, filesystem path, credentials, SQL, Prisma detail, or private database information.

- **AC-38 — Reference-data availability:**  
  Given Create Ticket opens for an active Development Requester, when Category and Related System data loads successfully, then only active choices appear in deterministic order. If either required reference list is empty, the UI explains that Ticket creation is unavailable, prevents submission, and retains entered form data.

---

## 10. Definition of Done

Lab 2 is complete only when both product behavior and course-delivery evidence satisfy the engineering contract.

### Product Definition of Done

- Development Requester Selection satisfies its Acceptance Criteria.
- Create Ticket satisfies its Acceptance Criteria.
- My Tickets satisfies its Acceptance Criteria.
- Requester Ticket Detail satisfies its Acceptance Criteria.
- Attachment upload, metadata, download, and soft removal satisfy their Acceptance Criteria.
- Requester ownership is enforced by the backend for Requester-scoped resources.
- Frontend and backend validation are consistent with this specification.
- PostgreSQL data is accessed through the approved Prisma design.
- Required migration and idempotent seed behavior work on the intended development/test environment.
- Zen Green UI behavior matches `ui-spec.md`.
- Desktop, tablet, and mobile requirements are satisfied.
- Required states are understandable without relying only on color.
- Every Acceptance Criterion has traceable verification evidence at the appropriate level defined in `tests.md`.
- Required Unit tests pass.
- Required API/Integration tests pass.
- Required UI Component tests pass.
- Required UI Style tests pass.
- Required Responsive checks pass.
- Required Playwright E2E tests pass.
- Required desktop, tablet, and mobile Playwright screenshots have been inspected.
- Existing required Lab 1 behavior remains working unless an explicitly approved Lab 2 change replaces it.
- No excluded Lab 3/later functionality is introduced.

### Course Delivery Definition of Done

- Lab 2 work is decomposed into GitHub Issues.
- Work is implemented on feature branches rather than directly on `main` or `lab2-staging`.
- Feature work enters `lab2-staging` through Pull Requests.
- Real peer review is performed and recorded.
- Required passing test evidence is recorded before merge.
- The integrated `lab2-staging` result is verified before the Lab 2 release Pull Request.
- Lab 2 is released to `main` through the required release Pull Request.
- Required tests pass on the final integrated Lab 2 result.
- Documentation reflects the actual implementation.
- `reviewer.md` contains only real review evidence.
- `ai-use.md` contains only real AI usage and reflection.
- No secrets, local upload files, `node_modules`, generated build output, or unrelated changes are committed.

---

## 11. Assumptions and Decisions

The following are student engineering decisions made to resolve ambiguities in the stakeholder request and Lab 2 handout. They are not claims that the handout mandated these exact implementation choices.

- Use the model name `RequesterUser` to distinguish the temporary Lab 2 requester identity model from real authenticated users introduced later.

- Store the selected Development Requester integer ID in browser-tab `sessionStorage` rather than persistent local storage. This limits the lifetime of the temporary testing context and avoids implying long-lived authentication.

- Centralize Requester context so Lab 3 can later replace Development Requester selection/header input with authenticated server-derived identity without changing Ticket/Attachment ownership rules.

- Preserve the existing Lab 1 `GET /api/categories` success-shape convention where practical and use a consistent simple list shape for new reference-data endpoints while standardizing safe error responses.

- Add `active` and `updatedAt` to Category through a new additive migration rather than rewriting Lab 1 migration history.

- Use Ticket Summary length `5–120` characters after trimming.

- Use Description length `10–2000` characters after trimming.

- Use Requested Priority values `LOW`, `MEDIUM`, and `HIGH`.

- Use backend UTC timestamps and ISO 8601 UTC values in JSON responses.

- Use the official Ticket Number format `TKT-YYYYMMDD-XXXXXX`.

- Use a client-generated UUID `clientRequestId` and explicit first-create/replay/conflict behavior to prevent duplicate Ticket creation.

- Define normalized duplicate Ticket content as Requester, Category, Related System, trimmed Summary, Requested Priority, and trimmed Description. Attachments are excluded because they upload after Ticket creation.

- Use integer resource IDs in REST paths.

- Use the development-only `X-Development-Requester-Id` header for Requester-scoped endpoints. It is scoping input, not proof of identity.

- Return the same non-disclosing `404` behavior for a missing owned resource and a resource owned by another Development Requester.

- Use case-insensitive substring search for Ticket Number and Ticket Summary.

- Use 1-based My Tickets pagination.

- Use default `pageSize = 10` and permitted page sizes `10`, `20`, and `50`.

- Use default My Tickets ordering `updatedAt desc`, then `id desc`.

- Return a valid empty result for a positive page beyond the available page range rather than turning ordinary pagination drift into an API error.

- Distinguish Empty from No Results using one unrestricted first-page ownership query when a restricted query returns no items.

- Store Attachment metadata in PostgreSQL and Attachment bytes outside PostgreSQL in a Git-excluded server upload directory.

- Use generated UUID-based stored filenames and never use the user-supplied original filename as a filesystem path.

- Verify permitted Attachment extension, MIME type, and basic file signature on the backend.

- Upload one Attachment per multipart request. This simplifies per-file validation, five-active-file enforcement, retry behavior, and partial-success reporting.

- Require an Attachment removal reason containing 3–200 trimmed characters.

- Treat metadata soft removal as authoritative. Removed Attachment download remains denied even if later physical-byte cleanup fails.

- Create the Ticket before uploading selected Attachments. Attachment upload failure does not roll back a successfully created Ticket.

- Use explicit upload compensation/cleanup behavior for failed upload requests rather than introducing a separate background/startup reconciliation subsystem in Lab 2.

- The current project does not yet include Playwright. A later Lab 2 testing Issue must add and configure Playwright before the required Responsive/E2E verification and desktop/tablet/mobile screenshots are produced.

- Seed fictional Development Requester identities and deterministic Related System values so development, tests, reviews, and demonstrations do not depend on real personal data.

- Future changes to these decisions require an explicit specification update when they alter observable behavior, API behavior, data design, Acceptance Criteria, or required tests.

No unresolved Lab 2 product behavior is intentionally left for a coding agent to guess. Human review remains required before this engineering contract is approved for implementation.
