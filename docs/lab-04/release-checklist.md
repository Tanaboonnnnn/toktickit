# Lab 4 Release Checklist

This checklist is the current Issue #80 release gate. It records only events that actually happened; unchecked items are not implied complete.

## Current reviewed staging candidate

- Integration branch: `lab4-staging`
- PR #94 exact reviewed head: `22078b2b6e0f7680e45b44f4bcec7b2645becac0`; approved by `@L0u1sss` and merged into `lab4-staging` as `65770a03190ead324066461192abd0cfbd8e2988`.
- Current promotion candidate at the PR #95 opening/review checkpoint: `65770a03190ead324066461192abd0cfbd8e2988`.
- Post-merge staging CI: run `37124131599` - success on exact SHA `65770a03190ead324066461192abd0cfbd8e2988`.
- PR #95 exact-head CI at that candidate: run `37124638527` - success.
- Remote `main` at this checkpoint: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116` (Lab 3); no exact-main result is claimed before promotion merges.

## Documentation and repository state

- [x] Six required Lab 4 documents exist: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`.
- [x] Contract/API/UI status banners match the implemented staging state rather than the original Issue #71 pre-implementation state.
- [x] Test DD has 57 unique Test IDs covering AC-01 through AC-28.
- [x] `SPEC-01` is reconciled with the final staging contract.
- [x] README setup, migration, seed, verification, E2E/responsive commands and Node prerequisite are current.
- [x] `.gitignore` keeps transient Lab 4 test output ignored while grader-facing screenshots remain trackable.
- [x] `regression-map.md` records the final staging regression checkpoint.
- [x] Human review records through approved/merged PR #94 and the current Changes Requested review on PR #95 are preserved separately from AI review and CI.
- [x] Student confirmed the first-person `My Reflection` text in `ai-use.md` after a final wording pass.
- [x] Student provided a Project/Kanban checkpoint screenshot showing Backlog 0, Specified 0, Started 0, PR Review 0, Fixing 0, and Done 38, with Issue #80 visible in Done at that checkpoint.
- [x] Issue #80 is currently **open** because promotion, exact-main verification, and PDF gates are not finished.
- [x] Native GitHub Development links were manually verified for Issue #80 and release PRs #90, #91, #92, #93, #94, and the currently open promotion PR #95.
- [x] While promotion PR #95 is open for review, Project item #80 is currently in **PR Review** rather than Done.

## Verification state

Fresh hosted verification on exact staging merge `65770a0` after approved PR #94:

- [x] Server build passed.
- [x] Server tests: 69 files / 407 tests.
- [x] Client production build passed.
- [x] Client tests: 37 files / 178 tests.
- [x] Lab 4 harness: 9 Node checks + 3 server safety tests.
- [x] Lab 3 trace: 50 Test IDs / 32 ACs.
- [x] Lab 4 planning trace: 24 FRs / 54 BRs / 28 ACs / 57 Test IDs.
- [x] Chromium E2E: 70/70.
- [x] Responsive: 28/28.
- [x] Root/server/client dependency audits/install checks report 0 vulnerabilities.
- [x] Post-merge staging CI `37124131599` succeeded on exact SHA `65770a03190ead324066461192abd0cfbd8e2988`.
- [x] PR #95 exact-head CI `37124638527` also succeeded on that opening promotion candidate.
- [ ] Release trace passes on exact final `main` with every Test ID recorded as executed Pass evidence.

## Release workflow

- [x] Feature work #71-#79 reached `lab4-staging` through reviewed PRs #81-#89.
- [x] Release-readiness docs/evidence PR #90 reviewed and merged.
- [x] Review-evidence reconciliation PR #91 reviewed and merged.
- [x] Dependency/toolchain hardening PR #92 reviewed and merged.
- [x] Issue #80 reopened after premature closure because its release gates were still incomplete.
- [x] Final-reconciliation PR #93 received Changes Requested, the workflow-state mismatch was corrected, the same exact head was then approved by `@L0u1sss`, and PR #93 merged into `lab4-staging` as `cb205a6`.
- [x] PR #94 received real human approval from `@L0u1sss`, merged into `lab4-staging` as `65770a0`, and post-merge staging CI `37124131599` succeeded.
- [x] Separate `lab4-staging -> main` promotion PR #95 opened and is natively Development-linked to Issue #80; Project item #80 is in **PR Review** while it is active.
- [x] PR #95 exact-head CI `37124638527` succeeded on opening candidate `65770a0`.
- [x] PR #95 received a real human **Changes Requested** review from `@L0u1sss` at 2026-10-03T13:11:15Z because four release-evidence documents were stale relative to the live promotion state.
- [ ] Promotion PR receives real human approval after this reconciliation reaches `lab4-staging` and PR #95 is re-reviewed on its new exact head.
- [ ] Promotion PR merged after approval; then move Project item #80 back to **Done**.
- [ ] Resulting exact `main` SHA re-read from remote.
- [ ] Full exact-main verification passes on that SHA.
- [ ] Exact-main hosted CI/evidence is preserved and linked.

## Submission PDF

The handout requires exactly one concise PDF with these headings in order:

1. Answer Part 1
2. Answer Part 2
3. Answer Part 3
4. Answer Part 4
5. Answer Part 5
6. Answer Part 6
7. Answer Part 7
8. Answer Part 8
9. Answer Part 9

Release requirements:

- [ ] `submission-outline.md` reconciled to the exact final-main SHA and actual final Project state.
- [x] Student-confirmed reflection included in the working submission source.
- [ ] Required screenshots/links/metrics/review evidence are readable and source-accurate.
- [ ] Final PDF rendered and every page visually inspected for clipping, overlap, broken glyphs, blank pages and unreadable screenshots.
- [ ] Working links checked.
- [ ] Exactly one final PDF delivered for submission.
- [ ] Issue #80 closed only after every applicable gate above is complete.

## Project evidence note

The local GitHub CLI still lacks `read:project`, so automated Project API verification is unavailable. The student-provided screenshot is retained as a historical checkpoint showing Done 38 with all non-Done columns at 0. PR #94 has since been approved and merged. The separate promotion PR #95 is now open, Issue #80 remains open, its native Development panel includes #95, and its Project item is in **PR Review** while promotion review is active. The item returns to **Done** only after the approved promotion merge; the GitHub Issue itself remains open until exact-main verification and the deferred final PDF are complete. This records real workflow transitions instead of treating one screenshot as a permanently current board state.
