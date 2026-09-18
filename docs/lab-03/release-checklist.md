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
- [ ] Confirm the **latest PR head** has a successful exact-head CI evidence artifact: **41 PNGs = 27 major responsive + 14 required UI states**, with per-image provenance metadata and `manifest.sourceSha == pull_request.head.sha`. Do not treat a committed older candidate as proof of a newer HEAD.
- [ ] Commit one **repository-visible** 41-image evidence snapshot from a clean application-source SHA so instructors can browse the PNGs directly in GitHub; the containing follow-up commit must be evidence-only, and its manifest must retain the rendering source SHA.
- [x] Inspect the generated screenshot set and its automated viewport/touch/overflow assertions for clipping, overlap, unintended horizontal overflow, role/navigation errors and private-data leakage. Metadata secret scan passed; no credentials, connection strings, session secrets or CSRF tokens are recorded in the evidence metadata.
- [ ] Confirm the full `npm run verify` job passes on that same latest PR-head CI run; record the exact SHA/run in the PR conversation rather than hard-coding a moving PR SHA into this file.
- [ ] `git diff --check` passes and tracked evidence contains no `.env`, credential, session, or password material.
- [ ] GitHub Actions `Lab 3 CI` passes on the Issue #52 PR head and publishes the SHA-labelled UI evidence artifact.
- [ ] Open `feature/52-lab3-release-evidence -> lab3-staging` PR linked to Issue #52 and request real peer review.
- [ ] Resolve any Changes Requested with reproduced evidence and obtain a real approval.
- [ ] Merge the approved Issue #52 feature PR to `lab3-staging` and rerun the staging release-candidate gate.

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
