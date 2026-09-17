# Lab 3 Test DD Plan

Status: **Living Test DD / execution ledger.** The plan was created before product implementation. Test IDs remain `Planned / Not run` until their executable checks run on a relevant source SHA; rows for Issues #42 and #43 contain the verified execution evidence already produced by those accepted increments.

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
| UI-01 | UI | FR-01–FR-04; AC-01, AC-02, AC-05, AC-06 | Login/Change Password/auth bootstrap/logout states | Correct safe UI states | `client/tests/lab-03/Login.test.tsx`; `client/tests/lab-03/ChangePassword.test.tsx`; `client/tests/lab-03/AuthShell.test.tsx` | **Pass — Issue #45 code candidate `860f0af`: 10/10 Login, mandatory Change Password, bootstrap/no-flash, role-route, obsolete Lab 2 requester-storage cleanup, and safe logout-success/failure UI cases passed** |
| UI-02 | UI | FR-06–FR-10; AC-08–AC-12 | Authenticated Requester UI regression | Old capabilities survive; selector absent; statuses render | `client/tests/lab-03/RequesterRegression.test.tsx` | **Pass — 3/3 dedicated authenticated Requester continuity cases pass; the current client suite is 19 files / 110 tests with retained create/list/detail/Attachment behavior using session/CSRF transport and no selector/header authority.** |
| UI-03 | UI | FR-11; AC-14 | Queue controls/states/responsive representation | Correct Loading/Empty/No Results/Failure/Forbidden | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned / Not run |
| UI-04 | UI | FR-12–FR-15; AC-15–AC-18 | Staff Detail controls/confirm/conflict | Only permitted actions; safe conflict handling | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned / Not run |
| UI-05 | UI | FR-16–FR-18; AC-19–AC-21 | Public/Internal composers and indication | Visibility distinction; no private leakage | `client/tests/lab-03/CommentsNotes.test.tsx` | Planned / Not run |
| UI-06 | UI | FR-19–FR-22; AC-22–AC-26 | Minimal User Management forms/states/safety feedback | Contract-aligned User UI | `client/tests/lab-03/UserManagement.test.tsx` | Planned / Not run |
| STYLE-01 | UI Style | FR-24; AC-30 | Zen Green token/state reuse | New screens visually use current design system | `client/tests/lab-03/zen-green-styles.test.tsx` | Planned / Not run |
| A11Y-01 | UI | FR-24; AC-30 | Labels/focus/keyboard/non-color meaning | Required accessibility conventions present | `client/tests/lab-03/accessibility.test.tsx` | Planned / Not run |
| E2E-01 | E2E | AC-01, AC-02, AC-06 | Login -> forced change -> app -> logout -> blocked | Real session journey succeeds; post-logout protected access fails | `e2e/lab-03/authentication.spec.ts` | **Pass — Issue #45 code candidate `860f0af`: 1/1 Chromium journey passed with test-owned User/session cleanup, refresh/direct/back/forward route checks, Logout, and post-logout protected API 401** |
| E2E-02 | E2E | AC-08–AC-12 | Authenticated Requester create/upload/list/detail/remove/isolation | Retained Requester journey works | `e2e/lab-03/requester-regression.spec.ts` | **Pass — dedicated Chromium journey covers real login, create + two uploads, non-`NEW` list/filter/detail, removal, no legacy identity header, CSRF on unsafe requests, logout/login identity change, and foreign Ticket/Attachment 404 isolation; current E2E suite is 25/25.** |
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
