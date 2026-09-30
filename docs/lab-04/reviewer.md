# Lab 4 Peer Review Evidence

This file records only peer-review evidence that actually occurred. Approval is not inferred from fixes, automated checks, AI review, or a PR being open.

## Author and review context

- Author name: `แทนบุญ เตียวสวัสดิ์`
- Student ID: `67070507211`
- GitHub username: `@Tanaboonnnnn`
- Feature branch: `feature/71-lab4-contract`
- Issue: [#71 - Approve the Sprint 4 contract, source reconciliation and execution gates](https://github.com/Tanaboonnnnn/toktickit/issues/71)
- Pull request: [#81 - Define Sprint 4 engineering contract](https://github.com/Tanaboonnnnn/toktickit/pull/81)
- Target branch: `lab4-staging`

## Reviewers

- Human reviewer: `@thananun-7203` - review submitted `2026-09-29T07:00:19Z` - [Changes Requested](https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5348833150)
- Human reviewer: `@L0u1sss` - review submitted `2026-09-29T08:36:05Z` - [Changes Requested](https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5349827819)
- Human reviewer: `@L0u1sss` - final approval submitted `2026-09-29T09:05:39Z` on reviewed head `95b35a5` - [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5350168570)
- Human reviewer: `@thananun-7203` - PR #82 review submitted `2026-09-29T10:53:05Z` on reviewed head `c7c51ba` - [Changes Requested](https://github.com/Tanaboonnnnn/toktickit/pull/82#pullrequestreview-5351404504)
- Human reviewer: `@thananun-7203` - PR #82 final approval submitted `2026-09-29T11:43:58Z` on reviewed head `2852a72` - [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/82#pullrequestreview-5351975592)
- Human reviewer: `@thananun-7203` - PR #83 final approval submitted `2026-09-29T18:18:28Z` on reviewed head `0162e80` - [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/83#pullrequestreview-5356637472)
- Course names / student IDs for these reviewers: **not established by the GitHub review events; not invented here**

Historical Lab 2/3 reviewer identities are not copied here as if they had reviewed Lab 4.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Sprint 4 Engineering Contract / Test DD / UI / REST contract | `@thananun-7203` | `2026-09-29T07:00:19Z` - **Changes Requested** at reviewed head `bc39d486c0d4b8717d68d0ae04d145d2c473c832` |
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Re-review of corrected contract and traceability | `@L0u1sss` | `2026-09-29T08:36:05Z` - **Changes Requested** at reviewed head `02d43b5dc42b66d6679e74bd5d045648f485854c`; explicitly confirmed the prior three fixes and requested one AC -> rubric/evidence crosswalk |
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Final review of corrected contract | `@L0u1sss` | `2026-09-29T09:05:39Z` - **Approved** at reviewed head `95b35a512c7bf3211271655018a4b52618b0b75f`; no additional blocker reported |
| [#82](https://github.com/Tanaboonnnnn/toktickit/pull/82) | Issue #72 verification / CI / evidence integrity | `@thananun-7203` | `2026-09-29T10:53:05Z` - **Changes Requested** at reviewed head `c7c51baa77bc7e713adaf8d165b1a7f696ce76c6`; two verification-safety blockers identified |
| [#82](https://github.com/Tanaboonnnnn/toktickit/pull/82) | Final re-review after verification-safety corrections | `@thananun-7203` | `2026-09-29T11:43:58Z` - **Approved** at reviewed head `2852a720df6ded45e614d6ca9bf391f2b2b85207`; both prior findings confirmed resolved and no additional Issue #72 blocker reported |
| [#83](https://github.com/Tanaboonnnnn/toktickit/pull/83) | Data/seed safety review | `@thananun-7203` | `2026-09-29T16:52:58Z` - **Changes Requested** at reviewed head `8757ed1c0df9516ae786fef02bf46a85aae62dea`; the findings were verified before correction |
| [#83](https://github.com/Tanaboonnnnn/toktickit/pull/83) | Final re-review after seed-safety corrections | `@thananun-7203` | `2026-09-29T18:18:28Z` - **Approved** at reviewed head `0162e802c331634fe7ecc9ca7e7a525922e5d7a0`; PR merged into `lab4-staging` immediately afterward |

## Detailed review evidence

### Issue #71 first human review

- Result: **Changes Requested**
- Pull request: [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81)
- Reviewed PR head: `bc39d486c0d4b8717d68d0ae04d145d2c473c832`
- Branch: `feature/71-lab4-contract`
- Base: `lab4-staging`
- Contract scope: the six required Lab 4 deliverables: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `ai-use.md`, and `reviewer.md`.
- Product implementation: intentionally absent from Issue #71.
- Review found three blocking contract/process gaps: misleading original `performedBy` semantics, missing consolidated nine-item source reconciliation, and disagreement between Issue #71 and the PR over two local-only support notes.
- Review explicitly reported no additional blocker in dashboard, migration, Test DD, responsive/accessibility, concurrency, or retained-regression areas.

### Issue #71 second human review

- Result: **Changes Requested**
- Reviewer: `@L0u1sss`
- Review event: [PR #81 review](https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5349827819)
- Reviewed PR head: `02d43b5dc42b66d6679e74bd5d045648f485854c`
- The reviewer explicitly confirmed that the prior three requested corrections were complete.
- New finding: `tests.md` mapped AC -> Test ID and test/evidence paths, but did not directly map every AC to the handout's Rubric/Answer Part submission destination required by Issue #71 Acceptance.
- This finding is valid: the Issue #71 acceptance text requires every AC to map to both planned executable tests and a rubric/evidence destination.

### Issue #72 first human review

- Result: **Changes Requested**
- Reviewer: `@thananun-7203`
- Review event: [PR #82 review](https://github.com/Tanaboonnnnn/toktickit/pull/82#pullrequestreview-5351404504)
- Reviewed PR head: `c7c51baa77bc7e713adaf8d165b1a7f696ce76c6`
- Finding 1 was verified against the live code and Issue #72 Required work #4: inherited `LAB3_EVIDENCE_ROOT` could prevent the managed runner from creating a Lab 4 route, and the release-evidence helper retained a Lab 3 fallback. This could let an ordinary current run target historical Lab 3 evidence.
- Finding 2 was verified against the live code and Issue #72 Required work #8: the Lab 4 capture script required metadata fields to be non-empty but did not validate Test IDs, rubric parts, or a stable reviewed scenario identity.
- No reviewer claim about schema/API/UI scope leakage was adopted; the review explicitly reported none.

## Review-resolution log

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| PR #81 first Changes Requested | `performedBy` was incorrectly defined as immutable original recorder, which could mislabel who actually performed/completed the work. | Accepted as a valid semantic gap. Split immutable `recordedBy` from assignee and server-recorded actual `performedBy` on completion; aligned DTO/UI/Test DD/dashboard attribution. | `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` | Addressed; second review explicitly confirmed complete |
| PR #81 first Changes Requested | Issue #71 required an explicit nine-item source -> decision -> review-status reconciliation, but decisions were scattered. | Accepted as a valid traceability gap. Added the nine-row reconciliation table with real review state and no invented final approval. | `specification.md` §11.1 | Addressed; second review explicitly confirmed complete |
| PR #81 first Changes Requested | Issue #71 said `regression-map.md` / `release-checklist.md` were sprint documents while PR #81 intentionally kept them local-only. | Accepted as a valid process inconsistency. Issue #71 is corrected to make the six handout files the tracked deliverables and the two helpers local execution notes only. | GitHub Issue #71; local `.git/info/exclude` remains unchanged | Addressed; second review explicitly confirmed complete |
| PR #81 second Changes Requested | AC -> Test ID traceability existed, but every AC lacked an explicit Rubric/Answer Part evidence destination even though Issue #71 Acceptance requires it. | Accepted as a valid traceability gap. Added exact Answer Part P1-P9 key and a destination column for all AC-01..AC-28; kept every planned Test ID status unchanged. | `tests.md` §3 | Addressed; final re-review subsequently approved |
| PR #81 final review | The corrected head was rechecked after the traceability fix. | No new code/document change was required; the reviewer recorded the final approval event on exact head `95b35a5`. | GitHub review history | **Approved** `2026-09-29T09:05:39Z`; PR merged to `lab4-staging` as `6969b70a11010008db63f685a745710df68d089f` at `2026-09-29T09:05:51Z` |
| PR #82 first Changes Requested | Ordinary managed verification could inherit Lab 3 evidence routing and therefore still reach historical output. | Verified as real. Managed runs now delete inherited Lab 3 routing and force a Lab 4 disposable root unless the dedicated historical Lab 3 capture command explicitly opts in with `LAB3_EVIDENCE_CAPTURE=1`; that opt-in is restricted to the managed `issue-52/<label>-<sha7>` root. Added focused regression coverage. | `scripts/lab4-evidence-paths.mjs`, `e2e/lab-02/support/run-playwright.mjs`, `e2e/lab-03/support/release-evidence.ts`, `scripts/capture-lab3-release-evidence.mjs`, harness tests | Addressed; final re-review approved exact head `2852a72` |
| PR #82 first Changes Requested | Lab 4 release manifest accepted arbitrary scenario/Test/rubric identities as long as fields were non-empty. | Verified as real. Added stable scenario IDs derived from the Issue #71 approved evidence surfaces, parser validation against the Test DD, exact `P1`-`P9` validation, per-scenario allowed Test/rubric sets, and focused rejection tests. | `docs/lab-04/tests.md` §8.1, `scripts/lab4-verification.mjs`, `scripts/capture-lab4-release-evidence.mjs`, harness tests | Addressed; final re-review approved exact head `2852a72` |
| PR #82 final review | The corrected verification/evidence head was rechecked after both requested fixes. | No further change was required for Issue #72; the reviewer confirmed both findings resolved and recorded approval on exact head `2852a72`. | GitHub review history | **Approved** `2026-09-29T11:43:58Z`; PR merged to `lab4-staging` as `807512437c42898a37940d20fc6dea12ebb9f7a8` at `2026-09-29T11:44:07Z`; post-merge Lab 4 CI run `36563586190` succeeded |
| PR #83 first Changes Requested | Repeat-safe seed coverage demoted an Administrator who was never a Lab 4 Action assignee, so the assertion did not exercise missing-Action recreation for an ineligible assignee; the seed also recreated a missing Action from cached fixture IDs without checking the assignee's current active/role state. The empty-dashboard Requester credential was generated but discarded. | Verified both findings against the reviewed head and reproduced the blocker with a focused RED test that deleted a real Action assigned to `korn.it@example.test`, demoted/deactivated that assignee, reran seed, and observed the Action being recreated incorrectly. Missing-Action seeding now fail-closes unless the current assignee is active IT Staff/Administrator, preserves edited User state, emits the empty-dashboard credential only for local runs, and proves the assignee receives no replacement Action. The first correction head `761ee5b` exposed an over-escaped credential regex in hosted CI run `36607004558`; follow-up head `a54ad6a` corrected that test and explicit CI-flag handling. | `server/prisma/seed.ts`, `server/tests/lab-04/seed.integration.test.ts` | **Addressed**; Lab 4 CI run `36607346009` succeeded on exact code-correction head `a54ad6a250a7b3fa6de86324f256581f82c87a32`; final re-review approved exact head `0162e80` |
| PR #83 final review | The corrected Issue #73 data foundation was reviewed again on its exact final head. | No additional correction was requested. GitHub records an **Approved** review by `@thananun-7203` on `0162e802c331634fe7ecc9ca7e7a525922e5d7a0`. | GitHub review history | **Approved** `2026-09-29T18:18:28Z`; merged `2026-09-29T18:18:43Z` as `29538dd5af5cc0202d30105b4d4c2e383ddf5bec`; post-merge Lab 4 CI run `36611156891` succeeded |

## Approval evidence

- Current reviewer verdict for PR #81: **Approved** by `@L0u1sss` on exact head `95b35a512c7bf3211271655018a4b52618b0b75f`.
- Approval link: https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5350168570
- Passing-check note: Issue #71's local documentation/baseline checks remain distinct from peer approval; PR #81 had no Lab 4 Actions workflow because the Lab 4 CI increment is Issue #72.
- Merge status: **Merged** to `lab4-staging` at `2026-09-29T09:05:51Z`, merge commit `6969b70a11010008db63f685a745710df68d089f`; Issue #71 subsequently closed completed.

## Issue #72 review context

- Issue: [#72 - Prepare isolated verification, Lab 4 CI and evidence-safe regression](https://github.com/Tanaboonnnnn/toktickit/issues/72)
- Feature branch: `feature/72-lab4-verification-harness`
- Base branch: `lab4-staging`
- Starting integration SHA: `6969b70a11010008db63f685a745710df68d089f`
- Scope: verification/traceability/evidence-path/CI infrastructure only; no Lab 4 schema, Action, workflow, or Dashboard product implementation.
- Pull request: [#82 - Add isolated verification and Lab 4 CI](https://github.com/Tanaboonnnnn/toktickit/pull/82), opened `2026-09-29T10:23:44Z` from this feature branch into `lab4-staging`.
- Requested reviewer: `@L0u1sss`, requested on the live PR after creation.
- Peer-review status: first **Changes Requested** by `@thananun-7203` on reviewed head `c7c51ba`; both findings were independently verified and corrected with regression coverage. Final re-review **Approved** exact head `2852a720df6ded45e614d6ca9bf391f2b2b85207` at `2026-09-29T11:43:58Z`.
- Merge status: **Merged** to `lab4-staging` at `2026-09-29T11:44:07Z`, merge commit `807512437c42898a37940d20fc6dea12ebb9f7a8`; Issue #72 subsequently closed completed.
- Hosted verification: PR-head Lab 4 CI run `36561093872` succeeded; post-merge `lab4-staging` push run `36563586190` succeeded on exact staging SHA `807512437c42898a37940d20fc6dea12ebb9f7a8`.

## Issue #73 review context

- Issue: [#73 - Add data-preserving Actions, audit history and repeat-safe seed](https://github.com/Tanaboonnnnn/toktickit/issues/73)
- Feature branch: `feature/73-lab4-data`
- Base branch: `lab4-staging`
- Starting integration SHA: `807512437c42898a37940d20fc6dea12ebb9f7a8`
- Scope: additive Prisma/data migration, preservation/recovery tests, repeat-safe Lab 4 seed, FK-compatible fixture cleanup, and truthful trace/document evidence only; no public Action API/UI, Ticket final-gate implementation, or Dashboard implementation.
- Pull request: [#83 - Add Lab 4 data foundation and safe migration](https://github.com/Tanaboonnnnn/toktickit/pull/83), opened `2026-09-29T15:11:09Z` from `feature/73-lab4-data` into `lab4-staging` at initial head `31244df90c3f7dffd4dc0c72aa34cc848b2e54c2`.
- Requested reviewers: `@L0u1sss` and `@thananun-7203` were explicitly requested at `2026-09-29T15:11:23Z`; the live PR subsequently also lists `@cottonlnwza`, `@chaproi`, `@Chxtamos`, and `@Peepipat-Suesoongnuen` as requested reviewers. These additional requests are recorded from the live PR state, not attributed to this assistant.
- Hosted verification before review: Lab 4 CI run `36589774668` completed **success** on reviewed head `8757ed1c0df9516ae786fef02bf46a85aae62dea`.
- Peer-review status: first **Changes Requested** by `@thananun-7203` at `2026-09-29T16:52:58Z` on reviewed head `8757ed1` - [review](https://github.com/Tanaboonnnnn/toktickit/pull/83#pullrequestreview-5355766402). The seed-safety blocker and local-only empty-dashboard credential finding were independently verified before correction. Final re-review was **Approved** by `@thananun-7203` at `2026-09-29T18:18:28Z` on exact head `0162e802c331634fe7ecc9ca7e7a525922e5d7a0` - [approval](https://github.com/Tanaboonnnnn/toktickit/pull/83#pullrequestreview-5356637472).
- Correction verification: focused RED reproduced the invalid missing-Action recreation; first correction head `761ee5bf7a8a52e028d613f715f3513e5f4ed08d` then failed hosted run `36607004558` only on an over-escaped new credential assertion. Follow-up head `a54ad6a250a7b3fa6de86324f256581f82c87a32` corrected the assertion, tightened explicit CI detection and added a no-replacement assignment count; Lab 4 CI run `36607346009` completed **success**. Final human re-review later **Approved** exact head `0162e802c331634fe7ecc9ca7e7a525922e5d7a0` at `2026-09-29T18:18:28Z`.
- Pre-PR local verification: Prisma validate/generate passed; dedicated `toktickit_test` migration deploy/status reported all four migrations applied and schema up to date; `MIG-01`/`MIG-02`/`MIG-03` and `SEED-01` passed; retained Lab 3 migration/seed tests passed; Issue #73 increment trace passed; historical migration directories are byte-for-byte unchanged relative to `origin/lab4-staging`; fresh `npm run verify` completed with server **54 files / 292 tests**, client **25 files / 136 tests**, Lab 4 harness **8 Node + 3 server safety tests**, retained E2E **37**, and retained responsive **13** all passing. The known jsdom navigation warning remained non-failing.
- Merge/integration status: PR #83 merged into `lab4-staging` at `2026-09-29T18:18:43Z` as `29538dd5af5cc0202d30105b4d4c2e383ddf5bec`; post-merge Lab 4 CI push run `36611156891` completed **success** on that exact staging SHA. Issue #73 closed **completed** at `2026-09-29T18:26:17Z`.

## Issue #74 review context

- Issue: [#74 - Deliver authorized Actions APIs, safe replay and assignment concurrency](https://github.com/Tanaboonnnnn/toktickit/issues/74)
- Feature branch: `feature/74-lab4-actions-api`
- Base branch: `lab4-staging`
- Verified starting integration SHA: `29538dd5af5cc0202d30105b4d4c2e383ddf5bec`
- Startup evidence: live PR #83 merge/approval, Issue #73 completed state, exact `lab4-staging` SHA, and post-merge run `36611156891` were rechecked before branching. The stale local remote-tracking ref was fetched, and a new clean dedicated worktree was created without resetting, stashing, cleaning, deleting, or reusing preserved historical work.
- Scope: backend Actions read/create/edit/assign/lifecycle/revision APIs; backend authorization; persistent create replay; optimistic Action/Ticket versions; immutable revisions; deterministic User -> Ticket -> Action locking; Action-assignee Administrator safety and focused concurrency/regression tests. Broad Actions UI, Dashboards, and Issue #75 final Ticket resolution/cancellation integration remain out of scope.
- Local implementation milestone: the focused Issue #74 suite passes **4 files / 32 tests** after the self-review correction. It covers UNIT-01, API-01..API-06, and RACE-01..RACE-03, including actor-scoped persistent replay, nested parent-child authorization, all approved Action lifecycle edges, immutable completion provenance, completed content correction after a historical assignee becomes inactive, explicit no-op semantics, injected transaction rollback with safe 500 output, Action/Ticket stale conflicts, duplicate-create serialization, Ticket-owner concurrency, and assignment versus Administrator deactivation/demotion in both forced serialization orders. Fresh post-correction `npm run verify` passed with server **58 files / 324 tests**, client **25 files / 136 tests**, Lab 4 harness **9 Node + 3 server safety tests**, retained E2E **37/37**, retained responsive **13/13**, and both retained/Lab 4 planning trace checks passing. Issue #74 increment trace remains limited to the reviewed ten owned Test IDs.
- Pull request: [#84 - Issue #74: Add authorized Actions APIs and safe concurrency](https://github.com/Tanaboonnnnn/toktickit/pull/84), opened `2026-09-30T03:13:44Z` from `feature/74-lab4-actions-api` into `lab4-staging`. The implementation head at PR creation was `9bcde6a1e171e270eab49d174ca7ae1c534328d2`; the base remained the re-fetched `29538dd5af5cc0202d30105b4d4c2e383ddf5bec`.
- Requested human reviewers: `@thananun-7203` and `@L0u1sss` were requested after PR creation.
- Final peer-review state rechecked at Issue #75 kickoff: `@thananun-7203` submitted **APPROVED** on exact final PR #84 head `bdacb67cd42ea06b797215dbbc70dc0597d25614` at `2026-09-30T07:08:24Z`.
- Merge/integration state rechecked at Issue #75 kickoff: PR #84 merged into `lab4-staging` at `2026-09-30T07:08:44Z` as merge commit `6ced65026bc91804363108588e708f0445f3eb65`; post-merge Lab 4 CI run `36682044004` completed **success** on that exact staging SHA. Issue #74 is therefore historical completed work; no later Issue #75 evidence is attributed to PR #84.

## Issue #75 review context

- Issue: [#75 - Enforce final Ticket resolution, work cycles and append-only workflow history](https://github.com/Tanaboonnnnn/toktickit/issues/75)
- Feature branch: `feature/75-lab4-ticket-workflow`
- Base branch: `lab4-staging`
- Verified starting integration SHA: `6ced65026bc91804363108588e708f0445f3eb65`
- Startup evidence: live Issue #75 remained open with no existing branch/PR; PR #84 approval/merge and post-merge CI were rechecked; `git fetch origin` confirmed exact remote staging; a new clean dedicated worktree was created without modifying the preserved dirty root or reusing Issue #74.
- Scope: 64-pair Ticket transition enforcement; final current-cycle resolution predicate; legacy/reopen workflow cycles; atomic Ticket cancellation fan-out; immutable Ticket workflow events and read API; real Ticket/Action concurrency; backend-authoritative transition/blocker feedback; minimum Staff workflow UI and draft preservation; focused workflow/regression/E2E evidence. Complete Actions UI (#76), Dashboards, and release PDF remain out of scope.
- Local candidate verification: focused workflow/API/history **5 files / 34 tests**, real Ticket/Action concurrency **6/6**, focused Staff workflow client/regression **4 files / 21 tests**, Issue #75 increment trace **Pass**, Lab 4 E2E **2/2**, and fresh aggregate `npm.cmd run verify` **Pass** with server **62 files / 349 tests**, client **26 files / 141 tests**, harness **9 Node + 3 server safety tests**, browser E2E **39/39**, and retained responsive **13/13**. These are local results, not hosted CI.
- Mandatory pre-PR self-review: the `code-review` Skill checklist was applied against fixed base `6ced65026bc91804363108588e708f0445f3eb65` and the complete Issue #75 candidate diff, keeping Standards and Spec as separate axes. The first Spec pass found two concrete gaps: the committed status operation retained its own now-stale resolution draft, and workflow-history paging used `createdAt,id` instead of the reviewed API contract's `ticketVersion,occurredAt` ordering. Both were reproduced with focused failing tests before correction. Status success now clears only the status-owned draft while unrelated refresh/conflict drafts remain preserved; workflow history now orders by resulting Ticket version, then occurrence time, then ID for deterministic ties. A second review pass after these behavior fixes found no remaining blocking Standards or Spec finding. A possible duplicate snapshot-shaping smell between Action mutation and Ticket cancellation code was treated as a non-blocking judgement call: the current focused cancellation projection stays local rather than exporting an internal Action-service implementation detail during Issue #75.
- Pull request: [#85 - Issue #75: Enforce final Ticket workflow and history](https://github.com/Tanaboonnnnn/toktickit/pull/85), opened `2026-09-30T12:42:39Z` from `feature/75-lab4-ticket-workflow` into `lab4-staging` at initial PR head `fac2f1d7fc04838e99769f3b7c763e4f74f586a0`.
- Requested human reviewers: `@thananun-7203` and `@L0u1sss`, requested on the live PR at `2026-09-30T12:42:56Z`.
- Peer-review status: first human review is **Changes Requested** by `@L0u1sss` at `2026-09-30T13:45:26Z` on exact reviewed head `3d664a20ca4d0be6394eab4464c4ecfbe0ece813` - [review](https://github.com/Tanaboonnnnn/toktickit/pull/85#pullrequestreview-5367046186). No approval is claimed.
- Hosted verification on that exact reviewed head: Lab 4 CI run `36716706784` completed **success**. The job checked out exact SHA `3d664a20ca4d0be6394eab4464c4ecfbe0ece813`, supplied distinct `DATABASE_URL` / `TEST_DATABASE_URL`, generated Prisma Client before migration/build/test, migrated and seeded the isolated PostgreSQL test database, then ran aggregate verification. The hosted server run passed **62 files / 349 tests**, including `ticket-workflow.api.test.ts` **8/8**, `ticket-resolution-concurrency.api.test.ts` **6/6**, and `workflow-history.api.test.ts` **5/5**; client passed **26 files / 141 tests**, browser E2E **39/39**, and responsive **13/13**.

### Issue #75 self-review axes

#### Standards

- **Hard documented-standard findings:** none remaining after the second pass.
- **Judgement-call smell:** duplicated public Action revision snapshot shaping exists in the established Actions service and the new Ticket-cancellation fan-out. It is intentionally not refactored in this Issue because the two mutation modules own different transaction seams, the selected fields are bounded and explicit, and extracting a new shared implementation abstraction would broaden scope without changing the Issue #75 contract.
- **Guardrails checked:** User -> Ticket -> Action lock order is retained; actor/owner eligibility is re-read under locks; no history deletion/backfill path is added; no dependency/framework/schema migration is introduced; retained evidence files are not rewritten as historical Lab 4 proof.

#### Spec

- **Corrected finding 1:** successful formal status mutation previously preserved the operation's own stale draft. A UI RED proved the Resolution Summary remained mounted after `RESOLVED`; the fix clears only status-owned selection/summary/cancel/confirmation after success, while the existing unrelated-owner-refresh and 409-reload draft tests remain green.
- **Corrected finding 2:** workflow-event paging previously sorted by event time/ID, while reviewed `api-spec.md` requires resulting `ticketVersion ASC, occurredAt ASC`. A server RED reversed fixture event timestamps and proved the wrong first page; the fix orders by Ticket version, occurrence time, then ID.
- **Second-pass result:** no remaining blocking Issue #75 requirement gap or out-of-scope product behavior identified.

### Issue #75 PR handoff state

- PR #85 is intentionally **not self-approved or self-merged**.
- The PR body links Issue #75 with `Closes #75`; because the PR targets the non-default integration branch `lab4-staging`, issue closure remains a separately verified post-integration action rather than something inferred from the keyword.
- The initial PR head is `fac2f1d7fc04838e99769f3b7c763e4f74f586a0`; this documentation sync will produce a later PR head, so hosted CI/review evidence must always be tied to the actual latest remote SHA shown by GitHub, not this initial creation SHA.

### Issue #75 first human review disposition

Review: `@L0u1sss`, **Changes Requested**, `2026-09-30T13:45:26Z`, exact reviewed head `3d664a20ca4d0be6394eab4464c4ecfbe0ece813`.

| Reviewer finding | Classification | Evidence / response |
|---|---|---|
| Reviewer-local integration/API/concurrency tests could not start because that environment had no `DATABASE_URL` / `TEST_DATABASE_URL`. | **Valid reviewer-environment limitation; not a product defect.** | The failure describes the reviewer's machine, not the PR behavior. The exact same reviewed SHA was already exercised by hosted Lab 4 CI run `36716706784` with isolated PostgreSQL and distinct database URLs. No product/test assertion is weakened and no environment secret is added to the repository. |
| Migration, transaction, race-condition and authorization behavior therefore could not be confirmed from the reviewer's local run. | **Outdated as a project-level verification gap once exact-head hosted evidence is considered.** | Run `36716706784` succeeded on exact SHA `3d664a20...`; its aggregate server suite passed **349 tests**, including Issue #75 API/history tests and the **6/6** real Ticket/Action concurrency suite. The workflow also applies migrations to the dedicated test DB before verification. No code change is justified by this finding. |
| `docs/lab-04/reviewer.md` still said hosted PR-head CI / human review were pending. | **Valid evidence-document gap.** | Corrected in this review-response update: the document now records the real Changes Requested event, reviewed SHA, exact hosted CI run and verified results. Final-main/release evidence remains correctly pending because PR #85 is not merged/released. |
| Ensure CI runs `npx prisma generate` before build/test because a stale generated client can fail compilation. | **Already satisfied; no workflow defect.** | `.github/workflows/lab4-ci.yml` has a dedicated **Generate Prisma Client** step before migration/seed/aggregate verification. Hosted job `109891772340` shows `npx prisma generate --schema prisma/schema.prisma` ran successfully on the reviewed head before tests. No workflow edit is needed. |

No application, migration, authorization, lock, or workflow behavior change is made in response to this review because the review did not identify a reproducible product defect. This response changes living review evidence only. Because the evidence commit moves the PR head, re-review is required on the new head and Approval remains pending until GitHub records it.

## Evidence integrity rules for later updates

When review starts, this document must record:

1. the actual PR number/link and reviewed head SHA;
2. reviewer name, student ID where known from the course pairing, and GitHub username;
3. each real Changes Requested / Comment / Approval event with its GitHub link and UTC time when available;
4. the exact finding and whether it is a valid contract gap, out-of-scope preference, or outdated/incorrect finding;
5. the actual author response and changed file/decision;
6. re-review/approval only after GitHub shows that event;
7. merge evidence only after an authorized merge really occurs.

AI review can be used to inspect findings but must never be represented as the required human peer review.
