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
- Current review status: **Changes requested**

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
- Branch status: `feature/5-lab2-engineering-contract` is unchanged for the existing PR. Issue #15 requires `feature/<actual-issue-number>-lab2-engineering-contract`, so this process mismatch remains open pending a decision to rename or an instructor/TA exception.

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
| Review 3 | Branch number differs from Issue #15 | No rename performed yet | Git process | Open |

## Approval evidence

- Final reviewer verdict: **Changes requested**
- Approval link: `[Add only after an actual approval review]`
- Passing checks link: `[Add only after checks actually run]`
- Merge status: **Not merged**

## Reviews given to a partner

| Partner name / GitHub username | Student ID if required | PR link | Review date | Review comments link | Partner response/resolution |
|---|---|---|---|---|---|
| `[Add only after giving a real review]` | `[Actual value]` | `[Actual link]` | `[Actual date]` | `[Actual link]` | `[Actual response]` |

## Evidence integrity note

Only review evidence verified from PR #16 or supplied directly by the students is recorded above. The author name/student ID, final approval, passing-check link, and partner-review evidence remain blank until real evidence is available.
