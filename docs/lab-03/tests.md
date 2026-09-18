# Lab 3 Test DD Plan

Status: **Living Test DD / execution ledger.** All 50 planned Test IDs have executed passing evidence through the accepted Issue #51 integration. Issue #52 refreshes the full release-candidate gate and keeps AC-32 explicitly dependent on a fresh verification of the exact merged `main` SHA; no final-main pass is claimed early.

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
| ENV-01 | Unit | BR-40; AC-31 | Reject missing/shared/unapproved test DB and overlapping upload roots | Fail closed before mutation | `server/tests/lab-03/support/test-safety.unit.test.ts` | **Pass — 17/17 on verified code candidate `6d882a3`** |
| MIG-01 | Integration | FR-23; AC-27 | Populated Lab 2 schema -> Lab 3 forward migration, explicit existing-Requester local provisioning, native session-store type alignment, and late-failure atomic rollback | Existing Ticket/Attachment IDs/FKs/historical fields and active/removed Attachment metadata+bytes are preserved; migrated Requesters receive hash-only one-time initial credentials; `session.expire` remains PostgreSQL `timestamp with time zone`; a late migration failure leaves no partial Lab 3 product mutation | `server/tests/lab-03/migration.integration.test.ts` | **Pass — 3/3 migration integration cases on Issue #43 review-fix candidate `db2090c` (2026-09-15)** |
| MIG-02 | Integration | BR-07; AC-27 | Canonical email collision before migration | Migration aborts before mutation; no merge/partial data loss | `server/tests/lab-03/migration.integration.test.ts` | **Pass — canonical-email collision abort verified before product mutation on Issue #43 review-fix candidate `db2090c`** |
| SEED-01 | Integration | FR-23; AC-28 | Required role/status/priority fixtures | Required safe local fixtures created | `server/tests/lab-03/seed.integration.test.ts` | **Pass — required role mix and mixed workflow fixtures verified on Issue #43 candidate `db2090c`** |
| SEED-02 | Integration | AC-28 | Repeat seed and migrated-Requester provisioning after user/workflow edits | No duplicate fixtures and no credential/role/activation/auth-version/workflow reset; already-provisioned accounts are skipped | `server/tests/lab-03/seed.integration.test.ts` | **Pass — repeat-safe seed/provisioning verified without resetting edited identity/auth/workflow state on Issue #43 candidate `db2090c`** |
| HASH-01 | Unit | BR-08; AC-05 | Salted hashing/verification/malformed hash | No plaintext; correct/incorrect verification safe | `server/tests/lab-03/password.unit.test.ts` | **Pass — 4/4 Argon2id hash/verify/malformed-hash cases in full verification on Issue #43 candidate `db2090c`** |
| AUTH-01 | API | AC-01 | Valid active login and safe current User | Authenticated session; safe DTO only | `server/tests/lab-03/auth.api.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; active login/current-user safe projection verified** |
| AUTH-02 | API | AC-05 | Wrong/unknown/inactive/unprovisioned login | Safe failure; no credential/account leak | `server/tests/lab-03/auth.api.test.ts`; `server/tests/lab-03/auth-policy.unit.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; wrong/unknown/unprovisioned share safe invalid-credential behavior, missing hashes still execute a real Argon2 dummy verification path, and inactive guidance requires a correct credential** |
| AUTH-03 | API | AC-02 | Mandatory initial-password gate | Normal capability denied until valid change | `server/tests/lab-03/auth.api.test.ts`; `server/tests/lab-03/authorization.api.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; pending-password session gate, allowed auth-only endpoints, valid change, session rotation, and old-session revocation verified** |
| AUTH-04 | API | AC-06 | Logout/expiry/reset/role-email-change/deactivation replay | Old protected access rejected | `server/tests/lab-03/auth.api.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; logout, 30-minute idle store expiry/refresh, 8-hour absolute expiry/cap, password reset/change, auth-version role/email change, and deactivation revoke stale access** |
| AUTH-05 | Unit/API | AC-07 | CSRF/origin/cookie/expiry/throttle policy | Invalid policy requests cannot mutate | `server/tests/lab-03/auth-policy.unit.test.ts`; `server/tests/lab-03/auth.api.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; 10-minute pre-auth lifetime, CSRF/Origin, exact credentialed CORS, cookie/config, absolute-capped idle refresh, malformed JSON, password policy, dummy-hash no-enumeration hardening, and bounded throttling verified** |
| AZ-01 | API | FR-05; AC-03, AC-04 | Role/resource/direct-request matrix | Wrong identity/role/state denied by backend | `server/tests/lab-03/authorization.api.test.ts` | **Pass — Issue #44 review-fix candidate `ba3e2b6`; server-derived actor, default-deny capability, Requester ownership, and mandatory-change denial verified** |
| REQ-01 | API | FR-05, FR-06, FR-07, FR-09; AC-08 | Authenticated create/list/detail/query plus retained Category/Related System reference data and post-#45 Development Requester endpoint removal | Retained Requester behavior succeeds; reference lists require completed authenticated access, return only active ordered rows with safe failures, and `/api/development-requesters` no longer returns a Requester list after #45 | `server/tests/lab-03/requester-regression.api.test.ts` | **Pass — reviewed Issue #46 head `7252dd79f0277132ca7e4c8647994e9d5e560dc7` (merged as `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`): authenticated reference data, retired Development Requester route, session-derived create/list/detail/query behavior, safe CSRF gates, overpost rejection, and non-disclosing foreign Ticket behavior verified.** |
| REQ-02 | API | BR-03; AC-03, AC-09 | Legacy header/body identity spoofing | Cannot impersonate or reveal foreign data | `server/tests/lab-03/requester-regression.api.test.ts` | **Pass — reviewed Issue #46 head `7252dd79f0277132ca7e4c8647994e9d5e560dc7` (merged as `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`): a forged legacy header cannot select the actor; privileged body overposting is rejected with `400 VALIDATION_ERROR`; missing/foreign Ticket responses are non-disclosing; cross-Requester Attachment isolation is retained.** |
| REQ-03 | API | BR-20, BR-21; AC-10 | Unique number/idempotent replay after operational edits | One logical Ticket; no state reset | `server/tests/lab-03/requester-regression.api.test.ts` | **Pass — exact replay returns the current logical Ticket without resetting owner/status/IT Priority/version/timestamps; conflicting replay is rejected; concurrent identical creates serialize to one Ticket.** |
| STATUS-01 | Unit/API | FR-10; AC-12 | All eight status values through parser/projection/filter | Every valid status accepted; invalid rejected | `server/tests/lab-03/status-compatibility.unit.test.ts`; `server/tests/lab-03/requester-regression.api.test.ts`; `client/tests/lab-03/status-compatibility.test.tsx` | **Pass — all eight statuses verified through server parser/API projection and client filter/detail compatibility on Issue #43 candidate `db2090c`** |
| ATT-01 | API | BR-38; AC-11 | Type/signature/size/five-active/compensation | Retained Lab 2 Attachment rules hold | `server/tests/lab-03/attachments-regression.api.test.ts` | **Pass — retained type/signature/size/five-active/private-storage/soft-removal/compensation behavior runs under authenticated Requester transport; Staff/Admin read-only metadata/download is also covered.** |
| ATT-02 | API | AC-09, AC-11 | Foreign/removed/wrong-parent Attachment operations | Non-disclosing denial; no data change | `server/tests/lab-03/attachments-regression.api.test.ts` | **Pass — foreign, removed, wrong-parent, and unauthorized mutation paths are non-disclosing and leave state unchanged; Staff/Admin cannot upload/remove.** |
| ATT-03 | API | BR-39; AC-07, AC-11 | Unauthorized/CSRF-failed multipart request | No storage staging/metadata created | `server/tests/lab-03/attachments-regression.api.test.ts` | **Pass — authentication/resource/CSRF rejection is verified before unauthorized multipart staging or Attachment metadata creation.** |
| QUEUE-01 | Unit | FR-11; AC-13 | Queue query defaults/filters/sort/pagination validation | Exact normalized query or safe 400 | `server/tests/lab-03/staff-query.unit.test.ts` | **Pass — Issue #47 product commit `80ae9e8`: 14/14 parser cases cover documented defaults, every queue filter/sort/page option, deterministic `id desc` tie-break metadata, blank-search normalization, and safe rejection of unknown/repeated/invalid scalar values.** |
| QUEUE-02 | API | FR-11; AC-13 | Shared queue scope, unassigned/me, totals, wrong role | Staff/Admin permitted; Requester denied | `server/tests/lab-03/staff-queue.api.test.ts` | **Pass — Issue #47 product commit `80ae9e8`: 5/5 API cases verify shared assigned/unassigned scope, `me`/specific eligible owner filters, combined filters/sorting/totals/out-of-range pages, Staff/Admin access, Requester/password-change denial, safe assignee projection, and read-only Staff Detail without credential/private-note data.** |
| FLOW-01 | Unit | BR-22–BR-26; AC-17 | All 64 status source/destination pairs + conditions | Only matrix edges allowed | `server/tests/lab-03/ticket-workflow.unit.test.ts` | **Pass — Issue #48: 9/9 focused policy cases evaluate all 64 source/destination pairs plus role, owner, confirmation, Resolution Summary, and cancel-reason conditions. Fresh full verification at candidate `1f87ff4` passed server 44 files / 253 tests.** |
| FLOW-02 | API | FR-13–FR-15; AC-15–AC-18 | Claim/reassign/priority/status | Correct invariants; Requester denied | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Pass — Issue #48: 6/6 API cases verify claim without implicit status change, confirmed eligible-owner reassignment/unassignment rules, Requested-vs-IT Priority separation, exact status/confirmation/text rules, cancellation, CSRF, optimistic version conflict, and Requester direct-mutation denial.** |
| RACE-01 | Integration | AC-15, AC-16, AC-25 | Two claims, stale edits, assignment/deactivation race | Exactly one valid outcome; no lost update/ineligible owner | `server/tests/lab-03/ticket-concurrency.api.test.ts` | **Pass — Issue #48: 3/3 integration cases verify exactly one concurrent claimant, stale-version rejection after another operational mutation, and shared User locking/revalidation preventing assignment to a concurrently deactivated owner.** |
| COM-01 | API | FR-16; AC-19 | Public Comment validation/authorship/order | Append-only safe public history | `server/tests/lab-03/comments-notes.api.test.ts` | **Pass - Issue #49: focused communication API coverage verifies Requester/Staff Public Comment sharing, backend author/time, trimmed 1-2000-codepoint validation, deterministic createdAt/id ordering, CSRF/overposting rejection, and foreign-Requester non-disclosing scope.** |
| COM-02 | API | FR-17; AC-04, AC-20 | Internal Note visibility matrix | No private-note data reaches Requester | `server/tests/lab-03/comments-notes.api.test.ts` | **Pass - Issue #49: Staff creates and Admin reads Internal Notes; Requester direct GET/POST is denied before private projection and Requester Ticket detail contains no note text/count/ID/author metadata.** |
| COM-03 | Unit/API | FR-18; AC-21 | Resolution indication repeat/reopen/formal-status boundary | Timestamp only; status unchanged | `server/tests/lab-03/communication-policy.unit.test.ts`; `server/tests/lab-03/comments-notes.api.test.ts` | **Pass - Issue #49: allowed formal states, confirmation/version rules, first indication timestamp/version update, repeat-idempotent 200, no formal status/Resolution Summary mutation, foreign/state denial, and Resolve -> Close -> Reopen clearing are verified.** |
| USER-01 | API | FR-19–FR-21; AC-22, AC-23 | List/search/filter/create/edit | Only Administrator permitted; safe User DTOs | `server/tests/lab-03/users-admin.api.test.ts` | **Pass - Issue #50: 6/6 API cases include Administrator-only list/search/single-role filter, safe DTO projection, completed-password gate, canonical create, optimistic edit, concurrent duplicate-email safety, reset/session behavior, and reactivation without stale-session revival.** |
| USER-02 | Unit/API | BR-31; AC-23 | Canonical duplicate/invalid role/overposting | Rejected with no partial mutation | `server/tests/lab-03/user-validation.unit.test.ts` | **Pass - Issue #50: 4/4 focused validation cases verify canonical email/name handling, exactly one permitted role, bounded initial-password/confirmation rules, positive expectedVersion, confirmation, and unknown-field/overposting rejection. Concurrent canonical duplicates are additionally covered by USER-01.** |
| USER-03 | Integration | BR-32, BR-33; AC-24, AC-25 | Self/last-admin + owner/assignment concurrency | Safety invariants survive races | `server/tests/lab-03/admin-safety.api.test.ts` | **Pass - Issue #50: 4/4 integration cases verify self-deactivation denial without partial mutation, assigned-owner deactivation/demotion denial, assignment/deactivation race safety, and serialized last-active-Administrator demotion leaving exactly one active Administrator.** |
| USER-04 | API | FR-22; AC-26 | Initial-password reset and old session/password | Next login forced change; old access rejected | `server/tests/lab-03/users-admin.api.test.ts` | **Pass - Issue #50: reset is a separate confirmed action; only a hash is stored, `mustChangePassword=true`, auth/version state advances, old password/session access is rejected, and the replacement initial password reaches the mandatory-change gate.** |
| SAFE-01 | API | AC-29 | DB/storage/session unexpected failures | Safe error envelope; no implementation secret leak | `server/tests/lab-03/safe-errors.api.test.ts` | **Pass - Issue #51: 4/4 representative unexpected-failure cases prove auth/database, reference-data, private Attachment storage, and session-destroy failures return documented safe 500 envelopes without SQL/Prisma/path/password/hash/session/secret leakage.** |
| UI-01 | UI | FR-01–FR-04; AC-01, AC-02, AC-05, AC-06 | Login/Change Password/auth bootstrap/logout states | Correct safe UI states | `client/tests/lab-03/Login.test.tsx`; `client/tests/lab-03/ChangePassword.test.tsx`; `client/tests/lab-03/AuthShell.test.tsx` | **Pass — Issue #45 code candidate `860f0af`: 10/10 Login, mandatory Change Password, bootstrap/no-flash, role-route, obsolete Lab 2 requester-storage cleanup, and safe logout-success/failure UI cases passed** |
| UI-02 | UI | FR-06–FR-10; AC-08–AC-12 | Authenticated Requester UI regression | Old capabilities survive; selector absent; statuses render | `client/tests/lab-03/RequesterRegression.test.tsx` | **Pass — 3/3 dedicated authenticated Requester continuity cases pass; the current client suite is 19 files / 110 tests with retained create/list/detail/Attachment behavior using session/CSRF transport and no selector/header authority.** |
| UI-03 | UI | FR-11; AC-14 | Queue controls/states/responsive representation | Correct Loading/Empty/No Results/Failure/Forbidden | `client/tests/lab-03/StaffTicketQueue.test.tsx` | **Pass — Issue #47 product commit `80ae9e8`: 5/5 component cases cover documented defaults/controls, Loading/Empty/No Results/Forbidden/Failure-Retry, out-of-range recovery, desktop-table/mobile-card data, and Queue→read-only Detail→Queue context preservation. Supplemental Chromium coverage verifies the required desktop/tablet/mobile Queue representation and page-level overflow boundary.** |
| UI-04 | UI | FR-12–FR-15; AC-15–AC-18 | Staff Detail controls/confirm/conflict | Only permitted actions; safe conflict handling | `client/tests/lab-03/StaffTicketDetail.test.tsx` | **Pass — Issue #48 review-fix: 7/7 component cases cover Claim, contextual confirmed reassignment, independent IT Priority editing, owner-aware permitted next-status controls (including unassigned NEW/CLOSED and post-Claim enablement), required fields, and `409` authoritative reload with no automatic mutation replay. Fresh full client verification on `1bff4fe` passed 21 files / 122 tests.** |
| UI-05 | UI | FR-16-FR-18; AC-19-AC-21 | Public/Internal composers and indication | Visibility distinction; no private leakage | `client/tests/lab-03/CommentsNotes.test.tsx` | **Pass - Issue #49: 4/4 component cases cover Requester public-only rendering/plain text, CSRF post + trimmed body, recoverable-failure draft preservation, explicit Problem Appears Resolved confirmation without formal status change, and strongly distinct Staff Public/Internal composers.** |
| UI-06 | UI | FR-19–FR-22; AC-22–AC-26 | Minimal User Management forms/states/safety feedback | Contract-aligned User UI | `client/tests/lab-03/UserManagement.test.tsx` | **Pass - Issue #50: 5/5 component cases cover safe list/search/role filter, create + CSRF transport, edit separated from confirmed initial-password reset, single-attempt conflict feedback, and distinct Empty/No Results/Forbidden/Failure-Retry states.** |
| STYLE-01 | UI Style | FR-24; AC-30 | Zen Green token/state reuse | New screens visually use current design system | `client/tests/lab-03/zen-green-styles.test.tsx` | **Pass - Issue #51: 2/2 integrated style cases verify the approved Zen Green tokens and shared card/field/button/status/badge hierarchy across authentication and Staff UI rather than introducing a parallel visual system.** |
| A11Y-01 | UI | FR-24; AC-30 | Labels/focus/keyboard/non-color meaning | Required accessibility conventions present | `client/tests/lab-03/accessibility.test.tsx` | **Pass - Issue #51: 3/3 integrated accessibility cases verify Login labels/required/autocomplete/keyboard submit, named authenticated navigation and textual role/denial meaning, plus fully labelled Staff Queue controls and textual empty state. Retained Lab 2 accessibility cases continue to cover Requester validation, focus and Attachment actions.** |
| E2E-01 | E2E | AC-01, AC-02, AC-06 | Login -> forced change -> app -> logout -> blocked | Real session journey succeeds; post-logout protected access fails | `e2e/lab-03/authentication.spec.ts` | **Pass — Issue #45 code candidate `860f0af`: 1/1 Chromium journey passed with test-owned User/session cleanup, refresh/direct/back/forward route checks, Logout, and post-logout protected API 401** |
| E2E-02 | E2E | AC-08–AC-12 | Authenticated Requester create/upload/list/detail/remove/isolation | Retained Requester journey works | `e2e/lab-03/requester-regression.spec.ts` | **Pass — dedicated Chromium journey covers real login, create + two uploads, non-`NEW` list/filter/detail, removal, no legacy identity header, CSRF on unsafe requests, logout/login identity change, and foreign Ticket/Attachment 404 isolation; current E2E suite is 25/25.** |
| E2E-03 | E2E | AC-13–AC-18 | Queue -> claim -> priority -> status -> resolution/close/reopen | Staff workflow follows matrix | `e2e/lab-03/staff-ticket-flow.spec.ts` | **Pass — Issue #48: Chromium 2/2 covers Queue → Detail → Claim → IT Priority → Open → In Progress → Resolve → Close → Reopen, verifies Requested Priority remains unchanged and Requester direct staff mutation is denied, plus Staff Detail controls at desktop/tablet/mobile without page overflow. Fresh full Chromium suite passed 29/29 and retained responsive suite passed 10/10.** |
| E2E-04 | E2E | AC-19-AC-21 | Public reply/private note/Requester indication | Requester sees public only; formal status boundary preserved | `e2e/lab-03/communication-privacy.spec.ts` | **Pass - Issue #49: Chromium 2/2 verifies Staff public reply + private note -> Requester sees public only -> Requester resolution indication leaves formal status IN_PROGRESS, plus communication controls/no page overflow at 1440x900, 834x1112, and 390x844.** |
| E2E-05 | E2E | AC-22–AC-26 | Admin create/edit/reset/deactivate/safety | User Management works; revoked user denied | `e2e/lab-03/user-administration.spec.ts` | **Pass - Issue #50: Chromium 2/2 verifies real Administrator self-deactivation protection, create/edit/reset, old-password rejection + mandatory next-change, assigned-owner deactivation block then successful deactivation after reassignment, inactive-login denial, and desktop/tablet/mobile page-overflow checks.** |
| SEC-01 | E2E/API | AC-03, AC-04, AC-07, AC-09, AC-20, AC-29 | Security boundary matrix | No identity/resource/private-data bypass | `e2e/lab-03/security-boundaries.spec.ts`; `server/tests/lab-03/security-matrix.api.test.ts` | **Pass - Issue #51: 6/6 direct backend matrix cases plus 1/1 Chromium boundary journey cover unauthenticated access, wrong roles, mandatory-change gate, retired identity spoofing, Admin missing-CSRF/no-mutation, Internal Note privacy, account deactivation/session replay, and post-logout denial. Existing AUTH/AZ/USER/RACE suites retain expiry/authVersion and concurrency proofs.** |
| RESP-01 | Responsive | AC-30 | Desktop major screens | No clipping/overlap/overflow; usable controls | `e2e/lab-03/responsive-desktop.spec.ts` | **Pass - Issue #51: 1/1 Chromium 1440x900 integrated journey covers Login, Requester My Tickets/Create/Detail/communication, Change Password, forbidden access, Staff Queue/Detail/communication/operations, and Admin User Management with page-overflow assertions and captured Lab 3 evidence.** |
| RESP-02 | Responsive | AC-30 | Tablet major screens | Correct reflow/readability | `e2e/lab-03/responsive-tablet.spec.ts` | **Pass - Issue #51: 1/1 Chromium 834x1112 integrated journey exercises the same major role screens with long fixture content, correct reflow, page-overflow assertions, and captured Lab 3 evidence.** |
| RESP-03 | Responsive | AC-30 | Mobile major screens | Single-column/cards/touch/readability/no overflow | `e2e/lab-03/responsive-mobile.spec.ts` | **Pass - Issue #51: 1/1 Chromium 390x844 integrated journey verifies major role screens, card/single-column reflow, page-level overflow and rendered touch targets. The initial touch-target check exposed a false positive from hidden desktop-table descendants; the shared helper was corrected to measure only actually rendered elements, then the unchanged UI passed.** |
| TRACE-01 | Documentation | AC-31, AC-32 | AC/Test/path/status uniqueness and final-main provenance | Every AC has evidence; no false Pass | `docs/lab-03/tests.md`; `scripts/verify-lab3-traceability.mjs` | **Pass - Issue #51 structural trace audit verifies unique Test IDs, every specification AC has a Test DD mapping, every mapped Test ID exists, every named evidence path exists, and all Issue #51-owned rows are executed. AC-32 remains explicitly a final-main release gate for Issue #52 rather than a false final-main claim on staging.** |

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
## 6. Issue #42 Executed Verification Baseline

Verified code candidate: `6d882a33d237ffed43cd07feab6de98f52ea8b37` on `feature/42-lab3-verification-harness`. This SHA contains the runtime/test fix; evidence-only documentation may follow without changing product code. The database boundary was checked without printing credentials: configured development database `toktickit` and dedicated test database `toktickit_test` resolved to distinct database names; managed ports 4311/4312 were free before the run. Test uploads were run-owned temporary directories. These results are current-branch verification, not final-main Lab 3 product evidence.

| Check | Actual result |
|---|---|
| `npm.cmd --prefix server test -- --run tests/lab-03/support/test-safety.unit.test.ts --reporter=verbose` | ENV-01 GREEN: 1 file / 17 tests passed; peer-review regression first reproduced 5 failing local-loopback alias cases before hostname canonicalization |
| `npm.cmd --prefix server run build` | Pass; TypeScript build emitted the maintained `dist/src/*` tree |
| Current start/health smoke using owned `node dist/src/index.js` child | Pass; `/api/health` returned `status=ok`, service `TokTickIT API`; owned child was stopped and port 3000 was free afterward |
| `node e2e/lab-02/support/harness-lifecycle-smoke.mjs clean` | Pass; managed children exited and ports were released |
| `node e2e/lab-02/support/harness-lifecycle-smoke.mjs second` | Pass twice consecutively; no managed listener leaked |
| `node e2e/lab-02/support/harness-lifecycle-smoke.mjs failure` | Pass; expected Playwright failure propagated non-zero internally and managed listeners were cleaned |
| `node e2e/lab-02/support/harness-lifecycle-smoke.mjs preoccupied` | Pass; occupied unowned port was refused and the dummy listener remained alive |
| `node e2e/lab-02/support/harness-lifecycle-smoke.mjs upload-overlap` | Pass; a configured live upload root containing the generated E2E temp root was refused before managed services became ready, and no listener leaked |
| `node e2e/lab-02/support/run-playwright.mjs --project=chromium --list` | Pass; current default discovery listed 23 tests in 10 retained Lab 2 spec files and is configured to include future `e2e/lab-03/**/*.spec.ts` without excluding retained specs |
| `npm.cmd run verify` | Pass on verified code candidate `6d882a3`; server 31 files / 159 tests, client 17 files / 120 tests, current E2E 23/23, dedicated responsive 10/10; builds passed |
| `cd server; node node_modules/prisma/build/index.js validate --schema prisma/schema.prisma` | Pass; schema valid using the existing local environment |
| `git diff --check` | Pass on the candidate changes before evidence commit |

Warnings observed but non-fatal: the client suite still emits jsdom's `Not implemented: navigation (except hash changes)` diagnostic during the AttachmentPanel download test; Playwright emits the Node `NO_COLOR`/`FORCE_COLOR` warning. Neither warning caused a failed test. A first Prisma validation attempt from the repository root failed because `.env` was not loaded from `server/`; rerunning the same validation from `server/` succeeded. This setup-path failure is not counted as a TDD RED or product failure.

Only ENV-01 changes from `Planned / Not run` in the planned-test table because it is the only Lab 3 Test ID implemented and executed by Issue #42. All authentication, migration, workflow, staff, admin, communication, and final Lab 3 E2E Test IDs remain planned.

## 7. Issue #43 Executed Verification Evidence

Review-fix product candidate: `db2090c` on `feature/43-lab3-user-migration`. Evidence/traceability-only document changes may follow this product commit without changing application behavior. Issue #43 intentionally does **not** activate authentication or mark the full post-#45 `REQ-01` contract complete.

| Check | Actual result |
|---|---|
| `npm.cmd --prefix server test -- --run tests/lab-03/migration.integration.test.ts --reporter=verbose` | MIG-01/MIG-02 GREEN: 1 file / 3 tests passed; populated historical Lab 2 migration preserves Ticket identity/content/timestamps plus active+removed Attachment metadata and file checksums, provisions the migrated Requester once with an Argon2id hash, verifies `session.expire` as `timestamp with time zone` with no Prisma drift, rejects canonical-email collisions before mutation, and rolls back all Lab 3 mutations when a test-only late statement fails |
| `npm.cmd --prefix server test -- --run tests/lab-03/seed.integration.test.ts --reporter=verbose` | SEED-01/SEED-02 GREEN: 1 file / 3 tests passed; role/status/workflow fixtures created and repeat-safe provisioning/seed behavior verified |
| `npm.cmd --prefix server test -- --run tests/lab-03/password.unit.test.ts --reporter=verbose` | HASH-01 GREEN: 1 file / 4 tests passed; independently salted Argon2id hashes, correct/incorrect verification, malformed-hash safety, and exact password-character handling verified |
| `npm.cmd --prefix server run test:lab3-review` | Reviewer reproduction gate GREEN on `60aa202`: 3 files / 10 tests passed (HASH-01 + MIG-01/MIG-02 + SEED-01/SEED-02). Both `DATABASE_URL` and `TEST_DATABASE_URL` remain intentionally required so the database-isolation guard can fail closed before mutation |
| Status compatibility focused tests | STATUS-01 GREEN: server parser accepts all eight statuses and rejects an unknown value; Requester API filters/projects all eight values; client filter/list/detail accepts non-`NEW` values |
| Private development backup/recovery rehearsal before migration | Pass; a private ignored `pg_dump` backup was restored into a temporary recovery database, 5/5 core table signatures matched, canonical-email preflight found 0 collisions, and the development upload root contained 0 files at backup time. No credential or dump content is committed |
| Development forward migration | Pass with `prisma migrate deploy`; only `20260915173000_lab3_users_workflow` was pending and then applied. No reset or `db push` was used |
| PR #55 migration-history reconciliation after migration file hardening | Pass; a second private safety dump was created, the development database was restored from the rehearsed pre-#43 backup, the corrected transactional migration was reapplied, `_prisma_migrations.checksum` matched the current `migration.sql` SHA-256, `prisma migrate status` reported up to date, and `prisma migrate diff --from-schema-datasource ... --to-schema-datamodel ... --script` returned an empty migration |
| Development repeat-safety check | Pass; second seed emitted no new local credential, second migrated-user provisioning reported `0`, required role counts were 4 active + 1 inactive Requesters, 3 active + 1 inactive IT Staff, 1 active Administrator, all password hashes were Argon2id, all eight seeded statuses existed, and assigned/unassigned plus IT-Priority-difference fixtures were present |
| `npm.cmd run verify` | Pass on the Issue #43 product candidate: server 36 files / 189 tests, client 18 files / 123 tests, retained E2E 23/23, dedicated responsive 10/10; server/client builds passed |

Non-fatal diagnostics remain the retained jsdom navigation warning during the AttachmentPanel download test and Playwright's `NO_COLOR`/`FORCE_COLOR` warning. Neither warning produced a failed check. Generated screenshot artifacts from the retained responsive suite are local run outputs and are not Issue #43 deliverables.

## 8. Issue #44 Executed Verification Evidence

Review-fix code/test candidate: `ba3e2b6c79a5daef278ba144a225655a1c3ab088` on `feature/44-lab3-auth-foundation`. This includes the original authentication foundation plus the PR #56 Changes Requested response: direct PostgreSQL session-timing/store verification for the 10-minute pre-auth lifetime, 30-minute authenticated idle expiry/refresh, 8-hour absolute lifetime/cap, and a real Argon2 dummy-hash verification path for unknown/unprovisioned login attempts. This increment still intentionally does **not** activate authenticated Requester Ticket/Attachment identity or replace the current browser Development Requester flow; that cross-layer cutover remains Issue #45.

| Check | Actual result |
|---|---|
| `npm.cmd run test:lab3-auth-review` | AUTH-01..AUTH-05 and AZ-01 GREEN on review-fix candidate `ba3e2b6`: 3 files / 28 tests passed using real Supertest agents and the dedicated PostgreSQL test database. Coverage includes safe login/current-user DTOs, generic wrong/unknown/unprovisioned credentials with dummy Argon2 verification for missing hashes, mandatory password change, password/session rotation, stale-session revocation, logout, 10-minute pre-auth store lifetime, 30-minute authenticated idle store expiry and rolling refresh, 8-hour absolute expiry plus remaining-lifetime cap, exact Origin/CORS/CSRF policy, malformed-auth JSON safety, bounded throttling, server-derived Actor, role capability denial, and non-disclosing Requester ownership checks. |
| `npm.cmd run verify` | Pass on exact review-fix code/test candidate `ba3e2b6`: server 39 files / 217 tests, client 18 files / 123 tests, retained E2E 23/23, dedicated responsive 10/10; server/client builds passed. |
| Committed server start/health smoke using run-owned `SESSION_SECRET` and port 4315 | Pass; `node dist/src/index.js` started and `/api/health` returned `status=ok`, service `TokTickIT API`; the owned child was stopped afterward. No secret value was printed or persisted. |
| `npx.cmd prisma validate --schema prisma/schema.prisma` | Pass; current schema valid. |
| `npx.cmd prisma migrate status --schema prisma/schema.prisma` | Pass; 3 migrations found and development database reported up to date. |
| `npx.cmd prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` | Pass; returned an empty migration, so Issue #44 introduced no schema drift. |
| `git diff --check` / staged diff check | Pass before the product commit; local-only agent/plan/baseline files, `.env`, credentials, uploads, backups, and generated Lab 3 screenshots were not committed. |

The retained client jsdom navigation diagnostic and Playwright `NO_COLOR`/`FORCE_COLOR` warning remain non-fatal and did not fail any check. `npm audit --omit=dev` reports inherited Express/`qs` and Multer advisories; comparison with base `9d3a7c9` confirmed the affected package versions were already present before Issue #44, so this scoped authentication increment does not silently bundle unrelated dependency upgrades or claim those advisories resolved.

## 9. Issue #45 Cross-layer Authentication Activation Evidence

Accepted reviewed head: `2e7c16acf410ba76d0f1127ef5884cb13b393041` on `feature/45-lab3-auth-activation`; merged by PR #57 into `lab3-staging` as `d443741ef2c61c21653885208e1fcb1f719e8ca1`. The earlier product candidate `860f0af` introduced the cross-layer activation; the later commits on the reviewed head are evidence/documentation cleanup. This increment activates real authenticated Requester identity across backend routes and the Zen Green client. It removes the active Development Requester selector/header/body identity path rather than preserving a hidden compatibility bypass. The exhaustive retained Ticket/Attachment behavior mapped to Issue #46 is not promoted to Pass here.

| Check | Actual result |
|---|---|
| `npm.cmd run test:lab3-auth-activation-review` | Pass on code candidate `860f0af`: server build; 4 focused server files / 37 tests; client production build; 4 focused client files / 13 tests; Chromium `E2E-01` 1/1. Coverage includes authentication/session/CSRF policy, direct authorization, protected reference data, legacy-header/body spoof resistance, mandatory Change Password, obsolete requester-selection browser-state cleanup, safe Logout behavior, eight-status client compatibility, refresh/direct/back/forward routing, and post-logout protected API denial. |
| Active production legacy-identity audit | Pass: no `X-Development-Requester-Id`, `/api/development-requesters`, `RequesterSelection`, `RequesterContextProvider`, `useRequesterContext`, or browser `requesterId` authority remains in `client/src` or `server/src`. The sole `toktickit.developmentRequesterId` occurrence in active source is a one-way `removeItem(...)` cleanup of obsolete Lab 2 browser state; it is never read or written as identity. Legacy header/route strings remain only where tests intentionally prove spoofing/retired-route denial or in historical Git history. |
| `node node_modules/prisma/build/index.js validate --schema prisma/schema.prisma` from `server/` | Pass; current schema is valid. Issue #45 adds no schema migration. |
| `git diff --check` / staged diff check | Pass before the code/test commit after removing transient untracked screenshot outputs. |

### Post-merge predecessor reproduction before Issue #46

The Issue #45 reviewer gate was rerun on the exact accepted staging merge `d443741ef2c61c21653885208e1fcb1f719e8ca1` before any Issue #46 product edit. `npm.cmd run test:lab3-auth-activation-review` passed with server build + 4 focused server files / **37 tests**, client production build + 4 focused client files / **13 tests**, and Chromium E2E-01 **1/1**. A first worktree attempt stopped at the fail-closed test database guard because the fresh worktree did not contain ignored `server/.env`; after copying the existing private local environment file without printing/tracking it, the identical command passed. The setup-only stop is not treated as a TDD RED or product failure.

The focused Issue #45 command is the reviewer reproduction gate for this activation increment. A full `npm.cmd run verify` result is **not** claimed for `860f0af`: the retained Lab 1/Lab 2 Ticket/Attachment suites still contain pre-authentication setup/signature expectations that `regression-map.md` assigns to Issue #46 for exhaustive authenticated evolution. No production impersonation fallback is reintroduced merely to keep those superseded test setups green.

## 10. Issue #46 Authenticated Requester Regression Evidence

Reviewed head: `7252dd79f0277132ca7e4c8647994e9d5e560dc7` on `feature/46-lab3-requester-regression`, based on accepted Issue #45 staging merge `d443741ef2c61c21653885208e1fcb1f719e8ca1`; PR #58 was Approved and merged into `lab3-staging` as `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`. Issue #46 completes the exhaustive retained Requester Ticket/Attachment regression under real authenticated identity. It does not add Staff Queue mutations or communication features.

| Check | Actual result |
|---|---|
| Focused Issue #46 server gate: `requester-regression.api.test.ts`, `attachments-regression.api.test.ts`, `status-compatibility.unit.test.ts`, `authorization.api.test.ts` | Pass — **4 files / 34 tests**. Coverage includes authenticated reference/Ticket continuity, retired legacy identity authority, privileged create-body overpost rejection, exact replay/no operational reset, concurrent idempotency, all eight statuses, non-disclosing ownership, multipart pre-gates, and Staff/Admin read-only Attachment metadata/download without upload/remove capability. |
| `npm.cmd --prefix client test -- --run --reporter=dot` | Pass — **19 files / 110 tests**. `UI-02` dedicated Requester regression is 3/3; retained Lab 2 create/list/detail/Attachment UI tests now bootstrap authenticated identity and CSRF transport instead of a selector/header bypass. |
| `npm.cmd run test:e2e` | Pass — **25/25 Chromium tests**. The retained journeys use real login/logout identity transitions, and dedicated `E2E-02` covers create + upload + non-`NEW` list/filter/detail + remove + foreign-resource isolation with CSRF and no legacy Requester header. |
| `npm.cmd run verify` | Pass on the final pre-review working tree — server build + **39 files / 216 tests**; client production build + **19 files / 110 tests**; full Chromium E2E **25/25**; dedicated responsive rerun **10/10**. |
| Active production legacy-identity audit | Pass — no active Development Requester selector/header/body identity authority or compatibility impersonation path is introduced by Issue #46. Legacy strings remain only in tests that prove retirement/spoof resistance or in historical documentation. |

The retained client jsdom navigation diagnostic and Playwright `NO_COLOR`/`FORCE_COLOR` warning remain non-fatal and did not fail the executed checks. Generated responsive screenshots are local run artifacts and are removed before the Issue #46 code/evidence commit.

## 11. Issue #47 Shared Staff Ticket Queue Evidence

Product commit: `80ae9e8` on `feature/47-lab3-staff-queue`, based on accepted Issue #46 staging merge `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`. This increment delivers the read-only shared Staff/Admin Queue and Staff Ticket Detail foundation only. Claim/reassign/IT-Priority/status mutations remain in Issue #48; Public Comments/Internal Notes remain in Issue #49.

| Check | Actual result |
|---|---|
| `server/tests/lab-03/staff-query.unit.test.ts` | Pass — **14/14 QUEUE-01 tests** for defaults, search/category/status/requested-priority/IT-priority/owner filters, stable sorting metadata, pagination, and invalid/repeated/unknown query rejection. |
| `server/tests/lab-03/staff-queue.api.test.ts` | Pass — **5/5 QUEUE-02 tests** for shared queue scope, deterministic ordering/totals, owner modes, Staff/Admin authorization, Requester/password-change denial, eligible assignees, safe read-only Detail, and no private-note/credential/session projection. |
| `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass — **5/5 UI-03 tests** for controls, states, Retry, out-of-range recovery, responsive table/card data, and exact applied Queue context into/back from Detail. |
| `e2e/lab-03/staff-queue.spec.ts` | Pass — **2/2 supplemental Chromium checks**: authenticated Staff search/pagination/owner filter → read-only Detail → preserved Queue context, plus Desktop `1440×900` table and Tablet `834×1112` / Mobile `390×844` cards with no page-level horizontal overflow. This is Issue #47 supporting evidence and does **not** promote the planned mutation-heavy `E2E-03` or full-product `RESP-01`/`RESP-02`/`RESP-03` Test IDs to Pass. |
| `npm.cmd run verify` | Pass on the Issue #47 product tree — server build + **41 files / 235 tests**; client production build + **20 files / 115 tests**; full Chromium E2E **27/27**; retained dedicated responsive rerun **10/10**. |
| Scope/security audit | Pass — Staff Queue/Detail production code contains no claim/reassign/status/priority mutation endpoint, no Internal Note/credential/session projection, and no reintroduction of `X-Development-Requester-Id` or `/api/development-requesters` authority. |

