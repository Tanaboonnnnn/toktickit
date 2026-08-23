# Lab 2 Test Plan and Results

## 1. Test Strategy

Lab 2 uses layered verification.

- Pure validation and formatting rules are checked with Vitest unit tests.
- REST behavior, PostgreSQL interaction, requester ownership, database constraints, and attachment compensation behavior are checked with Vitest/Supertest API or integration tests against isolated test data.
- React behavior is checked with Testing Library.
- Zen Green component/state rules are checked with DOM/class/style assertions where automation is practical.
- Playwright covers full browser journeys, responsive behavior, and required desktop/tablet/mobile evidence screenshots.
- Manual visual inspection supplements automation where visual quality cannot be proven reliably by a single assertion.

Tests must use fictional Development Requesters, an isolated test database, and temporary upload directories. Tests clean up only data/files they create.

This is a specification-only Issue. Every planned test below begins with `Final = Planned`. A test may become `Pass` only after the test file exists, the test has actually run, and the result has been verified. Existing Lab 1 tests remain required regression evidence but are not substitutes for Lab 2 Acceptance-Criterion evidence.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UT-01 | Unit | BR-08–BR-10; AC-08, AC-09 | Ticket trimming, required values, enums, and exact Summary/Description boundaries | Valid boundaries normalize correctly; invalid and whitespace-only values return named validation errors | `server/tests/lab-02/ticket-validation.unit.test.ts` | Planned |
| UT-02 | Unit | BR-11; AC-10 | `clientRequestId` validation and normalized duplicate-request comparison | Same Requester + same normalized Ticket data is replay-compatible; changed Ticket data or Requester conflicts | `server/tests/lab-02/ticket-idempotency.unit.test.ts` | Planned |
| UT-03 | Unit | BR-01, BR-12; AC-06 | UTC Ticket Number format and collision retry limit | Format matches `TKT-YYYYMMDD-XXXXXX`; at most five total candidates are attempted; exhaustion fails safely | `server/tests/lab-02/ticket-number.unit.test.ts` | Planned |
| UT-04 | Unit | BR-14–BR-17; AC-13–AC-17 | My Tickets query parsing, defaults, allowlists, search-length boundary, and deterministic secondary sort | Valid query values normalize correctly; documented invalid values are rejected | `server/tests/lab-02/ticket-query.unit.test.ts` | Planned |
| UT-05 | Unit | BR-19, BR-20; AC-22–AC-24 | Attachment extension/MIME/file-signature agreement and size boundaries | Only permitted combinations with valid signatures and inclusive size limits pass | `server/tests/lab-02/attachment-validation.unit.test.ts` | Planned |
| UT-06 | Unit | BR-21, BR-23; AC-25, AC-28 | Active Attachment count and trimmed 3–200 character removal reason | Removed rows do not count toward the limit; a sixth active Attachment and invalid removal reasons fail | `server/tests/lab-02/attachment-rules.unit.test.ts` | Planned |
| UT-07 | Unit | BR-05–BR-07; AC-02–AC-04 | Development Requester `sessionStorage` restore, invalidation, and switching | Valid active ID restores; invalid/inactive ID clears; switching clears scoped client state before new data loads | `client/tests/lab-02/requester-context.unit.test.tsx` | Planned |
| UT-08 | Unit | BR-27; AC-37 | Safe API error serialization | Stable safe envelope is returned without stack traces, credentials, SQL, filesystem paths, Prisma details, or database internals | `server/tests/lab-02/error-response.unit.test.ts` | Planned |
| API-01 | API / Integration | FR-01, FR-03; AC-01, AC-38 | Active Category, Related System, and Development Requester reference endpoints and deterministic ordering | `200` responses contain only active rows in deterministic order; empty Category/Related System arrays remain valid responses | `server/tests/lab-02/reference-data.api.test.ts` | Planned |
| API-02 | API / Integration | BR-05, BR-06, BR-13; AC-03 | Missing/malformed/unknown/inactive `X-Development-Requester-Id` | Missing/syntactically invalid context is `400`; unknown/inactive context is the documented safe non-disclosing `404` | `server/tests/lab-02/requester-context.api.test.ts` | Planned |
| API-03 | API / Integration | FR-04; AC-05–AC-07 | Valid Ticket creation and backend-controlled values | Exactly one Ticket is created; `201` shape, unique Ticket Number, `NEW`, requester ownership, and timestamps are correct | `server/tests/lab-02/tickets-create.api.test.ts` | Planned |
| API-04 | API / Integration | BR-08–BR-10; AC-09 | Direct invalid Ticket creation and exact field/reference boundaries | `400` field errors; invalid/inactive references are rejected; no Ticket is created | `server/tests/lab-02/tickets-create-validation.api.test.ts` | Planned |
| API-05 | API / Integration | BR-11; AC-10 | First create, sequential/concurrent identical retry, and changed-payload/Requester reuse | First request is `201`; identical retry returns one existing Ticket with `200/replayed: true`; conflicting reuse is `409`; database contains one logical Ticket | `server/tests/lab-02/tickets-idempotency.api.test.ts` | Planned |
| API-06 | API / Integration | BR-12, BR-27; AC-11, AC-37 | Forced Ticket Number generation/database failure and no-partial-result behavior | Safe `500`; no partial Ticket is left; no secret/internal details are exposed; the logical retry can still be attempted safely | `server/tests/lab-02/tickets-failure.api.test.ts` | Planned |
| API-07 | API / Integration | FR-06; AC-12 | Multi-Requester My Tickets ownership isolation at query level | Requester A receives only A-owned Ticket rows | `server/tests/lab-02/tickets-ownership.api.test.ts` | Planned |
| API-08 | API / Integration | FR-07, FR-08; AC-13, AC-14 | Trimmed case-insensitive Ticket Number/Summary search plus AND-combined filters | Only owned Tickets matching the documented search/filter restrictions are returned | `server/tests/lab-02/tickets-query.api.test.ts` | Planned |
| API-09 | API / Integration | FR-09, FR-10; AC-15–AC-17 | Allowed sort fields/directions, tie order, allowed page sizes, out-of-range pages, and documented invalid parameters | Deterministic pages and metadata; positive out-of-range page is valid/empty; documented invalid values return `400` | `server/tests/lab-02/tickets-pagination.api.test.ts` | Planned |
| API-10 | API / Integration | FR-11; AC-20, AC-21 | Owned Ticket Detail and missing/cross-owner equivalence | Owned detail is `200`; missing and foreign-owned Ticket IDs return the same non-disclosing `404` shape | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| API-11 | API / Integration | FR-12; AC-22 | Each permitted extension/MIME/signature, exact 5-MB boundary, generated storage name, hidden storage details, and parent Ticket `updatedAt` | Valid uploads return `201` Active metadata; generated storage name/path is not exposed; original filename is retained only as metadata; parent `updatedAt` advances | `server/tests/lab-02/attachments-upload.api.test.ts` | Planned |
| API-12 | API / Integration | BR-19; AC-23 | Unsupported type, extension/MIME mismatch, and mismatched file signature | `415`; no valid Attachment metadata or downloadable file remains | `server/tests/lab-02/attachments-upload-type.api.test.ts` | Planned |
| API-13 | API / Integration | BR-20; AC-24 | Empty file and 5-MB-plus-one-byte upload | Empty file is rejected with documented validation error; oversized file is `413`; no valid Attachment metadata/file remains | `server/tests/lab-02/attachments-upload-size.api.test.ts` | Planned |
| API-14 | API / Integration | BR-21; AC-25 | Five-active limit, concurrent limit enforcement, and replacement after removal | Active count never exceeds five; extra upload is `409`; after removal one replacement succeeds | `server/tests/lab-02/attachments-limit.api.test.ts` | Planned |
| API-15 | API / Integration | FR-13; AC-26, AC-29 | Deterministic active/removed Attachment metadata list | Active and Removed states are returned correctly; removal fields are present; no `storedName` or filesystem path is exposed | `server/tests/lab-02/attachments-metadata.api.test.ts` | Planned |
| API-16 | API / Integration | FR-14; AC-27, AC-30 | Active Attachment download headers/bytes and removed-download denial | Active file returns exact bytes and safe headers; removed Attachment returns the same safe `404` behavior as a missing resource | `server/tests/lab-02/attachments-download.api.test.ts` | Planned |
| API-17 | API / Integration | FR-15; AC-28–AC-30 | Removal-reason boundaries, soft removal, parent Ticket touch, and repeated removal | Valid reason persists removal metadata and advances parent `updatedAt`; invalid reason is `400`; repeated removal is non-disclosing `404` with no additional change | `server/tests/lab-02/attachments-remove.api.test.ts` | Planned |
| API-18 | API / Integration | BR-13, BR-22, BR-27; AC-31, AC-37 | Cross-owner Attachment operations and forced storage/database failure during upload | Cross-owner operations return non-disclosing `404` and change nothing; failed upload leaves no valid downloadable metadata/file; request-created temporary files are cleaned where possible; safe errors expose no internal storage detail | `server/tests/lab-02/attachments-ownership-failure.api.test.ts` | Planned |
| API-19 | API / Integration | Data Changes; Definition of Done | Clean migration, required indexes/FKs/enums, deterministic seed, inactive Requester filtering, and repeated seed | Migration succeeds on intended clean test DB; required fixtures exist; second seed creates no duplicates; required schema constraints/indexes exist | `server/tests/lab-02/database-migration-seed.integration.test.ts` | Planned |
| API-20 | API / Integration | BR-27; AC-37 | Forced unexpected failure on representative JSON reference/list/detail/metadata/removal endpoints | Each tested endpoint returns the documented safe `500` envelope without internal details | `server/tests/lab-02/all-endpoints-failure.api.test.ts` | Planned |
| UI-01 | UI Component | FR-01, FR-02; AC-01–AC-03 | Development Requester selector loading, active options, empty/failure, and invalid persisted context | Correct state renders; inactive Requesters stay hidden; retry works; requester-owned data is not fetched with invalid context | `client/tests/lab-02/RequesterSelection.test.tsx` | Planned |
| UI-02 | UI Component | BR-07; AC-04 | Switching Requester with existing requester-specific form/query/detail/file state | All Requester-A scoped state clears before Requester-B data loads; new ID persists; stale A data is not shown | `client/tests/lab-02/RequesterSwitcher.test.tsx` | Planned |
| UI-03 | UI Component | FR-03, FR-04; AC-07, AC-38 | Create Ticket required/read-only fields, reference loading, and unavailable required references | Required editable/system fields match the contract; empty Category or Related System data explains unavailability, blocks submission, and retains entered form data | `client/tests/lab-02/CreateTicketForm.test.tsx` | Planned |
| UI-04 | UI Component | FR-16; AC-08, AC-11 | Client field boundaries, first-invalid focus, and Ticket-create API failure retention | Invalid form is not submitted; accessible field errors appear; entered Ticket data and eligible mounted file selections remain on recoverable failure | `client/tests/lab-02/CreateTicketValidation.test.tsx` | Planned |
| UI-05 | UI Component | FR-04, FR-05; AC-05, AC-10, AC-32 | Busy submit, duplicate replay response, success, partial Attachment failure, and ambiguous upload response | One logical Ticket is created; busy state prevents duplicate click submission; official Ticket Number persists; Attachment metadata reload occurs before ambiguous retry; after navigation the user must reselect local file | `client/tests/lab-02/CreateTicketSubmission.test.tsx` | Planned |
| UI-06 | UI Component | FR-06, FR-16; AC-18, AC-19, AC-37 | My Tickets Loading, Empty, No Results, and Failure states | Four states have distinct wording/actions; no stale Ticket rows leak between states | `client/tests/lab-02/MyTicketsStates.test.tsx` | Planned |
| UI-07 | UI Component | FR-07–FR-10; AC-13–AC-17 | Search, filters, sorting, clear behavior, pagination, and out-of-range recovery | Controls send documented query values; rendered results/metadata update correctly; clearing restrictions works; out-of-range recovery requests the last valid page when required | `client/tests/lab-02/MyTicketsControls.test.tsx` | Planned |
| UI-08 | UI Component | FR-11; AC-20, AC-21 | Ticket Detail read-only rendering and unavailable state | Owned Ticket/Attachment metadata renders read-only; `404` produces neutral unavailable wording without foreign-resource detail | `client/tests/lab-02/TicketDetail.test.tsx` | Planned |
| UI-09 | UI Component | FR-12–FR-15; AC-22–AC-30, AC-32 | Selected/uploading/active/invalid/removed/unavailable Attachment states and actions | Actions/state labels follow the lifecycle; Removed metadata remains visible but no download/preview action is available | `client/tests/lab-02/AttachmentPanel.test.tsx` | Planned |
| UI-10 | UI Component | FR-18; AC-36 | Labels, validation associations/live messages, focus movement, and keyboard operation of interactive controls | Accessible names, logical keyboard order, visible focus, error associations, and keyboard operation satisfy the UI contract | `client/tests/lab-02/accessibility.test.tsx` | Planned |
| STYLE-01 | UI Style | FR-17; AC-33–AC-35 | Zen Green tokens, surfaces, editable/read-only controls, focus, and button/state variants | Required tokens/classes/state distinctions are present consistently without conflicting inline styles | `client/tests/lab-02/zen-green-styles.test.tsx` | Planned |
| STYLE-02 | UI Style | FR-18; AC-36 | Error/warning/success/priority/status/removal non-color cues | Each state includes readable text and/or an accessible icon/label in addition to color | `client/tests/lab-02/state-indicators.test.tsx` | Planned |
| STYLE-03 | UI Style | FR-17; AC-33–AC-35 | Wrapping/reflow rules for labels, validation messages, summaries, and filenames | No fixed-width/nowrap rule forces page overflow; long content can wrap/reflow safely | `client/tests/lab-02/responsive-styles.test.tsx` | Planned |
| STYLE-04 | UI Style | Excluded Scope; AC-20 | Ticket Detail action inventory | No IT Staff, Public Comment, Internal Note, Actions Taken, assignment, IT Priority edit, or status-change controls render | `client/tests/lab-02/ticket-detail-scope.test.tsx` | Planned |
| RESP-01 | Responsive | FR-17; AC-33 | 1440×900 desktop visual/overflow checks on required screens | Multi-column/table layout; no clipping, overlap, hidden required actions, unreadable filenames, or page overflow | `e2e/lab-02/responsive-desktop.spec.ts` | Planned |
| RESP-02 | Responsive | FR-17; AC-34 | 834×1112 tablet visual/overflow checks on required screens | Practical two-column reflow; Summary/Description and controls remain readable; no clipping/overflow defects | `e2e/lab-02/responsive-tablet.spec.ts` | Planned |
| RESP-03 | Responsive | FR-17; AC-35 | 390×844 mobile checks on required screens | Single-column forms/cards; touch-friendly actions; safe filename wrapping; no horizontal page scrolling | `e2e/lab-02/responsive-mobile.spec.ts` | Planned |
| E2E-01 | E2E | FR-01–FR-06; AC-01, AC-04–AC-07, AC-12 | Select Requester A, create Ticket, switch to B, then switch back | Official Ticket appears only for A; Development Requester context and requester-owned data transitions are correct | `e2e/lab-02/requester-ticket-journey.spec.ts` | Planned |
| E2E-02 | E2E | FR-04, FR-16; AC-08, AC-09, AC-11 | Client validation, server rejection, forced failure, corrected retry | Data is retained according to contract and exactly one corrected Ticket is eventually created | `e2e/lab-02/create-validation-retry.spec.ts` | Planned |
| E2E-03 | E2E | FR-05; AC-10 | Simulated lost first Ticket-create response followed by same-key retry | Browser receives/displays the original Ticket and the database contains one logical Ticket | `e2e/lab-02/duplicate-submission.spec.ts` | Planned |
| E2E-04 | E2E | FR-06–FR-10; AC-13–AC-19 | Search, combined filters, sorting/ties, page sizes, out-of-range recovery, Empty, and No Results | UI controls, results, pagination metadata, Empty, and No Results remain consistent with documented query behavior | `e2e/lab-02/my-tickets.spec.ts` | Planned |
| E2E-05 | E2E | FR-11; AC-20, AC-21 | Open owned Ticket Detail and attempt direct cross-owner Ticket URL | Owned read-only detail works; foreign URL reveals no Ticket data and changes nothing | `e2e/lab-02/ticket-detail-ownership.spec.ts` | Planned |
| E2E-06 | E2E | FR-12–FR-15; AC-22–AC-32 | Permitted/invalid/oversized/limit uploads, download, removal, replacement, partial failure, ambiguous response, and cross-owner denial | Attachment lifecycle and partial-success behavior match the contract; removed/cross-owner files remain inaccessible | `e2e/lab-02/attachment-lifecycle.spec.ts` | Planned |
| E2E-07 | E2E | FR-18; AC-36, AC-37 | Keyboard-only core journeys, visible focus, validation feedback, and safe forced-500 UI | Required actions are keyboard reachable/understandable; focus remains visible; validation is associated correctly; safe failure shows no internal details | `e2e/lab-02/accessibility-failure.spec.ts` | Planned |

