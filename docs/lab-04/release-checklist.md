# Lab 4 Release Checklist

This checklist is the current Issue #80 release gate. It records only events that actually happened; unchecked items are not implied complete.

## Current reviewed staging candidate

- Integration branch: `lab4-staging`
- Current reviewed staging SHA after approved PR #93: `cb205a6b768a085dac217de646a4a27873fb0e07`
- PR #93 exact reviewed head: `5c1de21a244354c0060a631c1d789c228e0ca7c4`
- PR #93 exact-head CI: run `37115432452` - success
- PR #93 post-merge staging CI: run `37118280869` - success on `cb205a6`
- Remote `main` at this checkpoint: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116` (Lab 3)

## Documentation and repository state

- [x] Six required Lab 4 documents exist: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`.
- [x] Contract/API/UI status banners match the implemented staging state rather than the original Issue #71 pre-implementation state.
- [x] Test DD has 57 unique Test IDs covering AC-01 through AC-28.
- [x] `SPEC-01` is reconciled with the final staging contract.
- [x] README setup, migration, seed, verification, E2E/responsive commands and Node prerequisite are current.
- [x] `.gitignore` keeps transient Lab 4 test output ignored while grader-facing screenshots remain trackable.
- [x] `regression-map.md` records the final staging regression checkpoint.
- [x] Human review records through PR #93 are preserved separately from AI review and CI.
- [x] Student confirmed the first-person `My Reflection` text in `ai-use.md` after a final wording pass.
- [x] Student provided a current GitHub Project/Kanban screenshot showing Backlog 0, Specified 0, Started 0, PR Review 0, Fixing 0, and Done 38, with Issue #80 visible in Done. This is human-verified Project evidence; the local CLI still lacks Project API read scope.

## Verification state

Fresh hosted verification on exact staging merge `cb205a6` after PR #93:

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
- [x] Post-merge staging CI `37118280869` succeeded on exact SHA `cb205a6`.
- [ ] Release trace passes on exact final `main` with every Test ID recorded as executed Pass evidence.

## Release workflow

- [x] Feature work #71-#79 reached `lab4-staging` through reviewed PRs #81-#89.
- [x] Release-readiness docs/evidence PR #90 reviewed and merged.
- [x] Review-evidence reconciliation PR #91 reviewed and merged.
- [x] Dependency/toolchain hardening PR #92 reviewed and merged.
- [x] Issue #80 reopened after premature closure because its release gates were still incomplete.
- [x] Final-reconciliation PR #93 received Changes Requested, the workflow-state mismatch was corrected, the same exact head was then approved by `@L0u1sss`, and PR #93 merged into `lab4-staging` as `cb205a6`.
- [ ] Separate `lab4-staging -> main` promotion PR opened.
- [ ] Promotion PR receives real human approval.
- [ ] Promotion PR merged after approval.
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

The local GitHub CLI still lacks `read:project`, so automated Project API verification is unavailable. The student supplied a current Project board screenshot instead. It shows all workflow columns except Done at 0, Done at 38, and Issue #80 visible in Done. This resolves the Project-visibility gap for the release record without claiming API access that is not available.
