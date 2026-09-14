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

Other users may be requested for review on GitHub, but this file records a reviewer only after a real review submission is verifiable.

## Reviews received

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
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

1. `api-spec.md` now defines shared response DTOs, endpoint-by-endpoint success responses, applicable safe error/status families, session/cookie/CSRF behavior, and exact response bodies for the new Lab 3 endpoint families.
2. `specification.md` Data Changes now defines User/Ticket/Comment/Note fields and relationships, required indexes/constraints, the migration-owned PostgreSQL session-store table, and the ordered forward-migration/backfill sequence.
3. The migration contract now defines an explicit local-only initial-password provisioning flow for existing migrated Requesters: unprovisioned accounts start with no hash, an explicit local command generates one-time random initial passwords, only hashes are stored, `mustChangePassword=true`, reruns skip already-provisioned accounts, and the behavior is covered by `MIG-01`/`SEED-02` planning.
4. `tests.md` now states the exact **50 unique planned Test IDs** and clarifies that Test-ID count is different from eventual runner assertion/test-case count.
5. The PR metadata is updated to use the current count and current document scope rather than the stale 44-test statement.
6. The internal `implementation-plan.md` planning artifact is removed from the PR because it is not an instructor-required Lab 3 deliverable and the project owner explicitly requested that it not be uploaded. Issue references are synchronized so no later work treats that internal plan as repository source of truth.

No product feature, migration execution, seed/reset, database mutation, or peer approval is claimed by these review-response changes.

## Review-resolution log

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| Review 1 | API response schemas/status codes incomplete | Added shared DTOs plus endpoint success/error/status contracts | `api-spec.md` | Resolved in revised head; pending re-review |
| Review 1 | Data model/session store underspecified | Added concrete fields, FKs, indexes/constraints, session-store table and migration ownership | `specification.md`, `api-spec.md` | Resolved in revised head; pending re-review |
| Review 1 | Existing Requester initial-password migration flow unspecified | Added explicit local one-time provisioning flow and planned migration/seed assertions | `specification.md`, `api-spec.md`, `tests.md` | Resolved in revised head; pending re-review |
| Review 1 | PR claimed 44 tests while Test DD had 50 IDs | Made 50 unique Test IDs explicit and synchronized PR metadata | `tests.md`, PR #53 description | Resolved in revised head; pending re-review |
| Review 1 follow-up | Internal implementation plan should not be uploaded | Remove `docs/lab-03/implementation-plan.md` from PR and remove repository references to it | PR #53 / Issue #41 / Issue #42 metadata | Resolved in revised head; pending re-review |

## Approval evidence

- Current reviewer verdict for PR #53: **Changes Requested**.
- Review link: [PR #53 Changes Requested](https://github.com/Tanaboonnnnn/toktickit/pull/53#pullrequestreview-5200694235)
- Final approval: **None recorded yet.**
- Passing-check link: no hosted passing-check result is claimed here. Issue #41 document consistency checks are separate engineering evidence, not peer approval.
- Merge status: **Open and not merged into `lab3-staging`.**

## Reviews given to peers

No Lab 3 peer-review-given evidence has been added yet. Lab 2 reviews are not copied into this Lab 3 section as if they were Sprint 3 review work. Future Lab 3 reviews given by `@Tanaboonnnnn` will be linked here only after they actually occur.

## Evidence integrity note

This file follows the Lab 2 peer-review evidence layout while recording Lab 3 evidence only. PR #53, Issue #41, the feature/base branches, the `@Chxtamos` Changes Requested review, and the review-response changes above are verifiable artifacts. No approval, successful re-review, merge, hosted CI result, or future review activity is inferred. Automated document checks and AI analysis are supporting engineering evidence, not substitutes for the peer-review evidence required by the course.