Planned count: Unit 8; API / Integration 20; UI Component 10; UI Style 4; Responsive 3; E2E 7; total 52.

---

## 3. Acceptance-Criterion Traceability

| AC | Planned test coverage |
|---|---|
| AC-01 | API-01, UI-01, E2E-01 |
| AC-02 | UT-07, UI-01 |
| AC-03 | UT-07, API-02, UI-01 |
| AC-04 | UT-07, UI-02, E2E-01 |
| AC-05 | API-03, UI-05, E2E-01 |
| AC-06 | UT-03, API-03, E2E-01 |
| AC-07 | API-03, UI-03, E2E-01 |
| AC-08 | UT-01, UI-04, E2E-02 |
| AC-09 | UT-01, API-04, E2E-02 |
| AC-10 | UT-02, API-05, UI-05, E2E-03 |
| AC-11 | API-06, UI-04, E2E-02 |
| AC-12 | API-07, E2E-01 |
| AC-13 | UT-04, API-08, UI-07, E2E-04 |
| AC-14 | UT-04, API-08, UI-07, E2E-04 |
| AC-15 | UT-04, API-09, UI-07, E2E-04 |
| AC-16 | UT-04, API-09, UI-07, E2E-04 |
| AC-17 | UT-04, API-09, UI-07 |
| AC-18 | UI-06, E2E-04 |
| AC-19 | UI-06, E2E-04 |
| AC-20 | API-10, UI-08, STYLE-04, E2E-05 |
| AC-21 | API-10, UI-08, E2E-05 |
| AC-22 | UT-05, API-11, UI-09, E2E-06 |
| AC-23 | UT-05, API-12, UI-09, E2E-06 |
| AC-24 | UT-05, API-13, UI-09, E2E-06 |
| AC-25 | UT-06, API-14, UI-09, E2E-06 |
| AC-26 | API-15, UI-09, E2E-06 |
| AC-27 | API-16, UI-09, E2E-06 |
| AC-28 | UT-06, API-17, UI-09, E2E-06 |
| AC-29 | API-15, API-17, UI-09, E2E-06 |
| AC-30 | API-16, API-17, UI-09, E2E-06 |
| AC-31 | API-18, E2E-06 |
| AC-32 | UI-05, UI-09, E2E-06 |
| AC-33 | STYLE-01, STYLE-03, RESP-01 |
| AC-34 | STYLE-01, STYLE-03, RESP-02 |
| AC-35 | STYLE-01, STYLE-03, RESP-03 |
| AC-36 | UI-10, STYLE-02, E2E-07 |
| AC-37 | UT-08, API-06, API-18, API-20, UI-06, E2E-07 |
| AC-38 | API-01, UI-03 |

