# Lab 4 Release Checklist

This checklist is the current Issue #80 release gate. It records only events that actually happened; unchecked items are not implied complete.

## Current reviewed staging candidate

- Integration branch: `lab4-staging`
- Staging SHA after approved PR #92: `88a8dcebe0bbcb9960bac62aae1a3fdc9253270d`
- PR #92 exact reviewed head: `002ad78112831a90741f967d4ebe96059e5c4413`
- PR #92 exact-head CI: run `37109923169` - success
- PR #92 post-merge staging CI: run `37112630882` - success on `88a8dce`
- Remote `main` at this checkpoint: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116` (Lab 3)

## Documentation and repository state

- [x] Six required Lab 4 documents exist: `specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`.
- [x] Contract/API/UI status banners match the implemented staging state rather than the original Issue #71 pre-implementation state.
- [x] Test DD has 57 unique Test IDs covering AC-01 through AC-28.
- [x] `SPEC-01` is reconciled with the final staging contract.
- [x] README setup, migration, seed, verification, E2E/responsive commands and Node prerequisite are current.
- [x] `.gitignore` keeps transient Lab 4 test output ignored while grader-facing screenshots remain trackable.
- [x] `regression-map.md` records the final staging regression checkpoint.
- [x] Human review records through PR #92 are preserved separately from AI review and CI.
- [x] Student confirmed the first-person `My Reflection` text in `ai-use.md` after a final wording pass.
- [ ] Actual GitHub Project/Kanban state has been verified with Project read access.

## Verification state

Fresh clean-worktree verification on staging merge `88a8dce`:

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
- [x] Post-merge staging CI `37112630882` succeeded on exact SHA `88a8dce`.
- [ ] Release trace passes on exact final `main` with every Test ID recorded as executed Pass evidence.

## Release workflow

- [x] Feature work #71-#79 reached `lab4-staging` through reviewed PRs #81-#89.
- [x] Release-readiness docs/evidence PR #90 reviewed and merged.
- [x] Review-evidence reconciliation PR #91 reviewed and merged.
- [x] Dependency/toolchain hardening PR #92 reviewed and merged.
- [x] Issue #80 reopened after premature closure because its release gates were still incomplete.
- [ ] Current final-reconciliation PR reviewed and merged into `lab4-staging`.
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

## Known external gate

The authenticated local GitHub CLI token currently has scopes `gist`, `read:org`, `repo`, and `workflow`, but not `read:project`. Therefore Project/Kanban completion is intentionally not claimed. This must be verified through an authorized Project view before `REL-01` can be marked Pass.
