# Lab 3 Test DD Plan

Status: **Planned / Not run** for every Lab 3 Test ID in this Issue #41 contract. This file is intentionally created before product implementation. No row becomes Pass until the test exists, executes, and the result is verified on the relevant source SHA.

Current contract count: **50 unique planned Test IDs**. Test-ID count is not the same as the eventual runner assertion/test-case count.

## 1. Strategy

- Unit tests cover pure parsing, password policy, workflow edges, validation, and policy decisions.
- API/integration tests use Supertest and the isolated PostgreSQL test database for authentication, authorization, migration, queue, workflow, comments/notes, Administrator operations, and retained Requester behavior.
- UI component tests verify Login, Change Password, authenticated shell, Requester regression, Staff Queue/Detail, communication, and User Management states.
- UI style/accessibility tests verify Zen Green state conventions, labels, focus, and non-color meaning.
- Migration/regression tests prove populated Lab 2 preservation, the documented migrated-Requester initial-password provisioning flow, and evolved Lab 2 expectations rather than silently deleting them.
- Playwright covers real browser authentication, Requester continuity, staff flow, communication privacy, user administration, responsive behavior, and security boundaries.
- Tests use only the verified dedicated test database and temporary test uploads. They never silently fall back to working development data.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | Planned behavior | Expected result | Automated file | Final |
|---|---|---|---|---|---|---|
| ENV-01 | Unit | BR-40; AC-31 | Reject missing/shared/unapproved test DB and overlapping upload roots | Fail closed before mutation | `server/tests/lab-03/support/test-safety.unit.test.ts` | Planned / Not run |
| MIG-01 | Integration | FR-23; AC-27 | Populated Lab 2 schema -> Lab 3 forward migration, then explicit existing-Requester local provisioning | Existing IDs/FKs/content/files preserved; migrated Requesters receive hash-only one-time initial credentials, remain `mustChangePassword=true`, and no plaintext credential is persisted | `server/tests/lab-03/migration.integration.test.ts` | Planned / Not run |
| MIG-02 | Integration | BR-07; AC-27 | Canonical email collision before migration | Migration aborts before mutation; no merge/partial data loss | `server/tests/lab-03/migration.integration.test.ts` | Planned / Not run |
| SEED-01 | Integration | FR-23; AC-28 | Required role/status/priority fixtures | Required safe local fixtures created | `server/tests/lab-03/seed.integration.test.ts` | Planned / Not run |
| SEED-02 | Integration | AC-28 | Repeat seed and migrated-Requester provisioning after user/workflow edits | No duplicate fixtures and no credential/role/activation/auth-version/workflow reset; already-provisioned accounts are skipped | `server/tests/lab-03/seed.integration.test.ts` | Planned / Not run |
| HASH-01 | Unit | BR-08; AC-05 | Salted hashing/verification/malformed hash | No plaintext; correct/incorrect verification safe | `server/tests/lab-03/password.unit.test.ts` | Planned / Not run |
| AUTH-01 | API | AC-01 | Valid active login and safe current User | Authenticated session; safe DTO only | `server/tests/lab-03/auth.api.test.ts` | Planned / Not run |
| AUTH-02 | API | AC-05 | Wrong/unknown/inactive/unprovisioned login | Safe failure; no credential/account leak | `server/tests/lab-03/auth.api.test.ts` | Planned / Not run |
| AUTH-03 | API | AC-02 | Mandatory initial-password gate | Normal capability denied until valid change | `server/tests/lab-03/auth.api.test.ts` | Planned / Not run |
| AUTH-04 | API | AC-06 | Logout/expiry/reset/role-email-change/deactivation replay | Old protected access rejected | `server/tests/lab-03/auth.api.test.ts` | Planned / Not run |
| AUTH-05 | Unit/API | AC-07 | CSRF/origin/cookie/expiry/throttle policy | Invalid policy requests cannot mutate | `server/tests/lab-03/auth-policy.unit.test.ts` | Planned / Not run |
| AZ-01 | API | FR-05; AC-03, AC-04 | Role/resource/direct-request matrix | Wrong identity/role/state denied by backend | `server/tests/lab-03/authorization.api.test.ts` | Planned / Not run |
| REQ-01 | API | FR-05, FR-06, FR-07, FR-09; AC-08 | Authenticated create/list/detail/query plus retained Category/Related System reference data and post-#45 Development Requester endpoint removal | Retained Requester behavior succeeds; reference lists require completed authenticated access, return only active ordered rows with safe failures, and `/api/development-requesters` no longer returns a Requester list after #45 | `server/tests/lab-03/requester-regression.api.test.ts` | Planned / Not run |
| REQ-02 | API | BR-03; AC-03, AC-09 | Legacy header/body identity spoofing | Cannot impersonate or reveal foreign data | `server/tests/lab-03/requester-regression.api.test.ts` | Planned / Not run |
| REQ-03 | API | BR-20, BR-21; AC-10 | Unique number/idempotent replay after operational edits | One logical Ticket; no state reset | `server/tests/lab-03/requester-regression.api.test.ts` | Planned / Not run |
| STATUS-01 | Unit/API | FR-10; AC-12 | All eight status values through parser/projection/filter | Every valid status accepted; invalid rejected | `server/tests/lab-03/requester-regression.api.test.ts` | Planned / Not run |
| ATT-01 | API | BR-38; AC-11 | Type/signature/size/five-active/compensation | Retained Lab 2 Attachment rules hold | `server/tests/lab-03/attachments-regression.api.test.ts` | Planned / Not run |
| ATT-02 | API | AC-09, AC-11 | Foreign/removed/wrong-parent Attachment operations | Non-disclosing denial; no data change | `server/tests/lab-03/attachments-regression.api.test.ts` | Planned / Not run |
| ATT-03 | API | BR-39; AC-07, AC-11 | Unauthorized/CSRF-failed multipart request | No storage staging/metadata created | `server/tests/lab-03/attachments-regression.api.test.ts` | Planned / Not run |
| QUEUE-01 | Unit | FR-11; AC-13 | Queue query defaults/filters/sort/pagination validation | Exact normalized query or safe 400 | `server/tests/lab-03/staff-query.unit.test.ts` | Planned / Not run |
| QUEUE-02 | API | FR-11; AC-13 | Shared queue scope, unassigned/me, totals, wrong role | Staff/Admin permitted; Requester denied | `server/tests/lab-03/staff-queue.api.test.ts` | Planned / Not run |
| FLOW-01 | Unit | BR-22–BR-26; AC-17 | All 64 status source/destination pairs + conditions | Only matrix edges allowed | `server/tests/lab-03/ticket-workflow.unit.test.ts` | Planned / Not run |
| FLOW-02 | API | FR-13–FR-15; AC-15–AC-18 | Claim/reassign/priority/status | Correct invariants; Requester denied | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned / Not run |
| RACE-01 | Integration | AC-15, AC-16, AC-25 | Two claims, stale edits, assignment/deactivation race | Exactly one valid outcome; no lost update/ineligible owner | `server/tests/lab-03/ticket-concurrency.api.test.ts` | Planned / Not run |
| COM-01 | API | FR-16; AC-19 | Public Comment validation/authorship/order | Append-only safe public history | `server/tests/lab-03/comments-notes.api.test.ts` | Planned / Not run |
| COM-02 | API | FR-17; AC-04, AC-20 | Internal Note visibility matrix | No private-note data reaches Requester | `server/tests/lab-03/comments-notes.api.test.ts` | Planned / Not run |
| COM-03 | Unit/API | FR-18; AC-21 | Resolution indication repeat/reopen/formal-status boundary | Timestamp only; status unchanged | `server/tests/lab-03/communication-policy.unit.test.ts` | Planned / Not run |
| USER-01 | API | FR-19–FR-21; AC-22, AC-23 | List/search/filter/create/edit | Only Administrator permitted; safe User DTOs | `server/tests/lab-03/users-admin.api.test.ts` | Planned / Not run |
| USER-02 | Unit/API | BR-31; AC-23 | Canonical duplicate/invalid role/overposting | Rejected with no partial mutation | `server/tests/lab-03/user-validation.unit.test.ts` | Planned / Not run |
| USER-03 | Integration | BR-32, BR-33; AC-24, AC-25 | Self/last-admin + owner/assignment concurrency | Safety invariants survive races | `server/tests/lab-03/admin-safety.api.test.ts` | Planned / Not run |
| USER-04 | API | FR-22; AC-26 | Initial-password reset and old session/password | Next login forced change; old access rejected | `server/tests/lab-03/users-admin.api.test.ts` | Planned / Not run |
| SAFE-01 | API | AC-29 | DB/storage/session unexpected failures | Safe error envelope; no implementation secret leak | `server/tests/lab-03/safe-errors.api.test.ts` | Planned / Not run |
| UI-01 | UI | FR-01–FR-04; AC-01, AC-02, AC-05, AC-06 | Login/Change Password/auth bootstrap/logout states | Correct safe UI states | `client/tests/lab-03/Login.test.tsx`; `client/tests/lab-03/ChangePassword.test.tsx`; `client/tests/lab-03/AuthShell.test.tsx` | Planned / Not run |
| UI-02 | UI | FR-06–FR-10; AC-08–AC-12 | Authenticated Requester UI regression | Old capabilities survive; selector absent; statuses render | `client/tests/lab-03/RequesterRegression.test.tsx` | Planned / Not run |
| UI-03 | UI | FR-11; AC-14 | Queue controls/states/responsive representation | Correct Loading/Empty/No Results/Failure/Forbidden | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned / Not run |
| UI-04 | UI | FR-12–FR-15; AC-15–AC-18 | Staff Detail controls/confirm/conflict | Only permitted actions; safe conflict handling | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned / Not run |
| UI-05 | UI | FR-16–FR-18; AC-19–AC-21 | Public/Internal composers and indication | Visibility distinction; no private leakage | `client/tests/lab-03/CommentsNotes.test.tsx` | Planned / Not run |
| UI-06 | UI | FR-19–FR-22; AC-22–AC-26 | Minimal User Management forms/states/safety feedback | Contract-aligned User UI | `client/tests/lab-03/UserManagement.test.tsx` | Planned / Not run |
| STYLE-01 | UI Style | FR-24; AC-30 | Zen Green token/state reuse | New screens visually use current design system | `client/tests/lab-03/zen-green-styles.test.tsx` | Planned / Not run |
| A11Y-01 | UI | FR-24; AC-30 | Labels/focus/keyboard/non-color meaning | Required accessibility conventions present | `client/tests/lab-03/accessibility.test.tsx` | Planned / Not run |
| E2E-01 | E2E | AC-01, AC-02, AC-06 | Login -> forced change -> app -> logout -> blocked | Real session journey succeeds; post-logout protected access fails | `e2e/lab-03/authentication.spec.ts` | Planned / Not run |
| E2E-02 | E2E | AC-08–AC-12 | Authenticated Requester create/upload/list/detail/remove/isolation | Retained Requester journey works | `e2e/lab-03/requester-regression.spec.ts` | Planned / Not run |
| E2E-03 | E2E | AC-13–AC-18 | Queue -> claim -> priority -> status -> resolution/close/reopen | Staff workflow follows matrix | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned / Not run |
| E2E-04 | E2E | AC-19–AC-21 | Public reply/private note/Requester indication | Requester sees public only; formal status boundary preserved | `e2e/lab-03/communication-privacy.spec.ts` | Planned / Not run |
| E2E-05 | E2E | AC-22–AC-26 | Admin create/edit/reset/deactivate/safety | User Management works; revoked user denied | `e2e/lab-03/user-administration.spec.ts` | Planned / Not run |
| SEC-01 | E2E/API | AC-03, AC-04, AC-07, AC-09, AC-20, AC-29 | Security boundary matrix | No identity/resource/private-data bypass | `e2e/lab-03/security-boundaries.spec.ts`; `server/tests/lab-03/security-matrix.api.test.ts` | Planned / Not run |
| RESP-01 | Responsive | AC-30 | Desktop major screens | No clipping/overlap/overflow; usable controls | `e2e/lab-03/responsive-desktop.spec.ts` | Planned / Not run |
| RESP-02 | Responsive | AC-30 | Tablet major screens | Correct reflow/readability | `e2e/lab-03/responsive-tablet.spec.ts` | Planned / Not run |
| RESP-03 | Responsive | AC-30 | Mobile major screens | Single-column/cards/touch/readability/no overflow | `e2e/lab-03/responsive-mobile.spec.ts` | Planned / Not run |
| TRACE-01 | Documentation | AC-31, AC-32 | AC/Test/path/status uniqueness and final-main provenance | Every AC has evidence; no false Pass | `docs/lab-03/tests.md` verification script/manual audit | Planned / Not run |