Every Acceptance Criterion maps to at least one planned automated test. Requirement and Business-Rule IDs in the Planned Tests table provide forward traceability from the engineering contract to planned evidence.

---

## 4. Responsive and Visual Checklist

For the required Desktop, Tablet, and Mobile evidence viewports, verify:

- [ ] Zen Green primary/secondary/pale-green tokens, near-white page background, white surfaces, restrained border/shadow, and dark charcoal-green text are consistent.
- [ ] Application identity, active navigation, selected Development Requester, and Change Requester remain visible and understandable.
- [ ] Editable, read-only, invalid, disabled, focused, and busy controls are visually distinct.
- [ ] Loading, Empty, No Results, Success, Partial Success, Validation Error, API Failure, Active Attachment, Removed Attachment, and unavailable states use readable words and/or icons in addition to color.
- [ ] No clipped labels, overlapping messages, hidden required actions, unreadable Attachment filenames, or unintended horizontal page scrolling appear.
- [ ] Desktop uses the approved multi-column/table structure.
- [ ] Tablet uses two columns only where practical and preserves sufficient Ticket Summary/Description width.
- [ ] Mobile stacks fields, uses the approved readable My Tickets representation, keeps actions touch-friendly, and wraps long filenames/text safely.
- [ ] Keyboard focus is visible and logical; validation focus/associations and keyboard operation match the UI contract.
- [ ] Requested Priority and Current Status badges remain consistent and understandable without color alone.
- [ ] Search, filters, sorting, pagination, Attachment controls, and empty states remain usable at each supported viewport.
- [ ] Required successful evidence screenshots exist at the paths defined in `ui-spec.md`.
- [ ] No excluded authentication, IT Staff, Public Comment, Internal Note, Actions Taken, assignment, IT Priority editing, or later Ticket-lifecycle controls appear.