The retained client jsdom navigation diagnostic and Playwright `NO_COLOR`/`FORCE_COLOR` warning remain non-fatal. The `npm.cmd run verify` responsive Lab 2 suite generates local screenshot artifacts; those generated files are removed before committing Issue #47 evidence.

## 12. Issue #48 Staff Ticket Operations Evidence

Pre-review implementation/test candidate: `1f87ff4beb36ce982df29857acc061576ae75abb` on `feature/48-lab3-ticket-operations`, based on accepted Issue #47 staging merge `dfcb7288d5aef7b777c53821fcda237b06cc2a30`. This increment adds Staff/Admin Ticket ownership, IT Priority, and formal status mutations to the existing Staff Detail architecture. It intentionally does **not** implement Issue #49 Public Comments/Internal Notes/Requester resolution indication or Issue #50 Administrator User Management.

| Check | Actual result |
|---|---|
| `server/tests/lab-03/ticket-workflow.unit.test.ts` | Pass — **9/9 FLOW-01 tests**, including exhaustive 64 source/destination status pairs, Staff/Admin role gating, active-owner preconditions, confirmation requirements, and trimmed Resolution Summary/cancel-reason boundaries. |
| `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass — **6/6 FLOW-02 tests** for Claim, confirmed eligible reassignment/unassignment state rules, independent IT Priority, status matrix/field validation, cancellation, CSRF, optimistic version conflicts, and Requester direct mutation denial. |
| `server/tests/lab-03/ticket-concurrency.api.test.ts` | Pass — **3/3 RACE-01 integration tests**. Competing claims serialize to one valid owner, stale `expectedVersion` cannot overwrite a later mutation, and owner assignment re-locks/revalidates the User so concurrent deactivation cannot leave an ineligible owner. |
| `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass — **7/7 UI-04 tests** for Claim, contextual confirmed reassignment, IT Priority mutation while Requested Priority remains read-only, owner-aware next-status visibility for unassigned NEW/CLOSED plus post-Claim enablement, required fields, and `409 CONFLICT` authoritative reload without automatic replay. |
| `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass — **2/2 Chromium checks**. `E2E-03` performs Queue → Detail → Claim → IT Priority → Open → In Progress → Resolve → Close → Reopen, then verifies persisted owner, Requested Priority preservation, IT Priority, reopened-cycle clearing, and Requester direct staff-mutation denial. A second check verifies operational controls and no page-level horizontal overflow at `1440×900`, `834×1112`, and `390×844`. |
| `npm.cmd run verify` | Pass on peer-review fix commit `1bff4fe`: server build + **44 files / 253 tests**; client production build + **21 files / 122 tests**; full Chromium E2E **29/29**; retained dedicated responsive rerun **10/10**. `git diff --check` is clean after removing the three EOF blank-line findings from review. |
| Scope/security audit | Pass — Issue #48 extends the existing Staff Queue/Detail stack; mutation routes require authenticated Staff/Admin capability plus CSRF; Requester direct staff mutation is denied by backend authorization; Requested Priority is not written by the IT Priority operation; no Issue #49 communication composer/endpoint or Issue #50 Admin UI is introduced. |

The retained client jsdom navigation diagnostic during the Attachment download test and Playwright `NO_COLOR`/`FORCE_COLOR` warning remain non-fatal. During E2E development, a Staff Detail responsive check exposed a test-helper navigation race after login; the root cause was the helper returning before the role-home redirect settled, not a product-route defect. The helper now waits for the role-appropriate home heading before direct navigation. Generated screenshots from verification are local run artifacts and were removed before the Issue #48 evidence commit.
## 12. Issue #49 Executed Verification Evidence

Product/test candidate: `48d4708cdfaed95d3433da776695e48c5d68a546` on `feature/49-lab3-communication`. This increment implements only Public Comments, Internal Notes, and Requester `Problem Appears Resolved`; it does not add Actions Taken, message edit/delete, email notification, or Issue #50 Administrator User Management.

| Check | Actual result |
|---|---|
| `server/tests/lab-03/communication-policy.unit.test.ts` + `comments-notes.api.test.ts` | Pass - **2 files / 8 tests**. Public/private visibility, authorship, validation/order, CSRF/ownership, indication state/version/idempotency, formal-status boundary, and reopen clearing are covered. |
| `client/tests/lab-03/CommentsNotes.test.tsx` | Pass - **4/4 UI-05 tests** for public-only Requester rendering, safe post/draft failure behavior, explicit Requester indication confirmation, and visually distinct Staff Public/Internal communication. |
| `e2e/lab-03/communication-privacy.spec.ts` | Pass - **2/2 Chromium checks** for real Staff public/private communication, Requester privacy and indication, and required desktop/tablet/mobile overflow checks. |
| Full server verification | Pass - server build + **46 files / 261 tests**. |
| Full client verification | Pass - client production build + **22 files / 126 tests**. |
| Full Chromium E2E | Pass after updating the superseded Issue #47 no-communication assertion - **31/31 tests**. |
| Dedicated retained responsive suite | Pass - **10/10 tests**. |
| Scope/security audit | Pass - Internal Notes remain behind Staff/Admin capability; Requester responses/routes expose no private-note metadata; Public Comments are Ticket-scoped; all unsafe posts use CSRF; React renders message bodies as text; no edit/delete or excluded notification/Actions Taken feature was added. |

The retained jsdom `Not implemented: navigation (except hash changes)` diagnostic during the Attachment download test and Playwright `NO_COLOR`/`FORCE_COLOR` warning remain non-fatal. During regression, old Lab 2/Issue #47 mocks/assertions that intentionally described the pre-communication response shape were updated to the approved Lab 3 Ticket/communication contract rather than weakening current runtime validation.

## 13. Issue #50 Administrator User Management Evidence

Implementation/test candidate: `feature/50-lab3-user-management` from accepted staging merge `8216683ecc8f4d3322dbbca95ec21dfc03428f34`. This increment implements only the reviewed minimalist Administrator User Management scope: safe list/search/filter, create/edit/activation, separate confirmed initial-password reset, backend authorization, account/session safety, and the shared assignment/account concurrency invariant. It does not add deletion, bulk/import/export, multiple roles, departments/history/profile photos, email invitation/reset delivery, or advanced identity-management features.

| Check | Actual result |
|---|---|
| Focused server USER gate: `users-admin.api.test.ts`, `user-validation.unit.test.ts`, `admin-safety.api.test.ts` | Pass - **3 files / 14 tests**. Coverage includes Administrator-only and completed-password gates, safe list/search/single-role filter, canonical create/edit, unique-email concurrency, validation/overposting, optimistic versioning, self-deactivation, assigned-owner safety, assignment/deactivation race handling, serialized last-active-Administrator protection, initial-password reset, stale-session/password invalidation, and reactivation without session revival. |
| `client/tests/lab-03/UserManagement.test.tsx` | Pass - **5/5 UI-06 tests** for safe list/search/role filter, create + CSRF transport, edit versus separate confirmed reset, conflict feedback without automatic replay, and Empty/No Results/Forbidden/Failure-Retry states. |
| `e2e/lab-03/user-administration.spec.ts` | Pass - **2/2 Chromium checks**. E2E-05 verifies self-deactivation denial, create/edit/reset, old-password rejection, mandatory next password change, assigned-owner deactivation protection, successful deactivation after reassignment, inactive-login denial, and required desktop/tablet/mobile no-overflow coverage. |
| `npm.cmd run verify` | Pass on the pre-review Issue #50 working tree: server build + **49 files / 275 tests**; client production build + **23 files / 131 tests**; full Chromium E2E **33/33**; retained responsive rerun **10/10**. |
| `git diff --check` | Pass after implementation fixes; generated responsive screenshot artifacts were removed rather than committed. |
| Scope/security audit | Pass - Admin APIs require authenticated `ADMIN_USER_MANAGE` capability and completed password change; unsafe mutations require CSRF; safe DTOs exclude password hashes/authVersion/session material; deletion and excluded identity-management scope were not added. |

The retained jsdom `Not implemented: navigation (except hash changes)` diagnostic during the Attachment download test and Playwright `NO_COLOR`/`FORCE_COLOR` warnings remain non-fatal. They predate Issue #50 and did not fail the verification command.

## 14. Issue #51 Integrated Verification Evidence

Baseline: `feature/51-lab3-integration-verification` was created from accepted `lab3-staging` merge `b568ff87dabb7716355eea622c5980dba5268db7`, the merged PR #62 / Issue #50 result. Issue #51 adds verification and evidence only except for one reproduced test-helper defect: the shared touch-target helper previously measured descendants of CSS-hidden desktop containers as if they were visible. It now excludes elements with no rendered client rect before evaluating target size; no product UI behavior was weakened.

| Check | Actual result |
|---|---|
| Focused migration/seed/security/safe-error gate | Pass - **4 files / 16 tests** across `migration.integration.test.ts`, `seed.integration.test.ts`, `safe-errors.api.test.ts`, and `security-matrix.api.test.ts`. The existing migration/seed suites retain populated Lab 2 -> Lab 3 preservation, collision abort, rollback, repeat-safe seed/provisioning, and byte-preservation evidence; the new Issue #51 suites add direct safe-500 and integrated authorization/privacy/CSRF/session coverage. |
| STYLE-01 + A11Y-01 | Pass - **2 files / 5 tests**. Zen Green token/hierarchy continuity, labelled controls, required/password semantics, keyboard submit, named navigation, textual role/denial meaning, and Staff Queue empty-state semantics are covered. |
| Issue #51 Chromium integrated gate | Pass - **4/4** for `security-boundaries.spec.ts` plus desktop 1440x900, tablet 834x1112, and mobile 390x844 integrated journeys. The three responsive journeys cover Login, Requester My Tickets/Create/Detail/communication, Change Password, forbidden state, Staff Queue/Detail/operations/communication, and Administrator User Management. |
| Responsive evidence artifacts | Pass - **27 Lab 3 screenshots** under `artifacts/lab-03/screenshots/issue-51/`, nine major-screen captures at each required viewport. No secret/password value is captured. |
| TRACE-01 | Pass - **50 unique Test IDs / 32 ACs**. `scripts/verify-lab3-traceability.mjs` verifies Test-ID uniqueness, AC mapping coverage, mapped Test-ID existence, evidence-path existence, completion of Issue #51-owned rows, and preserves AC-32 as the separate final-main release gate owned by Issue #52. |
| Full `npm.cmd run verify` | Pass on the Issue #51 working tree: server build + **51 files / 285 tests**; client production build + **25 files / 136 tests**; TRACE-01 pass; Chromium **37/37**; retained responsive **10/10**. |
| `git diff --check` | Pass after implementation/evidence updates. |

The new SEC-01 matrix explicitly includes the non-blocking PR #62 follow-up for an Administrator unsafe mutation without CSRF and proves no User row is created. Existing AUTH/AZ/REQ/ATT/RACE/USER suites remain the deeper evidence for password/session expiry and revocation, Requester ownership, Attachment isolation, concurrent Ticket claims/stale versions, assignment-versus-account changes, last-active-Administrator serialization, and canonical duplicate-email races; Issue #51 does not duplicate those accepted focused suites merely to inflate counts.

## 15. Issue #52 Release Evidence

Accepted release-preparation baseline: `feature/52-lab3-release-evidence` starts from `lab3-staging` merge `890e136e30cb56d87290ff3b70390e0ae26c3ce4`, the reviewed/merged PR #63 Issue #51 result.

| Check | Actual result |
|---|---|
| Fresh worktree setup | First aggregate attempt stopped during TypeScript build because the new worktree had installed packages but no generated Prisma Client. `npx prisma generate --schema prisma/schema.prisma` completed successfully; no product source change was needed. |
| Full server gate | Pass - server build + **51 test files / 285 tests** on the accepted Issue #51 staging baseline. Populated migration, repeat-safe seed/provisioning, auth/authz, Requester/Attachment regression, Staff operations/concurrency, communication/privacy, Admin safety and SAFE/SEC integrated checks all passed. |
| Full client gate | Pass - production build + **25 test files / 136 tests**. The retained jsdom navigation diagnostic during the Attachment download test remains non-fatal and does not represent a failed browser download assertion. |
| TRACE-01 | Pass - **50 unique Test IDs / 32 ACs** with all mapped evidence paths present. AC-32 intentionally remains the exact-final-main release gate until a reviewed release PR actually merges and that delivered SHA is freshly verified. |
| Full Chromium | Pass - **37/37** across retained/evolved Lab 2 plus Lab 3 authentication, Requester, Staff, communication, security, Administrator and integrated responsive journeys. |
| Retained responsive | Pass - **10/10** at the established Desktop/Tablet/Mobile viewports. |
| Release screenshot refresh | `npm.cmd run capture:evidence:lab3 -- <label>` reruns the integrated Lab 3 evidence journeys and requires **41 PNGs**: **27 major responsive screenshots** (9 screens x 3 viewports) plus **14 targeted state screenshots** for authentication, Requester Attachments/communication/resolution indication, Staff Queue/workflow/private-note distinction, and Administrator create/edit/reset/safety. `manifest.json` records exact source SHA plus role/route/scenario/viewport/Test-ID-or-rubric mapping for each image. Release-candidate and final-main captures must be generated from the respective real SHAs. |

Exact PR-head visual evidence is intentionally kept as a GitHub Actions artifact instead of being committed back into the same feature branch. A committed generated set would advance HEAD and make its embedded source SHA stale by construction. The PR workflow checks out `pull_request.head.sha`, sets `EXPECTED_EVIDENCE_SHA` to that value, and the capture script fails unless `git rev-parse HEAD` is identical. A valid review run must therefore show **41/41 PNGs**, **27 major + 14 state screenshots**, complete per-image role/route/scenario/viewport/mapping metadata, and an artifact named `lab3-ui-evidence-<PR-head-SHA>` from the newest successful PR-head run.

### AC-32 final-main rule

AC-32 is **not yet promoted to final-main completion in this branch document**. The shipped repository contains the executable verification/capture commands and the truthful pre-release evidence. After the reviewed `lab3-staging -> main` release PR merges, run the full aggregate gate and SHA-labelled `final-main` Playwright capture on the exact delivered `main` commit and record that external post-merge evidence in Issue #52/release records. This avoids the circular error of committing a new evidence-only change and then falsely calling the previous SHA the final delivered commit.

Per the student's explicit instruction for this work session, final PDF creation is deferred. No PDF pass/result belongs in this Test DD execution ledger yet.
