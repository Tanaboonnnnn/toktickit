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
- [ ] Confirm the **corrective follow-up PR head** has a successful exact-head CI evidence artifact: **41 PNGs = 27 major responsive + 14 required UI states**, with per-image provenance metadata and `manifest.sourceSha == pull_request.head.sha`.
- [x] Replaced the earlier repository-visible Issue #52 snapshot with the professional-data snapshot `repository-evidence-6452f4d/`, rendered from clean corrective source `6452f4df2fdbe091ff378a0e35d60f6e4a180dd0`. It contains **41 PNGs = 27 major responsive + 14 state screenshots**, 41 sibling metadata files, exact source/expected-SHA agreement, a passing secret scan, and a passing technical-fixture-token scan. The older `2f56ea8...` set remains only in Git history as evidence of the accidentally merged PR #64 and is no longer the current browsable snapshot.
- [x] Inspect the generated screenshot set and its automated viewport/touch/overflow assertions for clipping, overlap, unintended horizontal overflow, role/navigation errors and private-data leakage. Metadata secret scan passed; no credentials, connection strings, session secrets or CSRF tokens are recorded in the evidence metadata.
- [ ] Confirm the full `npm run verify` job passes on that same latest PR-head CI run; record the exact SHA/run in the PR conversation rather than hard-coding a moving PR SHA into this file. Local corrective pre-PR verification is already green: server **285/285**, client **136/136**, TRACE **50 Test IDs / 32 ACs**, Chromium **37/37**, responsive **10/10**.
- [x] `git diff --check` passes locally and the regenerated repository evidence passed scans for `.env`/database/session/CSRF/password-hash material and technical fixture identifiers.
- [ ] GitHub Actions `Lab 3 CI` passes on the Issue #52 PR head and publishes the SHA-labelled UI evidence artifact.
- [x] PR #64 (`feature/52-lab3-release-evidence -> lab3-staging`) had successful CI evidence and a real **Approved** review from `@L0u1sss` at 2026-09-18 19:20:47 UTC, then merged as `51f2b4bc710025c92eb17173c9d17efca8aef50d` at 19:20:58 UTC. The later user-requested professional evidence-data cleanup was still unfinished at that point, which is why this corrective follow-up exists.
- [x] Confirmed that the accidental GitHub Revert click created only a remote revert branch; no Revert PR/merge occurred. The unused revert branch was deleted because reverting the whole PR would remove valid CI/evidence infrastructure.
- [x] Opened corrective PR #65 (`fix/52-professional-evidence-data -> lab3-staging`) with the approved PR #64 history and later unfinished presentation-cleanup scope explained explicitly; requested fresh review from `@L0u1sss`.
- [ ] Obtain a real peer approval on the corrective follow-up before merging it.
- [ ] After that approved corrective merge, rerun the staging release-candidate gate before any `lab3-staging -> main` release PR.

## C. Release to main

- [ ] Open one release PR `lab3-staging -> main` after integrated staging verification passes.
- [ ] Obtain real peer review/approval for the release PR; AI output is not approval.
- [ ] Merge only the reviewed release PR to `main`.
- [ ] Record the exact delivered `main` SHA.
- [ ] Freshly run full `npm.cmd run verify` on that exact `main` SHA.
- [ ] Run `npm.cmd run capture:evidence:lab3 -- final-main` on that exact `main` SHA and verify 41 screenshots + manifest.
- [ ] Record final-main results in Issue #52/release evidence without pretending a later evidence commit was the tested product SHA.
- [ ] Confirm AC-32 only after the exact-main gate above passes.

## D. Course evidence still requiring a human

- [ ] At least one real Lab 3 peer review **given** by `@Tanaboonnnnn` is linked in `reviewer.md` if the course evidence requires review-given proof.
- [ ] Student-authored/confirmed `My Reflection` is supplied for the final submission.
- [ ] Final one-PDF `Answer Part 1` through `Answer Part 9` submission is prepared later. **Explicit student instruction for this Issue #52 work session: do not generate the PDF now.**

The PDF item is intentionally deferred and must remain unchecked until the student asks for the final submission artifact.
