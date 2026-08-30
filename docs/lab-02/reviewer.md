# Lab 2 Peer Review Evidence

This file records only peer-review evidence that actually occurred. Approval is not inferred from fixes or automated checks.

## Author and review context

- Author name: `แทนบุญ เตียวสวัสดิ์`
- Student ID: `67070507211`
- GitHub username: `@Tanaboonnnnn`
- Feature branch: `feature/5-lab2-engineering-contract`
- Issue: [#15 — Lab 2: Sprint Engineering Contract and Test Plan](https://github.com/Tanaboonnnnn/toktickit/issues/15)
- Pull request: [#16](https://github.com/Tanaboonnnnn/toktickit/pull/16) → `lab2-staging`

## Reviewer

- Name: พลัฏฐ์ อมาตย์ชยาภา
- Student ID: `67070507212`
- GitHub username: `@L0u1sss`
- Current review status: **Approved and merged** (PR #16)

## Reviews received

### Review 1 — 2026-08-24 11:20 UTC

- Result: **Changes requested**
- Main contract findings: the Empty/No Results probe used invalid `pageSize=1`, and Category ordering conflicted with the existing Lab 1 `id asc` behavior.
- Response: changed the unrestricted probe to `pageSize=10` and restored Category ordering to `id asc`. Findings about the separate incomplete implementation were not used to weaken the engineering contract.

### Review 2 — 2026-08-24 14:49 UTC

- Result: **Changes requested**
- Review: [PR #16](https://github.com/Tanaboonnnnn/toktickit/pull/16)
- Main findings addressed in the contract: Ticket Detail upload states/actions, explicit `5 MiB = 5,242,880 bytes` team interpretation, ambiguous create retry behavior, reference-data failure/retry behavior, parent Ticket refresh after Attachment mutation, and E2E-04 traceability.
- Response: the contract and planned-test wording were updated for those confirmed inconsistencies. Production-hardening scope was retained because it is a deliberate design choice rather than a confirmed defect.
- Still open from this review: actual `ai-use.md` evidence, peer-review evidence completion, and the branch-number convention.

### Review 3 — 2026-08-24 15:47 UTC

- Result: **Changes requested**
- Review evidence: [GitHub review](https://github.com/Tanaboonnnnn/toktickit/pull/16#pullrequestreview-5009163494)
- Reviewed commit: [`ef06c34`](https://github.com/Tanaboonnnnn/toktickit/commit/ef06c34a101b3e09b63bfeb862766e909497b7ba)
- Findings: `reviewer.md` still contained placeholders, the feature branch number differed from Issue #15, and UI-03 claimed AC-37 while the AC matrix omitted UI-03.
- Response: this file now records the real review evidence, and UI-03 was added to the AC-37 traceability row in `tests.md`.
- Branch status: `feature/5-lab2-engineering-contract` was not renamed. This remains a historical branch-number deviation, but PR #16 was subsequently approved and merged into `lab2-staging`.

### Final PR #16 approval and merge — 2026-08-24

- Final reviewer verdict: **Approved** by `@L0u1sss` at 2026-08-24 16:18 UTC.
- Merge: PR #16 merged into `lab2-staging` at 2026-08-24 16:18 UTC as merge commit [`29f7697`](https://github.com/Tanaboonnnnn/toktickit/commit/29f7697e1c394eb9a391e45a64de95fab01dc303).
- The branch-number mismatch was not corrected retroactively and is recorded as a historical process deviation rather than an unresolved product finding.

## Review-resolution log

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| Review 1 | Invalid `pageSize=1` probe | Use allowed `pageSize=10` | Contract docs | Resolved |
| Review 1 | Category ordering conflicted with Lab 1 | Use `id asc` | Contract/test-plan docs | Resolved |
| Review 2 | Ticket Detail upload contract incomplete | Added upload controls/states/limit behavior | `ui-spec.md`, `tests.md` | Resolved |
| Review 2 | `5 MB` value was actually 5 MiB | Made the team interpretation explicit | Contract docs | Resolved |
| Review 2 | UI/API transitions were underspecified | Defined retry/freeze, reference failure/retry, and refresh behavior | Contract docs | Resolved |
| Review 2 | E2E-04 traceability overclaimed AC-17 | Narrowed E2E-04 scope | `tests.md` | Resolved |
| Review 3 | Review evidence remained placeholder-only | Recorded actual reviewer/review evidence | `reviewer.md` | Resolved |
| Review 3 | UI-03 / AC-37 matrix mismatch | Added UI-03 to AC-37 mapping | `tests.md` | Resolved |
| Review 3 | Branch number differs from Issue #15 | No retroactive rename; PR #16 was approved and merged | Git process | Closed as historical deviation |

## Issue #28 / PR #29 review evidence

### Review 4 — 2026-08-29 19:33 UTC

- Result: **Changes requested**
- Reviewer: `@Chxtamos`
- Review: [PR #29 review](https://github.com/Tanaboonnnnn/toktickit/pull/29#pullrequestreview-5058988936)
- Finding 1: the Desktop My Tickets evidence screenshot showed selected toolbar values clipped inside narrow select controls even though the Test DD/UI evidence claimed no clipped labels or controls.
- Finding 2: the responsive automation only proved viewport containment/page overflow and did not verify that the selected option text itself fit inside each visible toolbar select.
- Finding 3: the PR description did not explicitly link/close Issue #28.
- Response: added a browser-level selected-option readability assertion, reproduced the defect as a failing RESP-01 check, changed the Desktop toolbar grid to preserve readable control widths, regenerated `my-tickets-desktop.png`, reran the full responsive suite (`10/10` passed), and added `Closes #28` to the PR description.
- Re-review: [final APPROVED review](https://github.com/Tanaboonnnnn/toktickit/pull/29#pullrequestreview-5060290944) by `@Chxtamos` at 2026-08-30 08:04 UTC confirmed the selected-option assertion, Desktop toolbar reflow, regenerated screenshot, responsive/client evidence, and Issue #28 traceability.
- Merge: PR #29 merged into `lab2-staging` at 2026-08-30 08:04 UTC as merge commit [`ec14f13`](https://github.com/Tanaboonnnnn/toktickit/commit/ec14f13a8ed8bf8f4c161db43c46c9a91f4e2643).
- Status: **Approved and merged**.

| Review | Finding | Student response | File/change | Status |
|---|---|---|---|---|
| Review 4 | Desktop My Tickets selected values were clipped | Reflowed the desktop filter toolbar so select values have sufficient readable width | `client/src/styles.css`, regenerated `artifacts/lab-02/screenshots/my-tickets/my-tickets-desktop.png` | Resolved; approved on re-review |
| Review 4 | Responsive checks could miss select text clipping | Added browser measurement of selected option text against actual rendered control width at Desktop/Tablet/Mobile | `e2e/lab-02/support/ui.ts`, `responsive-*.spec.ts` | Resolved; approved on re-review |
| Review 4 | PR lacked explicit Issue #28 traceability | Added `Closes #28` to PR description | PR #29 metadata | Resolved; approved on re-review |

## Approval evidence

- Final reviewer verdict for PR #29: **Approved**
- Approval link: [PR #29 final approval](https://github.com/Tanaboonnnnn/toktickit/pull/29#pullrequestreview-5060290944)
- Passing checks link: no hosted GitHub check link was verified; fresh local release-candidate verification is recorded in `tests.md`.
- Merge status: **Merged into `lab2-staging`** at 2026-08-30 08:04 UTC.

## Issue #30 / PR #31 release-readiness review evidence

### Review 5 - 2026-08-30

- Pull request: [PR #31](https://github.com/Tanaboonnnnn/toktickit/pull/31) from `feature/13-lab2-release-readiness` to `lab2-staging`.
- Reviewed commit: [`abf0eff`](https://github.com/Tanaboonnnnn/toktickit/commit/abf0eff1d962dbd0f1066e3acbef5bd399cc7aa5).
- Reviewer: `@Chxtamos`.
- Result: **Approved** at 2026-08-30 15:20 UTC. [Review evidence](https://github.com/Tanaboonnnnn/toktickit/pull/31#pullrequestreview-5061178775)
- Review summary: the reviewer found no code blocker in the release-readiness diff. The Create Ticket read-only field grouping, regression coverage, corrected My Tickets Empty-state responsive assertion, documentation/evidence updates, screenshot tracking, and repository hygiene were accepted.
- Reviewer follow-up note: before Issue #30 is closed, keep truthful evidence that Issue #13 is a superseded duplicate and make the database used by migration-status evidence explicit.
- Merge: PR #31 merged into `lab2-staging` at 2026-08-30 15:20 UTC as merge commit [`2acc5bb`](https://github.com/Tanaboonnnnn/toktickit/commit/2acc5bb1574780f740a29b89a3cc57e6f02b50ac).
- Status: **Approved and merged**.

### Issue #13 clarification

Issue [#13](https://github.com/Tanaboonnnnn/toktickit/issues/13) was an early duplicate planning artifact. It is closed with GitHub state reason `duplicate`, and its clarification comment points to Issue #15 / PR #16 as the authoritative Engineering Contract workflow. No separate implementation or deliverable belongs to Issue #13.

## Reviews given to a partner

| Partner name / GitHub username | Student ID if required | PR link | Review date | Review comments link | Partner response/resolution |
|---|---|---|---|---|---|
| `@L0u1sss` | `67070507212` | [L0u1sss/TokTickIT PR #24](https://github.com/L0u1sss/TokTickIT/pull/24) | 2026-08-29 | [Changes Requested](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058596777); [final Approval](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058937767) | Reviewed requester isolation, query-contract consistency, invalid URL-query handling, and reference-metadata failure states. The partner [responded with the fix summary](https://github.com/L0u1sss/TokTickIT/pull/24#issuecomment-5463665186), adding strict URL validation, an invalid-query state, metadata Loading/Error/Retry, safe error handling, tests, and synchronized docs. Re-review approved the fixes; PR #24 then merged into `lab2-staging`. |

## Evidence integrity note

This file records review evidence verified from the live public GitHub artifacts for PR #16, PR #29, PR #31, Issue #13, and partner PR #24, plus identity metadata already present in the approved repository evidence. It does not claim a hosted passing-check link for PR #29 because none was verified. Test/build/Prisma/browser results are local execution evidence in `tests.md`, not substitutes for peer approval.