## 3. Acceptance-Criterion Traceability

| AC | Planned Test IDs |
|---|---|
| AC-01 | AUTH-01, UI-01, E2E-01 |
| AC-02 | AUTH-03, UI-01, E2E-01 |
| AC-03 | AZ-01, REQ-02, SEC-01 |
| AC-04 | AZ-01, COM-02, SEC-01 |
| AC-05 | AUTH-02, HASH-01, UI-01 |
| AC-06 | AUTH-04, UI-01, E2E-01, USER-04 |
| AC-07 | AUTH-05, ATT-03, SEC-01 |
| AC-08 | REQ-01, UI-02, E2E-02 |
| AC-09 | REQ-02, ATT-02, E2E-02, SEC-01 |
| AC-10 | REQ-03, UI-02, E2E-02 |
| AC-11 | ATT-01, ATT-02, ATT-03, UI-02, E2E-02 |
| AC-12 | STATUS-01, UI-02, E2E-02 |
| AC-13 | QUEUE-01, QUEUE-02, UI-03, E2E-03 |
| AC-14 | UI-03, RESP-01, RESP-02, RESP-03 |
| AC-15 | FLOW-02, RACE-01, UI-04, E2E-03 |
| AC-16 | FLOW-02, RACE-01, UI-04, E2E-03 |
| AC-17 | FLOW-01, FLOW-02, UI-04, E2E-03 |
| AC-18 | AZ-01, FLOW-02, COM-03, E2E-03 |
| AC-19 | COM-01, UI-05, E2E-04 |
| AC-20 | COM-02, UI-05, E2E-04, SEC-01 |
| AC-21 | COM-03, UI-05, E2E-04 |
| AC-22 | USER-01, UI-06, E2E-05 |
| AC-23 | USER-01, USER-02, UI-06, E2E-05 |
| AC-24 | USER-03, UI-06, E2E-05 |
| AC-25 | USER-03, RACE-01, E2E-05 |
| AC-26 | USER-04, UI-06, E2E-05 |
| AC-27 | MIG-01, MIG-02 |
| AC-28 | SEED-01, SEED-02 |
| AC-29 | SAFE-01, SEC-01 |
| AC-30 | STYLE-01, A11Y-01, RESP-01, RESP-02, RESP-03 |
| AC-31 | TRACE-01 plus every row above |
| AC-32 | TRACE-01 |

