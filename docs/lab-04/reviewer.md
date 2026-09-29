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
- Course names / student IDs for these reviewers: **not established by the GitHub review events; not invented here**

Historical Lab 2/3 reviewer identities are not copied here as if they had reviewed Lab 4.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Sprint 4 Engineering Contract / Test DD / UI / REST contract | `@thananun-7203` | `2026-09-29T07:00:19Z` - **Changes Requested** at reviewed head `bc39d486c0d4b8717d68d0ae04d145d2c473c832` |
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Re-review of corrected contract and traceability | `@L0u1sss` | `2026-09-29T08:36:05Z` - **Changes Requested** at reviewed head `02d43b5dc42b66d6679e74bd5d045648f485854c`; explicitly confirmed the prior three fixes and requested one AC -> rubric/evidence crosswalk |
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Final review of corrected contract | `@L0u1sss` | `2026-09-29T09:05:39Z` - **Approved** at reviewed head `95b35a512c7bf3211271655018a4b52618b0b75f`; no additional blocker reported |
| [#82](https://github.com/Tanaboonnnnn/toktickit/pull/82) | Issue #72 verification / CI / evidence integrity | `@thananun-7203` | `2026-09-29T10:53:05Z` - **Changes Requested** at reviewed head `c7c51baa77bc7e713adaf8d165b1a7f696ce76c6`; two verification-safety blockers identified |

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
| PR #82 first Changes Requested | Ordinary managed verification could inherit Lab 3 evidence routing and therefore still reach historical output. | Verified as real. Managed runs now delete inherited Lab 3 routing and force a Lab 4 disposable root unless the dedicated historical Lab 3 capture command explicitly opts in with `LAB3_EVIDENCE_CAPTURE=1`; that opt-in is restricted to the managed `issue-52/<label>-<sha7>` root. Added focused regression coverage. | `scripts/lab4-evidence-paths.mjs`, `e2e/lab-02/support/run-playwright.mjs`, `e2e/lab-03/support/release-evidence.ts`, `scripts/capture-lab3-release-evidence.mjs`, harness tests | Addressed in correction; re-review pending |
| PR #82 first Changes Requested | Lab 4 release manifest accepted arbitrary scenario/Test/rubric identities as long as fields were non-empty. | Verified as real. Added stable scenario IDs derived from the Issue #71 approved evidence surfaces, parser validation against the Test DD, exact `P1`-`P9` validation, per-scenario allowed Test/rubric sets, and focused rejection tests. | `docs/lab-04/tests.md` §8.1, `scripts/lab4-verification.mjs`, `scripts/capture-lab4-release-evidence.mjs`, harness tests | Addressed in correction; re-review pending |

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
- Peer-review status: **Changes Requested** by `@thananun-7203` on reviewed head `c7c51ba`; both findings were independently verified and corrected with regression coverage. **Re-review/approval is still pending.** No Issue #72 approval or merge is pre-claimed.

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
