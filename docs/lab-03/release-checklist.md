# Lab 3 Release Checklist

This is the Issue #52 execution checklist. A checked item must be backed by a real repository/GitHub/test event. It must never be checked because the event is merely planned.

## A. Accepted integration baseline

- [x] PR #63 / Issue #51 received real peer approval.
- [x] PR #63 merged to `lab3-staging` as `890e136e30cb56d87290ff3b70390e0ae26c3ce4`.
- [x] Issue #52 branch was created from that exact accepted staging merge.
- [x] Fresh pre-edit Issue #52 baseline: server build + 51 files / 285 tests, client build + 25 files / 136 tests, TRACE-01 50 Test IDs / 32 ACs, Chromium 37/37, retained responsive 10/10.
- [x] The initial fresh-worktree Prisma setup failure was classified correctly as setup-only and resolved by generating Prisma Client; no product fix was invented.

## B. Issue #52 release-evidence branch

- [x] Reconcile all six required Lab 3 docs with actual Issues #41-#51 review/merge/test evidence.
- [x] Reconcile README Lab 3 setup/review/release instructions.
- [x] Corrective PR #65 exact head `aecda76d5a15fc8e1c1dfbc30f8f1f00507b6d17` had successful Lab 3 CI run #6 before merge; the release-evidence pipeline required **41 PNGs = 27 major responsive + 14 required UI states** with exact-SHA provenance.
- [x] Replaced the earlier repository-visible Issue #52 snapshot with the professional-data snapshot `repository-evidence-6452f4d/`, rendered from clean corrective source `6452f4df2fdbe091ff378a0e35d60f6e4a180dd0`. It contains **41 PNGs = 27 major responsive + 14 state screenshots**, 41 sibling metadata files, exact source/expected-SHA agreement, a passing secret scan, and a passing technical-fixture-token scan. The older `2f56ea8...` set remains only in Git history as evidence of the accidentally merged PR #64 and is no longer the current browsable snapshot.
- [x] Inspect the generated screenshot set and its automated viewport/touch/overflow assertions for clipping, overlap, unintended horizontal overflow, role/navigation errors and private-data leakage. Metadata secret scan passed; no credentials, connection strings, session secrets or CSRF tokens are recorded in the evidence metadata.
- [x] Corrective PR #65 hosted CI completed successfully on exact head `aecda76d5a15fc8e1c1dfbc30f8f1f00507b6d17`; later release and exact-main CI repeated the full aggregate gate.
- [x] `git diff --check` passes locally and the regenerated repository evidence passed scans for `.env`/database/session/CSRF/password-hash material and technical fixture identifiers.
- [x] GitHub Actions `Lab 3 CI` passed on the Issue #52 corrective head and later on the reviewed release/main heads, with SHA-labelled UI evidence artifacts.
- [x] PR #64 (`feature/52-lab3-release-evidence -> lab3-staging`) had successful CI evidence and a real **Approved** review from `@L0u1sss` at 2026-09-18 19:20:47 UTC, then merged as `51f2b4bc710025c92eb17173c9d17efca8aef50d` at 19:20:58 UTC. The later user-requested professional evidence-data cleanup was still unfinished at that point, which is why this corrective follow-up exists.
- [x] Confirmed that the accidental GitHub Revert click created only a remote revert branch; no Revert PR/merge occurred. The unused revert branch was deleted because reverting the whole PR would remove valid CI/evidence infrastructure.
- [x] Opened corrective PR #65 (`fix/52-professional-evidence-data -> lab3-staging`) with the approved PR #64 history and later unfinished presentation-cleanup scope explained explicitly; requested fresh review from `@L0u1sss`.
- [x] PR #65 received a real peer `COMMENTED` review before merge. No formal Approval is claimed for PR #65; the later documentation sync PR #66 received Changes Requested followed by a real Approved re-review before the release PR was opened.
- [x] The integrated staging release candidate was rerun before final release. PR #67 later advanced to exact head `8bbc9710b934efd5a6c642a6155d79f7c01a5f1a` after security correction PR #68 merged, and Lab 3 CI run #14 passed on that release head before Approval.

## C. Release to main

- [x] Opened final release PR #67, `lab3-staging -> main`, after integrated staging verification.
- [x] PR #67 received a real blocking Changes Requested review from `@L0u1sss`; Multer correction PR #68 then received a real Approved review and merged; updated PR #67 received a real Approved re-review from `@Chxtamos` on exact release head `8bbc9710b934efd5a6c642a6155d79f7c01a5f1a`.
- [x] Merged the reviewed PR #67 to `main`.
- [x] Recorded the exact product-release `main` SHA: `dad3746328f71b2873e0d90495c49aa483855d5b`.
- [x] GitHub Actions Lab 3 CI run #15 freshly ran the full `npm run verify` gate on that exact `main` SHA: server **51 files / 285 tests**, client **25 files / 136 tests**, TRACE **50 Test IDs / 32 ACs**, Chromium **37/37**, responsive **10/10**.
- [x] The same exact-main run captured **41 screenshots = 27 major responsive + 14 states** and published `lab3-ui-evidence-dad3746328f71b2873e0d90495c49aa483855d5b`.
- [x] Final-main product-release results are recorded without pretending a later documentation-only evidence commit was the tested product SHA.
- [x] AC-32 is confirmed for the released product tree after exact-main run #15 passed.

## D. Course evidence still requiring a human

- [x] `reviewer.md` links **28 real Lab 3 PR review submissions** given by `@Tanaboonnnnn` across six classmates.
- [ ] Student-authored/confirmed `My Reflection` is supplied for the final submission.
- [ ] Final one-PDF `Answer Part 1` through `Answer Part 9` submission is prepared after this evidence/document synchronization is reviewed and promoted. The student has now explicitly asked to proceed toward the PDF after the repository evidence is synchronized.

The PDF item remains unchecked until the final evidence-sync/review state is settled and the student confirms the personal `My Reflection` content used in the submission.