## 4. Lab 2 Regression Disposition Summary

`regression-map.md` is the working map. Issue #42 completes the exhaustive file/case inventory. The current contract requires these principles:

- Ticket validation/idempotency/number/query and Attachment validation/lifecycle behaviors remain required and are rerun under authenticated identity.
- Development Requester selector/context tests are intentionally superseded by authentication/current-user tests and are not preserved as a production bypass.
- `NEW`-only assumptions are evolved to all eight statuses.
- Lab 2 `no comments/no staff controls` scope assertions are replaced only where Lab 3 explicitly adds those capabilities; Requester Internal Note denial remains required.
- Existing safe-error, responsive, accessibility, Zen Green, storage, database-isolation, and regression behavior remains applicable unless a documented requirement changes it.

## 5. Evidence Rules

- A meaningful TDD RED is an assertion failure caused by missing/wrong product behavior, not a missing dependency, database outage, or unsafe environment.
- No `.only`, hidden broad exclusion, empty required suite, or skipped required test may be used to claim release success.
- Test-ID counts and runner assertion counts are different measures; record both honestly.
- Historical Lab 2 results remain evidence for the delivered Lab 2 SHA only. Lab 3 completion requires fresh execution on the current source and final `main`.
- The current Issue #41 documentation change requires document consistency and `git diff --check`; it does not fabricate product-test results.