---

## 5. Test Commands

Current repository commands that must continue to pass:

```powershell
Set-Location client
npm.cmd test
npm.cmd run build

Set-Location ..\server
npm.cmd test
npm.cmd run build
npx.cmd prisma validate
```

Planned root commands after the Lab 2 testing tooling/scripts are added:

```powershell
# From repository root; script names become real only after the testing Issue adds them.
npm.cmd run test:e2e
npm.cmd run test:responsive
```

The later Playwright configuration must:

- start or target an isolated client/server test environment;
- use an isolated PostgreSQL test database;
- use a temporary test upload directory;
- avoid development/production data;
- retain useful diagnostic traces/screenshots for failed test runs; and
- explicitly capture the required successful Desktop, Tablet, and Mobile evidence screenshots under the approved `artifacts/lab-02/screenshots/` paths defined in `ui-spec.md`.

Exact final commands in this section must be updated to match the scripts that actually exist before Lab 2 is reported complete.

---

## 6. Final Results

| Level | Planned | Implemented | Pass | Fail | Not run |
|---|---:|---:|---:|---:|---:|
| Unit | 8 | 0 | 0 | 0 | 8 |
| API / Integration | 20 | 0 | 0 | 0 | 20 |
| UI Component | 10 | 0 | 0 | 0 | 10 |
| UI Style | 4 | 0 | 0 | 0 | 4 |
| Responsive | 3 | 0 | 0 | 0 | 3 |
| E2E | 7 | 0 | 0 | 0 | 7 |
| **Total** | **52** | **0** | **0** | **0** | **52** |

No Lab 2 test result is claimed in this specification Issue.

As implementation proceeds, this table must be updated only from tests that actually exist and have actually run. A failing or unexecuted required test must not be recorded as Pass.

---

## 7. Known Limitations or Deferred Tests

- All Lab 2 tests are deferred to later implementation/testing Issues. The paths in this document are intended test locations, not claims that the files currently exist.
- Playwright and root E2E/Responsive scripts are not present in the current project and must be added/configured in a later Lab 2 testing Issue before those tests can run.
- Required responsive screenshots are planned evidence and must be captured only from the actual implemented/tested Lab 2 build.
- Real object/cloud storage is outside Lab 2; local Git-excluded server storage is the approved Lab 2 design.
- Malware scanning is outside Lab 2.
- Real authentication and role-based authorization are outside Lab 2.
- IT Staff workflow, Public Comments, Internal Notes, Actions Taken, Administrator functionality, and post-`NEW` Ticket lifecycle behavior are outside Lab 2.
- Cross-browser coverage beyond the browsers configured for the required Playwright evidence is not a Lab 2 product requirement unless later required by the instructor.
- Manual peer review, visual inspection, screenshot evidence, and any manual accessibility checks supplement automated tests and must contain only real evidence after they occur.
