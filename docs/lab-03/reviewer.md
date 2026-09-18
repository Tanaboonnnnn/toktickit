# Lab 3 Peer Review Evidence

This file records only peer-review evidence that actually occurred. Approval is not inferred from AI output, document drafting, branch creation, automated checks, or an open pull request.

## Author and review context

- Author name: `แทนบุญ เตียวสวัสดิ์`
- Student ID: `67070507211`
- GitHub username: `@Tanaboonnnnn`
- Current accepted Lab 3 evidence: Issues #41–#46 / PRs #53–#58 through the merged authenticated Requester regression increment.
- Current accepted staging merge: `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc` (PR #58 merged to `lab3-staging` on 2026-09-17 07:37 UTC / 14:37 Thailand time).
- Current active implementation branch after that accepted baseline: `feature/47-lab3-staff-queue`, created from the exact merged staging SHA above. PR #59 is open against `lab3-staging` at head `013939a6d65fbd073e78f289dc5c406bfa98617f`; peer review has been requested and no Issue #47 approval or merge is claimed yet.

## Reviewers

- Name: ฌาธนัชย์ อุทัยพิบูลย์
- GitHub username: `@Chxtamos`
- Lab 3 review coverage verified on GitHub: PR #53 Engineering Contract review submitted 2026-09-14 17:15 UTC.

- GitHub username: `@thananun-7203`
- Lab 3 review coverage verified on GitHub: PR #53 Engineering Contract review submitted 2026-09-14 18:33 UTC against head `4ff85cb`.
- Lab 3 review coverage verified on GitHub: PR #55 final approval submitted 2026-09-15 16:38 UTC against approved head `b194087`.
- Lab 3 review coverage verified on GitHub: PR #56 Issue #44 authentication review submitted 2026-09-15 19:19 UTC against head `17e507a` with **Changes requested**.
- Lab 3 review coverage verified on GitHub: PR #56 final **Approved** review submitted 2026-09-15 19:53 UTC against latest reviewed head `0c216ed`; PR #56 then merged to `lab3-staging` at 19:53 UTC as `7304b5e`.
- Lab 3 review coverage verified on GitHub: PR #57 Issue #45 activation received **Approved** from `@thananun-7203` on 2026-09-16 16:13 UTC against reviewed head `2e7c16a`; no unresolved inline review thread was present, and PR #57 merged to `lab3-staging` as `d443741`.
- Lab 3 review coverage verified on GitHub: PR #58 Issue #46 authenticated Requester regression received **Approved** from `@thananun-7203` on 2026-09-17 07:37 UTC against reviewed head `7252dd7`; PR #58 merged to `lab3-staging` as `eaa483b`.
- PR #59 Issue #47 shared Staff Ticket Queue is open for peer review at head `013939a`; review requests were sent to `@thananun-7203` and `@Chxtamos`. This is request evidence only, not a submitted review or approval.

- GitHub username: `@L0u1sss`
- Lab 3 review coverage verified on GitHub: PR #55 Issue #43 migration review submitted 2026-09-15 13:40 UTC against head `5589ee9`.

Other users may be requested for review on GitHub, but this file records a reviewer only after a real review submission is verifiable.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#53](https://github.com/Tanaboonnnnn/toktickit/pull/53) | Cross-document reference-data/API/Test DD consistency | `@thananun-7203` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201418919) 2026-09-14 18:33; [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201767376) 2026-09-14 19:09; merged 19:10 UTC |
| [#54](https://github.com/Tanaboonnnnn/toktickit/pull/54) | Issue #42 verification safety: database isolation + evidence cleanup | `@thananun-7203` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206221801) 2026-09-15 06:18; [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206674595) 07:06; merged 07:07 UTC |
| [#55](https://github.com/Tanaboonnnnn/toktickit/pull/55) | Issue #43 data-preserving User/workflow migration | `@L0u1sss`, `@thananun-7203` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/55#pullrequestreview-5210721789) 2026-09-15 13:40; [second Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/55#pullrequestreview-5211770377) 15:00; final **Approved** by `@thananun-7203` 16:38; merged 16:38 UTC |
| [#56](https://github.com/Tanaboonnnnn/toktickit/pull/56) | Issue #44 backend authentication/session/authorization foundation | `@thananun-7203` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/56#pullrequestreview-5214771144) 2026-09-15 19:19 against head `17e507a`; review-fix candidate `ba3e2b6` added the requested session-expiry/store evidence and dummy-hash timing hardening; final **Approved** 19:53 against latest reviewed head `0c216ed`; merged 19:53 UTC as `7304b5e` |
| [#57](https://github.com/Tanaboonnnnn/toktickit/pull/57) | Issue #45 cross-layer authentication activation | `@thananun-7203` | **Approved** 2026-09-16 16:13 UTC against reviewed head `2e7c16a`; reviewer confirmed server-derived Requester identity, CSRF/multipart ordering, selector/header retirement, Login/mandatory password change/authenticated shell, E2E-01, and truthful deferral of exhaustive Ticket/Attachment regression to #46; merged to `lab3-staging` as `d443741` |
| [#58](https://github.com/Tanaboonnnnn/toktickit/pull/58) | Issue #46 authenticated Requester + Attachment continuity | `@thananun-7203` | **Approved** 2026-09-17 07:37 UTC against reviewed head `7252dd79f0277132ca7e4c8647994e9d5e560dc7`; reviewer confirmed session-derived Requester identity, retained Ticket/Attachment regression, non-disclosing ownership, idempotency, all-status UI compatibility, and Staff/Admin read-only Attachment access; merged to `lab3-staging` as `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc` |
| [#53](https://github.com/Tanaboonnnnn/toktickit/pull/53) | Sprint 3 Engineering Contract / Test DD / planning reconciliation | `@Chxtamos` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5200694235) 2026-09-14 17:15 → revised contract pushed; re-review pending |

## Detailed review evidence

### Review 1 — 2026-09-14 17:15 UTC

- Result: **Changes requested**
- Reviewer: `@Chxtamos`
- Review: [PR #53 review](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5200694235)
- Reviewed head: `df44557e7ba80ea84e6d28ce7e5a9143fb6ee04d`
- Reviewer confirmed the overall Issue #41 structure was present: 9 changed documentation files at that reviewed head, all 11 specification sections, the role authorization matrix, eight-status transition matrix, 32 Acceptance Criteria with test traceability, and honest `Planned / Not run` Lab 3 test status.
- Finding 1: several API operations lacked exact response schemas and exact success/error HTTP status behavior, leaving backend/frontend/test interpretation room.
- Finding 2: the data model and PostgreSQL session-store contract needed concrete fields, relationships, constraints/indexes, and store behavior rather than only conceptual model names.
- Finding 3: the Lab 2 → Lab 3 migration did not define precisely how existing Development Requesters receive initial passwords, even though the handout requires that flow to be documented and tested.
- Finding 4: the PR description claimed 44 planned tests while `tests.md` actually contained 50 unique Test IDs.

### Author response to Review 1

The review findings were checked against `Lab_3_sheet.pdf` §5–6 and the current branch rather than accepted blindly. All four findings were confirmed as valid for this contract.

Changes made for re-review:

1. `api-spec.md` now defines shared response DTOs, endpoint-by-endpoint success responses, applicable safe error/status families, session/cookie/CSRF behavior, exact response bodies for the new Lab 3 endpoint families, and the active Requester Ticket/Attachment request/query/multipart/removal shapes directly in the Lab 3 contract rather than requiring implementation to reconstruct them from Lab 2 documentation.
2. `specification.md` Data Changes now defines User/Ticket/Comment/Note fields and relationships, required indexes/constraints, the migration-owned PostgreSQL session-store table, and the ordered forward-migration/backfill sequence.
3. The migration contract now defines an explicit local-only initial-password provisioning flow for existing migrated Requesters: unprovisioned accounts start with no hash, an explicit local command generates one-time random initial passwords, only hashes are stored, `mustChangePassword=true`, reruns skip already-provisioned accounts, and the behavior is covered by `MIG-01`/`SEED-02` planning.
4. `tests.md` now states the exact **50 unique planned Test IDs** and clarifies that Test-ID count is different from eventual runner assertion/test-case count.
5. The PR metadata is updated to use the current count and current document scope rather than the stale 44-test statement.
6. The internal `implementation-plan.md` planning artifact is removed from the PR because it is not an instructor-required Lab 3 deliverable and the project owner explicitly requested that it not be uploaded. Issue references are synchronized so no later work treats that internal plan as repository source of truth.
7. A post-review traceability self-audit found that AC-32's traceability row described the final-release gate in prose even though `TRACE-01` was already declared against AC-32 in the planned-test table. The row now names `TRACE-01` explicitly so every AC maps to an actual planned Test ID in both directions.

No product feature, migration execution, seed/reset, database mutation, or peer approval is claimed by these review-response changes.

### Review 2 — 2026-09-14 18:33 UTC

- Result: **Changes requested**
- Reviewer: `@thananun-7203`
- Review: [PR #53 review](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201418919)
- Reviewed head: `4ff85cb35e7ce1063aa6a9e727556fe887e8889d`
- Blocking finding: `regression-map.md` and `ui-spec.md` retained Category/Related System reference-data behavior, but `api-spec.md` did not define the post-authentication contract for `/api/categories` and `/api/related-systems` or explicitly define removal of `/api/development-requesters` after #45.
- Required coverage: define authentication/password-change policy, response shape, active-only behavior, ordering/safe failures, endpoint retirement, and planned test mapping.
- Minor/non-blocking finding: make all three `UI-01` automated test paths fully qualified.

### Author response to Review 2

The blocking finding was verified against the current repository before editing. The reviewer identified a real cross-document gap: Lab 2 currently implements all three reference-data routes; `regression-map.md` already says Category/Related System survive while Development Requester is replaced; `ui-spec.md` retains reference-data states; and the handout requires authenticated continuation of all Lab 2 Requester Ticket/Attachment APIs plus an exact Lab 3 API contract. The handout does not itself require these supporting lookup routes to be protected, so the chosen post-#45 authentication/password-change gate is recorded as a project security decision rather than a lecturer-mandated constant.

Changes made for re-review:

1. `api-spec.md` now defines the retained `/api/categories` and `/api/related-systems` contracts: protected-session/password-change gate, bare `ReferenceItem[]` response compatibility, active-only rows, deterministic ordering, empty success, safe failures, and no CSRF token requirement for the safe GET requests.
2. `api-spec.md` explicitly retires `/api/development-requesters` at #45 and requires a safe `404 RESOURCE_NOT_FOUND` for the post-#45 authenticated check rather than a Requester list or compatibility fallback.
3. `specification.md` now includes reference-data authorization/API-family decisions and extends AC-08 to include the retained reference-data lookup and Development Requester endpoint removal; `ui-spec.md` makes the post-#45 authenticated lookup timing explicit.
4. `REQ-01` now plans direct coverage for the retained reference-data contract and endpoint retirement without increasing the Test ID count; `regression-map.md` points API-01 to that coverage.
5. `UI-01` now uses fully qualified paths for all three planned client test files.

These are contract/test-plan changes only. They do not claim that #45/#46 product behavior has already been implemented or executed.

### Review 3 - 2026-09-15 06:18 UTC

- Result: **Changes requested**
- Reviewer: `@thananun-7203`
- Review: [PR #54 review](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206221801)
- Reviewed head: `680fca4639b52363c9a9706265ba8f4716ad2483`
- Blocking finding: `assertDistinctTestDatabase()` compared hostnames literally, so local PostgreSQL aliases such as `localhost`, `127.0.0.1`, other `127/8` addresses, or `::1` could identify the same server/database while bypassing the distinct-test-database guard.
- Required change: normalize known local loopback identities before comparison and replace the test assumption that a different loopback hostname proves database separation.
- Minor findings: replace the mojibake separator in `regression-map.md` and update ENV-01 execution evidence to the latest verified source candidate.

### Author response to Review 3

The blocker was reproduced before implementation with a focused ENV-01 regression: the first reviewer example (`localhost` vs `127.0.0.1` using the same port/database) failed because no error was thrown. The minimized suite was then expanded to cover `127.0.0.1`, another `127/8` address, `localhost.`, IPv6 loopback `::1`, and IPv4-mapped IPv6 loopback while retaining a distinct non-loopback-host success case.

Changes prepared for re-review:

1. `canonicalDatabaseHost()` now collapses recognized local loopback forms before database identity comparison; port and database name comparisons remain unchanged.
2. ENV-01 now has 17 cases and the five loopback regression examples pass on verified code candidate `6d882a3`.
3. The three corrupted separators in `regression-map.md` are restored to a real em dash.
4. `tests.md` records 17/17 ENV-01 and the verified code candidate instead of the stale `23976ab` evidence.
5. Full verification on the code candidate passed: server 31 files / 159 tests, client 17 files / 120 tests, E2E 23/23, responsive 10/10; managed-port and upload-overlap safety scenarios also passed.

No product feature, schema migration, or database reset is claimed by this response. At this point in the chronology PR #54 still remained pending human re-review; the later approval is recorded separately below.

### Review 4 — 2026-09-15 07:06 UTC

- Result: **Approved**
- Reviewer: `@thananun-7203`
- Review: [PR #54 approval](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206674595)
- Reviewed head: `f9274942dab73e8e802d8dbff66a319b4b0e4654`
- Reviewer re-checked the loopback database-identity fix and confirmed coverage for `localhost`, `localhost.`, `127/8`, IPv6 loopback, and IPv4-mapped IPv6 loopback while preserving a legitimate non-loopback-host case.
- Reviewer confirmed the requested mojibake/evidence cleanup was resolved, `git diff --check` was clean, the PR remained scoped to Issue #42 verification-harness work, and no blocking finding remained.
- PR #54 merged into `lab3-staging` at 2026-09-15 07:07 UTC as merge commit `63a4c8db4b1692e31508f4a3c6894f35e4fe6253`.

### Review 5 — 2026-09-15 13:40 UTC

- Result: **Changes requested**
- Reviewer: `@L0u1sss`
- Review: [PR #55 review](https://github.com/Tanaboonnnnn/toktickit/pull/55#pullrequestreview-5210721789)
- Reviewed head: `5589ee9160420f1e920753f0c7f382a11250e5e9`
- Finding 1: Prisma `Session.expire` was plain `DateTime` while the migration and approved session-store contract use PostgreSQL `timestamp with time zone`, producing schema drift toward `TIMESTAMP(3)`.
- Finding 2: the migration file did not explicitly bracket the full migration with `BEGIN`/`COMMIT`; the reviewer requested an atomic late-failure proof rather than relying on the opening `DO` block.
- Finding 3: `README.md` still described the seed as Lab 2-only and omitted the explicit `provision:migrated-users` local handoff, one-time terminal credential, hash-only storage, and repeat-safety rules.
- Finding 4: MIG-01 asserted only a subset of historical Ticket/Attachment fields even though the PR claimed preservation of historical content, Attachment metadata, and bytes.
- The reviewer could not rerun DB-backed tests in their environment because `server/.env`/`TEST_DATABASE_URL` were not available there; that environment limitation was recorded separately from the requested product/document changes.

### Author response to Review 5

All four requested changes were checked against the approved Lab 3 contract and the executable migration path before editing. The response candidate is `db2090c`.

1. `Session.expire` is now `DateTime @db.Timestamptz(6)`, matching both `migration.sql` and the contract. MIG-01 queries `information_schema` for `timestamp with time zone`/precision 6 and runs Prisma `migrate diff` against the migrated temporary schema so this mismatch cannot silently return.
2. `migration.sql` now explicitly wraps the full migration in `BEGIN; ... COMMIT;`. MIG-01 injects a test-only failure immediately before `COMMIT` and verifies that User role columns, new status enum values, and new Lab 3 tables leave no partial state. Because the earlier migration text had already been applied only to the local development database, a second private safety dump was created, development was restored from the rehearsed pre-#43 backup, and the corrected migration was reapplied rather than editing `_prisma_migrations` manually. The resulting database checksum matches the current migration file and Prisma reports no schema drift.
3. `README.md` now documents migration -> repeat-safe Lab 3 seed -> migrated-Requester provisioning, including local-only one-time credential output, Argon2id hash-only persistence, `mustChangePassword=true`, rerun behavior, and the rule not to commit/share displayed credentials.
4. MIG-01 now compares the complete retained historical Ticket fields used by Lab 2 and both active and soft-removed Attachment metadata (`mimeType`, timestamps, `removedAt`, `removalReason`) before/after migration, plus SHA-256 checks of both fixture files.
5. Fresh aggregate verification on `db2090c` passed: server 36 files / 189 tests, client 18 files / 123 tests, E2E 23/23, responsive 10/10, with server/client builds passing. Prisma validate/status pass and the live development schema diff is empty.

No PR #55 approval or merge is claimed by this response; human re-review is still required.

### Review 6 — 2026-09-15 15:00 UTC

- Result: **Changes requested**
- Reviewer: `@L0u1sss`
- Review: [PR #55 second review](https://github.com/Tanaboonnnnn/toktickit/pull/55#pullrequestreview-5211770377)
- Reviewed head: `3e29876bdb927d67cbc2738d10d93c0136067b63`
- The reviewer did not identify a new product-code defect in the four original findings. The review recorded that those fixes are documented on `db2090c`, but approval is still pending.
- The reviewer reran HASH-01 successfully (4/4) but could not rerun the migration/seed integration suites because their environment did not have `DATABASE_URL` and `TEST_DATABASE_URL` configured.
- The reviewer also noted that PR #55 is not the whole Lab 3 release: authentication UI/API, Staff Queue/Detail, Comments/Notes runtime, Admin UI, and later E2E work remain in subsequent planned issues. This matches the intentional Issue #43 scope rather than requiring those later features to be pulled into this PR.

### Author response to Review 6

The environment limitation was verified against the repository before changing anything. Both database URLs are intentionally mandatory: the integration safety guard compares development and test database identities and fails closed before mutation if either URL is missing or unsafe. Removing that requirement would weaken the database-isolation contract from Issue #42.

To make the DB-backed review reproducible without weakening the guard:

1. `server/package.json` now exposes `npm run test:lab3-review`, which runs HASH-01 plus the Issue #43 migration and seed integration suites in one command.
2. `README.md` now has a reviewer/fresh-clone section showing how to copy `server/.env.example`, configure distinct `DATABASE_URL` / `TEST_DATABASE_URL` values, generate Prisma Client, and run the focused review command.
3. The documentation states explicitly that the focused DB suites mutate only uniquely named temporary schemas under `TEST_DATABASE_URL`; `DATABASE_URL` is used for the fail-closed identity comparison and is not migrated/seeded/reset by this command.
4. The new review command was executed on candidate `60aa202`: **3 files / 10 tests passed**, and the server build passed.
5. No Authentication/Staff/Admin implementation is added here because those are intentionally owned by later Lab 3 issues and are outside Issue #43 acceptance scope.

No PR #55 approval or merge is claimed after Review 6; another human re-review is required.

### Review 7 — 2026-09-15 16:38 UTC

- Result: **Approved**
- Reviewer: `@thananun-7203`
- Reviewed head: `b1940879f7e4d040dcf173585809ca2553611bb6`
- Reviewer verified that the requested migration/session-type/transaction/README/preservation fixes remained present, the reviewer reproduction path preserved fail-closed database isolation, all eight statuses were compatible with the pre-activation runtime, and the temporary Development Requester path still exposed only active Requesters.
- The reviewer explicitly classified the stale opening status in `tests.md` and stale top-level `reviewer.md` scope as minor/non-blocking documentation cleanup.
- PR #55 was merged into `lab3-staging` at 2026-09-15 16:38 UTC as merge commit `9d3a7c982450e5de719b66dd5baab313014fb1b1`; Issue #43 is closed/completed.
- Fresh post-merge verification on that exact staging merge was run before Issue #44 implementation: server 36 files / 189 tests passed, client 18 files / 123 tests passed, retained E2E 23/23 passed, responsive 10/10 passed, server/client builds passed, Prisma validate/status passed, the live schema diff was empty, and `git diff --check` passed.

### Review 8 — 2026-09-16 16:13 UTC

- Result: **Approved**
- Reviewer: `@thananun-7203`
- PR: [#57](https://github.com/Tanaboonnnnn/toktickit/pull/57)
- Reviewed head: `2e7c16acf410ba76d0f1127ef5884cb13b393041`
- Reviewer confirmed that Issue #45 completed the intended cross-layer activation without restoring a Development Requester authority path: protected Requester Ticket/Attachment routes derive identity from the authenticated server Actor; Requester mutations use CSRF; multipart authorization/CSRF occurs before Multer parsing; retained reference data is behind the completed-authentication gate; and `/api/development-requesters` plus selector/header/browser requester-ID authority are retired.
- The reviewer also confirmed Login, mandatory Change Password, `/me` bootstrap, role-aware routing, stale-auth-response protection, logout behavior, obsolete requester-storage cleanup, focused API/UI tests, E2E-01, and the active-source legacy-identity audit.
- The review explicitly accepted that exhaustive retained Ticket/Attachment regression was still mapped to Issue #46 and that no production impersonation fallback was reintroduced only to make legacy tests pass.
- No unresolved inline review thread was present when the handoff was verified. PR #57 merged to `lab3-staging` as `d443741ef2c61c21653885208e1fcb1f719e8ca1`.
- Fresh post-merge reproduction on that exact merge before Issue #46 implementation passed: server build; 4 focused server files / **37 tests**; client production build; 4 focused client files / **13 tests**; Chromium E2E-01 **1/1**. The first attempt in the newly created worktree stopped at the fail-closed database guard because ignored `server/.env` was not copied into the new worktree; after restoring the existing private local environment file without tracking or printing it, the unchanged reviewer command passed. That setup-only failure is not counted as a product regression.

## Review-resolution log

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| Review 1 | API response schemas/status codes incomplete | Added shared DTOs plus endpoint success/error/status contracts | `api-spec.md` | Resolved in revised head; pending re-review |
| Review 1 | Data model/session store underspecified | Added concrete fields, FKs, indexes/constraints, session-store table and migration ownership | `specification.md`, `api-spec.md` | Resolved in revised head; pending re-review |
| Review 1 | Existing Requester initial-password migration flow unspecified | Added explicit local one-time provisioning flow and planned migration/seed assertions | `specification.md`, `api-spec.md`, `tests.md` | Resolved in revised head; pending re-review |
| Review 1 | PR claimed 44 tests while Test DD had 50 IDs | Made 50 unique Test IDs explicit and synchronized PR metadata | `tests.md`, PR #53 description | Resolved in revised head; pending re-review |
| Review 1 follow-up | Internal implementation plan should not be uploaded | Remove `docs/lab-03/implementation-plan.md` from PR and remove repository references to it | PR #53 / Issue #41 / Issue #42 metadata | Resolved in revised head; pending re-review |
| Post-review self-audit | AC-32 mapping cell did not explicitly name its planned Test ID | Mapped AC-32 directly to the already-declared `TRACE-01` test | `tests.md` | Resolved before re-review |
| Review 2 | Retained Category/Related System endpoints missing from active Lab 3 API contract; Development Requester retirement/test gap unclear | Added exact retained-reference contract, explicit post-#45 route retirement, authorization/UI/API-family alignment, and REQ-01 coverage | `api-spec.md`, `specification.md`, `ui-spec.md`, `tests.md`, `regression-map.md` | Resolved in revised head; pending re-review |
| Review 2 minor | `UI-01` listed two abbreviated automated paths | Fully qualified all three client test paths | `tests.md` | Resolved in revised head; pending re-review |
| Review 3 | Loopback hostname aliases could bypass distinct test-database identity | Canonicalize known local loopback forms before host comparison and add red/green regression coverage | `server/tests/lab-03/support/database.ts`, `server/tests/lab-03/support/test-safety.unit.test.ts` | Resolved; verified by Review 4 approval |
| Review 3 minor | Mojibake separator and stale ENV-01 SHA/count | Restore em dash; update ENV-01 to 17/17 on verified code candidate | `regression-map.md`, `tests.md` | Resolved; verified by Review 4 approval |
| Review 5 | Prisma session expiry native type drift | Map `Session.expire` explicitly to PostgreSQL `Timestamptz(6)` and assert native type + zero Prisma drift | `server/prisma/schema.prisma`, `server/tests/lab-03/migration.integration.test.ts` | Resolved; verified by Review 7 approval |
| Review 5 | Migration lacked explicit full-file transaction | Add `BEGIN`/`COMMIT`, inject a late migration failure, verify complete rollback, then restore/reapply local dev from the pre-#43 backup so migration history/checksum stays clean | `migration.sql`, `migration.integration.test.ts`, private local recovery evidence | Resolved; verified by Review 7 approval |
| Review 5 | README omitted Lab 3 provisioning/repeat-safety workflow | Document Lab 3 seed, `provision:migrated-users`, one-time local credential handling, Argon2id-only persistence, and rerun rules | `README.md` | Resolved; verified by Review 7 approval |
| Review 5 | Historical preservation assertions incomplete | Compare retained Ticket fields plus active/removed Attachment metadata and both file checksums across migration | `server/tests/lab-03/migration.integration.test.ts` | Resolved; verified by Review 7 approval |
| Review 6 | Reviewer could not run DB-backed migration/seed suites without local database URLs | Keep the fail-closed DB isolation requirement; add a focused reviewer command and explicit fresh-clone DB setup/reproduction steps | `server/package.json`, `README.md` | Resolved; verified by Review 7 approval |
| Review 6 scope note | PR #55 is not the complete Lab 3 product | Keep Issue #43 limited to migration/User/workflow foundation; later authentication/staff/admin/UI/E2E work remains in its planned issues | PR #55 scope / Lab 3 issue plan | Expected scope; no product change |

## Approval evidence

- PR #53 received a real **Approved** review from `@thananun-7203` on 2026-09-14 19:09 UTC and was merged into `lab3-staging` at 2026-09-14 19:10 UTC.
- PR #54 received a real **Approved** review from `@thananun-7203` on 2026-09-15 07:06 UTC after the earlier Changes Requested round and was merged into `lab3-staging` at 07:07 UTC.
- PR #55 received a real **Approved** review from `@thananun-7203` on 2026-09-15 16:38 UTC against head `b1940879f7e4d040dcf173585809ca2553611bb6` and was merged into `lab3-staging` at 16:38 UTC as `9d3a7c982450e5de719b66dd5baab313014fb1b1`.
- PR #56 received a real **Approved** review from `@thananun-7203` on 2026-09-15 19:53 UTC against latest reviewed head `0c216edab18edb428e61943191054a69da0e6801` after the earlier Changes Requested round and was merged into `lab3-staging` at 19:53 UTC as `7304b5e746cc3449b3074537038515d61fba9384`.
- PR #57 received a real **Approved** review from `@thananun-7203` on 2026-09-16 16:13 UTC against reviewed head `2e7c16acf410ba76d0f1127ef5884cb13b393041` and was merged into `lab3-staging` as `d443741ef2c61c21653885208e1fcb1f719e8ca1`.
- PR #58 received a real **Approved** review from `@thananun-7203` on 2026-09-17 07:37 UTC against reviewed head `7252dd79f0277132ca7e4c8647994e9d5e560dc7` and was merged into `lab3-staging` as `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`.
- Review links: [PR #53 approval](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201767376), [PR #54 changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206221801), [PR #54 approval](https://github.com/Tanaboonnnnn/toktickit/pull/54#pullrequestreview-5206674595).
- PR #54 final approval: **Approved** by `@thananun-7203` on reviewed head `f9274942dab73e8e802d8dbff66a319b4b0e4654`.
- PR #55 final verdict: **Approved** by `@thananun-7203` after the two earlier Changes Requested submissions from `@L0u1sss`.
- PR #56 final verdict: **Approved** by `@thananun-7203` after the earlier session-lifecycle verification request; the final reviewed branch retained the #44/#45 activation boundary.
- PR #57 final verdict: **Approved** by `@thananun-7203`; the review explicitly left exhaustive retained Requester Ticket/Attachment regression to Issue #46 rather than requiring an authentication bypass for old setup code.
- PR #58 final verdict: **Approved** by `@thananun-7203`; the two documentation follow-ups about stale Issue #46 review wording and exact SHA provenance were explicitly non-blocking and are carried into the Issue #47 branch without rewriting Issue #46 history.
- Passing-check link: no hosted passing-check result is claimed here; local verification is recorded in `tests.md` and the PR conversation.
- PR #54 merge status: **Merged** into `lab3-staging` at 2026-09-15 07:07 UTC; merge commit `63a4c8db4b1692e31508f4a3c6894f35e4fe6253`.
- PR #55 merge status: **Merged** into `lab3-staging` at 2026-09-15 16:38 UTC; merge commit `9d3a7c982450e5de719b66dd5baab313014fb1b1`.
- PR #56 merge status: **Merged** into `lab3-staging` at 2026-09-15 19:53 UTC; merge commit `7304b5e746cc3449b3074537038515d61fba9384`.
- PR #57 merge status: **Merged** into `lab3-staging`; merge commit `d443741ef2c61c21653885208e1fcb1f719e8ca1`.
- PR #58 merge status: **Merged** into `lab3-staging`; merge commit `eaa483bae0d2f2d9256871d8ca0abf58ecb5dddc`.

## Reviews given to peers

No Lab 3 peer-review-given evidence has been added yet. Lab 2 reviews are not copied into this Lab 3 section as if they were Sprint 3 review work. Future Lab 3 reviews given by `@Tanaboonnnnn` will be linked here only after they actually occur.

## Evidence integrity note

This file follows the Lab 2 peer-review evidence layout while recording Lab 3 evidence only. PR #53 approval/merge, PR #54 Changes Requested followed by Approval/merge, PR #55's two Changes Requested rounds followed by final Approval/merge, PR #56 Changes Requested followed by final Approval/merge, PR #57 Approval/merge, and PR #58 Approval/merge are recorded from actual GitHub events. No hosted CI result or future Issue #47 peer approval is inferred. Automated checks and AI analysis are supporting engineering evidence, not substitutes for the peer-review evidence required by the course.

### Issue #49 review request — 2026-09-18 07:45 UTC

- Result: **Awaiting peer review**
- PR: [#61](https://github.com/Tanaboonnnnn/toktickit/pull/61)
- Issue: [#49](https://github.com/Tanaboonnnnn/toktickit/issues/49)
- Base: `lab3-staging` at `095ce67f160a58742b4928b50c1cf27e5ab33bbf`.
- Product/evidence head submitted for review: `edcd81accb40e77eb200185291291ecf69d2a63c`.
- Requested reviewer: `@thananun-7203` through GitHub's review-request mechanism.
- Scope submitted: Public Comments, private Internal Notes, and Requester `Problem Appears Resolved` indication only; no Actions Taken, edit/delete, email notification, or Issue #50 Administrator User Management.
- Fresh pre-review verification on the submitted product/evidence head: server build + **46 files / 261 tests**, client production build + **22 files / 126 tests**, Chromium **31/31**, retained responsive **10/10**, focused COM **8/8**, UI-05 **4/4**, E2E-04 **2/2**, and `git diff --check origin/lab3-staging...HEAD` passed.
- No peer verdict, approval, merge, or Issue closure is claimed here. Any Changes Requested must be reproduced and resolved before merge.

### Issue #50 review request - 2026-09-18 11:18 UTC

- Result: **Awaiting peer review**
- PR: [#62](https://github.com/Tanaboonnnnn/toktickit/pull/62)
- Issue: [#50](https://github.com/Tanaboonnnnn/toktickit/issues/50)
- Base: `lab3-staging` at `8216683ecc8f4d3322dbbca95ec21dfc03428f34`.
- Product/evidence head submitted for review: `1127f0338820475501ca9a249474da789482566b`.
- Requested reviewer: `@thananun-7203` through GitHub's review-request mechanism.
- Scope submitted: minimalist Administrator User Management only - safe list/search/single-role filter, create/edit/activation, separate confirmed initial-password reset, backend authorization, canonical-email concurrency, self/last-Administrator safety, and assigned-primary-owner/account race safety. No deletion, bulk/import/export, multi-role, email reset delivery, or advanced identity-management scope is included.
- Fresh verification on the submitted product/evidence head: server build + **49 files / 275 tests**, client production build + **23 files / 131 tests**, Chromium **33/33**, retained responsive **10/10**, focused USER server **14/14**, UI-06 **5/5**, E2E-05 **2/2**, and `git diff origin/lab3-staging...HEAD --check` passed.
- No peer verdict, approval, merge, or Issue closure is claimed here. Any Changes Requested must be reproduced and resolved before merge.

### Issue #50 approval and merge - 2026-09-18 12:15 UTC

- Result: **Approved and merged**
- PR: [#62](https://github.com/Tanaboonnnnn/toktickit/pull/62)
- Reviewer: `@thananun-7203`
- Reviewed head: `e09e2cdda491c891b58df5017f9ec0bc679fdf7e`.
- The reviewer found no blocking Issue #50 defect. The review confirmed Administrator-only User Management, safe User projections, create/edit/reset separation, session revocation, self/last-Administrator/assigned-owner safety, concurrency behavior, and the scoped UI/E2E evidence.
- Two follow-ups were explicitly non-blocking: a focused Admin missing-CSRF/no-mutation API test and an optional clearer stale-version “reload latest User” affordance. Issue #51 incorporates the first into its integrated security matrix; the second is not treated as new product scope without a reproduced usability defect.
- PR #62 merged to `lab3-staging` as `b568ff87dabb7716355eea622c5980dba5268db7`; Issue #50 is closed/completed.
