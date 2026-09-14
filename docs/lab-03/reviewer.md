# Lab 3 Peer Review Evidence

This file records only peer-review evidence that actually occurred. Approval is not inferred from AI output, document drafting, branch creation, automated checks, or an open pull request.

## Author and review context

- Author name: `แทนบุญ เตียวสวัสดิ์`
- Student ID: `67070507211`
- GitHub username: `@Tanaboonnnnn`
- Feature branch: `feature/41-lab3-contract`
- Issue: [#41 — Record the baseline and define the Sprint 3 engineering contract](https://github.com/Tanaboonnnnn/toktickit/issues/41)
- Pull request: [#53 — docs: define Lab 3 Sprint 3 engineering contract](https://github.com/Tanaboonnnnn/toktickit/pull/53) → `lab3-staging`
- Current scope: Sprint 3 engineering contract and planning reconciliation only; no application feature implementation, database migration, seed/reset, or release merge.

## Reviewers

- Name: ฌาธนัชย์ อุทัยพิบูลย์
- GitHub username: `@Chxtamos`
- Lab 3 review coverage verified on GitHub: PR #53 Engineering Contract review submitted 2026-09-14 17:15 UTC.

- GitHub username: `@thananun-7203`
- Lab 3 review coverage verified on GitHub: PR #53 Engineering Contract review submitted 2026-09-14 18:33 UTC against head `4ff85cb`.

Other users may be requested for review on GitHub, but this file records a reviewer only after a real review submission is verifiable.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#53](https://github.com/Tanaboonnnnn/toktickit/pull/53) | Cross-document reference-data/API/Test DD consistency | `@thananun-7203` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201418919) 2026-09-14 18:33; response revision prepared; re-review pending |
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

## Approval evidence

- Current reviewer verdicts for PR #53: **Changes Requested** from both recorded reviewers; no later approval is recorded yet.
- Review links: [Review 1](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5200694235), [Review 2](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5201418919)
- Final approval: **None recorded yet.**
- Passing-check link: no hosted passing-check result is claimed here. Issue #41 document consistency checks are separate engineering evidence, not peer approval.
- Merge status: **Open and not merged into `lab3-staging`.**

## Reviews given to peers

No Lab 3 peer-review-given evidence has been added yet. Lab 2 reviews are not copied into this Lab 3 section as if they were Sprint 3 review work. Future Lab 3 reviews given by `@Tanaboonnnnn` will be linked here only after they actually occur.

## Evidence integrity note

This file follows the Lab 2 peer-review evidence layout while recording Lab 3 evidence only. PR #53, Issue #41, the feature/base branches, the `@Chxtamos` and `@thananun-7203` Changes Requested reviews, and the review-response changes above are verifiable artifacts. No approval, successful re-review, merge, hosted CI result, or future review activity is inferred. Automated document checks and AI analysis are supporting engineering evidence, not substitutes for the peer-review evidence required by the course.
