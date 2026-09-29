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

- Human reviewer: `@thananun-7203`
- Course name / student ID: **not established by the GitHub review event; not invented here**
- Review submitted: `2026-09-29T07:00:19Z`
- Review event: [PR #81 Changes Requested](https://github.com/Tanaboonnnnn/toktickit/pull/81#pullrequestreview-5348833150)

Historical Lab 2/3 reviewer identities are not copied here as if they had reviewed Lab 4.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#81](https://github.com/Tanaboonnnnn/toktickit/pull/81) | Sprint 4 Engineering Contract / Test DD / UI / REST contract | `@thananun-7203` | `2026-09-29T07:00:19Z` - **Changes Requested** at reviewed head `bc39d486c0d4b8717d68d0ae04d145d2c473c832` |

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

## Review-resolution log

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| PR #81 Changes Requested | `performedBy` was incorrectly defined as immutable original recorder, which could mislabel who actually performed/completed the work. | Accepted as a valid semantic gap. Split immutable `recordedBy` from assignee and server-recorded actual `performedBy` on completion; aligned DTO/UI/Test DD/dashboard attribution. | `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` | Addressed; awaiting re-review |
| PR #81 Changes Requested | Issue #71 required an explicit nine-item source -> decision -> review-status reconciliation, but decisions were scattered. | Accepted as a valid traceability gap. Added the nine-row reconciliation table with real review state and no invented final approval. | `specification.md` §11.1 | Addressed; awaiting re-review |
| PR #81 Changes Requested | Issue #71 said `regression-map.md` / `release-checklist.md` were sprint documents while PR #81 intentionally kept them local-only. | Accepted as a valid process inconsistency. Issue #71 is corrected to make the six handout files the tracked deliverables and the two helpers local execution notes only. | GitHub Issue #71; local `.git/info/exclude` remains unchanged | Addressed; awaiting re-review |

## Approval evidence

- Current reviewer verdict for PR #81: **Changes Requested; fixes pushed, re-review pending**
- Approval link: **Pending**
- Passing checks link: **Pending; Issue #71 local documentation/baseline checks are not peer approval**
- Merge status: **Not merged**

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
