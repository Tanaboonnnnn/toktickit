# Lab 2 Peer Review Evidence

This file records only peer-review evidence that actually occurred. Approval is not inferred from fixes or automated checks.

## Author and review context

- Author name: `แทนบุญ เตียวสวัสดิ์`
- Student ID: `67070507211`
- GitHub username: `@Tanaboonnnnn`
- Feature branch: `feature/5-lab2-engineering-contract`
- Issue: [#15 — Lab 2: Sprint Engineering Contract and Test Plan](https://github.com/Tanaboonnnnn/toktickit/issues/15)
- Pull request: [#16](https://github.com/Tanaboonnnnn/toktickit/pull/16) → `lab2-staging`
- Peer-review evidence follow-up: [Issue #36 — Complete Peer Review Evidence](https://github.com/Tanaboonnnnn/toktickit/issues/36)

## Reviewers

- Name: พลัฏฐ์ อมาตย์ชยาภา
- Student ID: `67070507212`
- GitHub username: `@L0u1sss`
- Lab 2 review coverage verified on GitHub: PR #16, PR #21, PR #25, and PR #27.

- Name: ฌาธนัชย์ อุทัยพิบูลย์
- Student ID: `67070507210`
- GitHub username: `@Chxtamos`
- Lab 2 review coverage verified on GitHub: PR #17, PR #19, PR #21, PR #23, PR #27, PR #29, PR #31, PR #32, PR #34, and PR #33.

## Reviews received

The table below is an auditable index of the Lab 2 reviews received in this repository. Each outcome is linked to the actual GitHub review submission; dates are UTC. Where a PR had more than one review round, both the first blocking review and the final approval are linked. PR #21 is intentionally recorded without an approval because none was verified before merge.

| PR | Scope | Reviewer(s) | Review trail (UTC) |
|---|---|---|---|
| [#16](https://github.com/Tanaboonnnnn/toktickit/pull/16) | Engineering Contract / Test Plan | `@L0u1sss` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/16#pullrequestreview-5007241677) 2026-08-24 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/16#pullrequestreview-5010088830) 2026-08-24 |
| [#17](https://github.com/Tanaboonnnnn/toktickit/pull/17) | Development Requester | `@Chxtamos` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/17#pullrequestreview-5018840546) 2026-08-25 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/17#pullrequestreview-5020303011) 2026-08-25 |
| [#19](https://github.com/Tanaboonnnnn/toktickit/pull/19) | Ticket Creation API | `@Chxtamos` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/19#pullrequestreview-5021406624) 2026-08-25 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/19#pullrequestreview-5021962962) 2026-08-25 |
| [#21](https://github.com/Tanaboonnnnn/toktickit/pull/21) | Create Ticket UI | `@Chxtamos`, `@L0u1sss` | `@Chxtamos` [changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/21#pullrequestreview-5031094548) 2026-08-26; `@L0u1sss` [changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/21#pullrequestreview-5031215706) 2026-08-26; no final approval verified before merge |
| [#23](https://github.com/Tanaboonnnnn/toktickit/pull/23) | My Tickets | `@Chxtamos` | [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/23#pullrequestreview-5044270164) 2026-08-27 |
| [#25](https://github.com/Tanaboonnnnn/toktickit/pull/25) | Ticket Detail | `@L0u1sss` | [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/25#pullrequestreview-5045385662) 2026-08-27 |
| [#27](https://github.com/Tanaboonnnnn/toktickit/pull/27) | Attachment lifecycle | `@L0u1sss`, `@Chxtamos` | `@L0u1sss` [changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/27#pullrequestreview-5055085130) 2026-08-28; `@Chxtamos` [changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/27#pullrequestreview-5057999059) 2026-08-29 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/27#pullrequestreview-5058314586) 2026-08-29 |
| [#29](https://github.com/Tanaboonnnnn/toktickit/pull/29) | E2E / Responsive quality | `@Chxtamos` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/29#pullrequestreview-5058988936) 2026-08-29 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/29#pullrequestreview-5060290944) 2026-08-30 |
| [#31](https://github.com/Tanaboonnnnn/toktickit/pull/31) | Release readiness | `@Chxtamos` | [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/31#pullrequestreview-5061178775) 2026-08-30 |
| [#32](https://github.com/Tanaboonnnnn/toktickit/pull/32) | Final evidence sync | `@Chxtamos` | [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/32#pullrequestreview-5061448316) 2026-08-30 |
| [#34](https://github.com/Tanaboonnnnn/toktickit/pull/34) | Release hygiene | `@Chxtamos` | [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/34#pullrequestreview-5066675322) 2026-08-31 |
| [#33](https://github.com/Tanaboonnnnn/toktickit/pull/33) | Final Lab 2 release | `@Chxtamos` | [Changes requested](https://github.com/Tanaboonnnnn/toktickit/pull/33#pullrequestreview-5066229800) 2026-08-31 → [Approved](https://github.com/Tanaboonnnnn/toktickit/pull/33#pullrequestreview-5066705949) 2026-08-31; merged to `main` |

## Detailed review evidence

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

## Final release PR #33 review evidence

- Pull request: [PR #33](https://github.com/Tanaboonnnnn/toktickit/pull/33) from `lab2-staging` to `main`.
- Reviewer: `@Chxtamos`.
- Initial result: **Changes requested** because the release diff still contained trailing whitespace in `docs/lab-02/specification.md`, while the release evidence claimed `git diff --check` was clean.
- Resolution: PR [#34](https://github.com/Tanaboonnnnn/toktickit/pull/34) removed the release-blocking whitespace without changing application, API, database, or test behavior.
- Final result: **Approved** after the updated release head was checked again. [Final approval](https://github.com/Tanaboonnnnn/toktickit/pull/33#pullrequestreview-5066705949)
- Merge: PR #33 merged into `main` as final Lab 2 release commit [`9f0c279`](https://github.com/Tanaboonnnnn/toktickit/commit/9f0c27997b3e99da2379f3373dea30e1dded7dd0).

### Issue #13 clarification

Issue [#13](https://github.com/Tanaboonnnnn/toktickit/issues/13) was an early duplicate planning artifact. It is closed with GitHub state reason `duplicate`, and its clarification comment points to Issue #15 / PR #16 as the authoritative Engineering Contract workflow. No separate implementation or deliverable belongs to Issue #13.

## Reviews given to peers

The tables below list the Lab 2 PR reviews verified for `@Tanaboonnnnn` on GitHub. Every row links to the actual review submission and gives its UTC date and recorded verdict. For multi-round reviews, the table links the first blocking review and the final approval. Lab 1-only review activity is intentionally excluded.

### `@L0u1sss` — 6 Lab 2 PRs reviewed

| PR | Scope | Review trail (UTC) |
|---|---|---|
| [#20](https://github.com/L0u1sss/TokTickIT/pull/20) | Specification, UI Tokens, and Test Plan Documentation | [Changes requested](https://github.com/L0u1sss/TokTickIT/pull/20#pullrequestreview-5002758180) 2026-08-23 → [Approved](https://github.com/L0u1sss/TokTickIT/pull/20#pullrequestreview-5008898579) 2026-08-24 |
| [#21](https://github.com/L0u1sss/TokTickIT/pull/21) | PostgreSQL Schema Design, Prisma Migrations, and Seed Data | [Changes requested](https://github.com/L0u1sss/TokTickIT/pull/21#pullrequestreview-5031688015) 2026-08-26 → [Approved](https://github.com/L0u1sss/TokTickIT/pull/21#pullrequestreview-5033474468) 2026-08-26 |
| [#22](https://github.com/L0u1sss/TokTickIT/pull/22) | Requester selection context | [Approved](https://github.com/L0u1sss/TokTickIT/pull/22#pullrequestreview-5044909850) 2026-08-27 |
| [#23](https://github.com/L0u1sss/TokTickIT/pull/23) | Create Ticket API, UI, and idempotency | [Approved](https://github.com/L0u1sss/TokTickIT/pull/23#pullrequestreview-5057782965) 2026-08-29 |
| [#24](https://github.com/L0u1sss/TokTickIT/pull/24) | Requester-scoped My Tickets list | [Changes requested](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058596777) 2026-08-29 → [partner response](https://github.com/L0u1sss/TokTickIT/pull/24#issuecomment-5463665186) → [Approved](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058937767) 2026-08-29 |
| [#27](https://github.com/L0u1sss/TokTickIT/pull/27) | Final E2E verification and release preparation | [Approved](https://github.com/L0u1sss/TokTickIT/pull/27#pullrequestreview-5069690813) 2026-08-31 |

#### Selected detailed review — PR #24

- **What I checked:** requester ownership isolation, URL-query validation, consistency with the My Tickets API contract, and loading/error/retry behavior for reference metadata.
- **What I found:** the URL-query handling was too permissive and the UI did not yet have a clear invalid-query state. Reference metadata also needed explicit Loading/Error/Retry states so a failed metadata request would not leave the screen ambiguous.
- **What I requested:** strict query validation, a visible invalid-query state, safe error handling, and explicit metadata failure/retry behavior with tests and documentation kept in sync.
- **Partner response:** `@L0u1sss` replied with the implemented fixes, including strict URL validation, the invalid-query state, metadata Loading/Error/Retry, safe errors, tests, and synchronized docs.
- **Re-review result:** I checked the updated PR and approved it. Evidence: [Changes Requested](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058596777) → [partner response](https://github.com/L0u1sss/TokTickIT/pull/24#issuecomment-5463665186) → [final Approval](https://github.com/L0u1sss/TokTickIT/pull/24#pullrequestreview-5058937767).

### `@Peepipat-Suesoongnuen` — 13 Lab 2 PRs reviewed

| PR | Scope | Review trail (UTC) |
|---|---|---|
| [#24](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/24) | My Tickets — owned paginated list, search/filter/sort/pagination | [Changes requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/24#pullrequestreview-5061046815) 2026-08-30 → [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/24#pullrequestreview-5061250018) 2026-08-30 |
| [#25](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/25) | Ticket Detail + Attachment lifecycle | [Changes requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/25#pullrequestreview-5066427225) 2026-08-31 → [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/25#pullrequestreview-5069658269) 2026-08-31 |
| [#26](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/26) | E2E tests + responsive Playwright screenshots | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/26#pullrequestreview-5075908254) 2026-09-01 |
| [#28](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/28) | Add missing Create Ticket coverage | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/28#pullrequestreview-5080177965) 2026-09-01 |
| [#29](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/29) | Complete Zen Green UI style and docs | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/29#pullrequestreview-5081784217) 2026-09-01 |
| [#32](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/32) | Refine My Tickets search, sorting, and navigation | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/32#pullrequestreview-5091663103) 2026-09-02 |
| [#33](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/33) | Add Back to My Tickets navigation | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/33#pullrequestreview-5092522831) 2026-09-02 |
| [#35](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/35) | Refine My Tickets readability and filters | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/35#pullrequestreview-5101445529) 2026-09-03 |
| [#36](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/36) | Complete release integration evidence | [Changes requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/36#pullrequestreview-5103845464) 2026-09-03 → [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/36#pullrequestreview-5105113084) 2026-09-03 |
| [#37](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37) | Lab 2 release | [Changes requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37#pullrequestreview-5112400805) 2026-09-04 → [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37#pullrequestreview-5113426617) 2026-09-04 |
| [#39](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/39) | Keep tickets visible during sorting | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/39#pullrequestreview-5111734934) 2026-09-04 |
| [#41](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/41) | Sync final evidence to staging | [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/41#pullrequestreview-5114881485) 2026-09-04 |
| [#42](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/42) | Promote final evidence to main | [Changes requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/42#pullrequestreview-5115426597) 2026-09-04 → [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/42#pullrequestreview-5115715858) 2026-09-04 |

#### Selected detailed review — PR #37

- **What I checked:** the exact `lab2-staging` release head, the release PR path to `main`, Issue #19 acceptance criteria, final evidence documents, and the hosted client/server/E2E CI state.
- **What I found:** the release head itself was in good shape, but Issue #19 had already been closed as Completed even though its own acceptance criteria required it to stay open until the release PR was merged to `main`, the exact final-main CI was green, and the final evidence sync was complete.
- **What I requested:** reopen Issue #19 and keep it open until the post-merge final-main gate was finished. I treated this as a process/evidence blocker, not a product-code blocker.
- **Partner response:** the issue was reopened, `reviewer.md` was synchronized to record the release review, and the exact-head CI was rerun with client/server/E2E green. The follow-up was documentation/process-state only; no production or test behavior was changed for this fix.
- **Re-review result:** [Changes Requested](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37#pullrequestreview-5112400805) → after the process/evidence correction, I rechecked the issue state and exact-head CI and [Approved](https://github.com/Peepipat-Suesoongnuen/TokTickIT/pull/37#pullrequestreview-5113426617) on 2026-09-04. Final-main verification and the final evidence sync still remained post-merge work.

### `@Chxtamos` — 15 Lab 2 PRs reviewed

| PR | Scope | Review trail (UTC) |
|---|---|---|
| [#13](https://github.com/Chxtamos/-TokTickIT-/pull/13) | Engineering contract and test plan | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/13#pullrequestreview-5007492513) 2026-08-24 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/13#pullrequestreview-5009068037) 2026-08-24 |
| [#15](https://github.com/Chxtamos/-TokTickIT-/pull/15) | Lab 2 data model and seed | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/15#pullrequestreview-5020387687) 2026-08-25 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/15#pullrequestreview-5021493072) 2026-08-25 |
| [#17](https://github.com/Chxtamos/-TokTickIT-/pull/17) | Requester context API | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/17#pullrequestreview-5031668182) 2026-08-26 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/17#pullrequestreview-5057924294) 2026-08-29 |
| [#19](https://github.com/Chxtamos/-TokTickIT-/pull/19) | Ticket creation API | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/19#pullrequestreview-5058327229) 2026-08-29; no later approval by `@Tanaboonnnnn` was verified |
| [#21](https://github.com/Chxtamos/-TokTickIT-/pull/21) | My Tickets API | [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/21#pullrequestreview-5060381829) 2026-08-30 |
| [#25](https://github.com/Chxtamos/-TokTickIT-/pull/25) | Attachment Lifecycle API | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/25#pullrequestreview-5061127238) 2026-08-30 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/25#pullrequestreview-5061161506) 2026-08-30 |
| [#27](https://github.com/Chxtamos/-TokTickIT-/pull/27) | Development Requester selection and application shell | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/27#pullrequestreview-5061315313) 2026-08-30 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/27#pullrequestreview-5066673046) 2026-08-31 |
| [#29](https://github.com/Chxtamos/-TokTickIT-/pull/29) | Create Ticket UI | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/29#pullrequestreview-5067780252) 2026-08-31 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/29#pullrequestreview-5075095202) 2026-09-01 |
| [#31](https://github.com/Chxtamos/-TokTickIT-/pull/31) | My Tickets screen | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/31#pullrequestreview-5079605515) 2026-09-01 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/31#pullrequestreview-5080314714) 2026-09-01 |
| [#33](https://github.com/Chxtamos/-TokTickIT-/pull/33) | Requester Ticket Detail screen | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/33#pullrequestreview-5086456485) 2026-09-02 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/33#pullrequestreview-5086585835) 2026-09-02 |
| [#35](https://github.com/Chxtamos/-TokTickIT-/pull/35) | Attachment lifecycle UI | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/35#pullrequestreview-5086993754) 2026-09-02 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/35#pullrequestreview-5087273555) 2026-09-02 |
| [#37](https://github.com/Chxtamos/-TokTickIT-/pull/37) | Zen Green style and accessibility evidence | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/37#pullrequestreview-5088965367) 2026-09-02 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/37#pullrequestreview-5090861536) 2026-09-02 |
| [#44](https://github.com/Chxtamos/-TokTickIT-/pull/44) | E2E requester and ticket creation flow | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/44#pullrequestreview-5102512321) 2026-09-03 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/44#pullrequestreview-5102678319) 2026-09-03 |
| [#45](https://github.com/Chxtamos/-TokTickIT-/pull/45) | E2E My Tickets ownership and Ticket Detail flow | [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/45#pullrequestreview-5103406106) 2026-09-03 |
| [#46](https://github.com/Chxtamos/-TokTickIT-/pull/46) | E2E Attachment lifecycle flow | [Changes requested](https://github.com/Chxtamos/-TokTickIT-/pull/46#pullrequestreview-5104513654) 2026-09-03 → [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/46#pullrequestreview-5116518154) 2026-09-04 |

#### Selected detailed review — PR #44

- **What I checked:** the PR body and linked Issue, Lab 2 specification/test evidence, the requester-to-Ticket E2E flow, exact-head CI, seed behavior, and whether the evidence matched the scope actually implemented.
- **What I found:** the E2E-01 flow itself was strong, including requester selection, ambiguous create-response handling, retry of the same logical request, mixed PDF/PNG attachment behavior, partial attachment failure with individual retry, and authoritative metadata checks. The blocker was traceability: the PR was being treated like the complete final-verification Issue even though `tests.md` still had E2E-02 through E2E-06 as Planned, and the workflow had only one seed run even though the final-verification criteria called for a seed-twice idempotency check.
- **What I requested:** either complete the full final-verification evidence or narrow the PR back to the E2E-01 feature scope. I also asked for the seed-twice verification required by the final gate and for the evidence to stop overclaiming unimplemented E2E IDs.
- **Partner response:** the PR scope was corrected to Feature 18 / Issue #38 / E2E-01 only, the separate final-verification Issue was left as a follow-up, the workflow ran `prisma:seed` twice, and `tests.md` marked only E2E-01 as PASS while E2E-02 through E2E-06 stayed Planned.
- **Re-review result:** [Changes Requested](https://github.com/Chxtamos/-TokTickIT-/pull/44#pullrequestreview-5102512321) → after the scope/seed/traceability corrections, I rechecked the exact-head CI and [Approved](https://github.com/Chxtamos/-TokTickIT-/pull/44#pullrequestreview-5102678319) on 2026-09-03.
## Evidence integrity note

This file records review evidence verified from the live GitHub Pull Requests pages and PR timelines for the Lab 2 work above. The received-review index covers the Lab 2 PRs reviewed by `@L0u1sss` and `@Chxtamos`; the reviews-given section covers the Lab 2 PRs found for `@L0u1sss`, `@Peepipat-Suesoongnuen`, and `@Chxtamos` under `reviewed-by:Tanaboonnnnn`. Lab 1-only review results are excluded from the Lab 2 tables. The file does not claim a hosted passing-check link where none was verified. Test/build/Prisma/browser results in `tests.md` are local execution evidence, not substitutes for peer approval.
