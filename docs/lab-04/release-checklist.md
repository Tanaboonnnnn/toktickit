# Lab 4 Review and Release Checklist

Status: **Planning checklist. Unchecked items are future obligations, not failed or completed evidence.**

## 1. Issue #71 contract gate

- [x] Live remote `main` was rechecked before branch creation.
- [x] Local stale `origin/main` was fetched to `d41ab98d9d40266b355fe5fb3b3bcb193df8a116`.
- [x] `lab4-staging` was created from that exact `main` baseline without switching/resetting the dirty root.
- [x] Issue branch uses the Lab 3 convention: `feature/71-lab4-contract`.
- [x] Work happens in a separate ignored worktree; preserved Lab 3 root/worktrees/artifacts are untouched.
- [x] Issue #71 is documentation-only; no application/schema/migration/seed/test implementation is included.
- [x] The six required Lab 4 documents and two supporting current-sprint documents are defined.
- [ ] Cross-document consistency/traceability audit passes.
- [ ] Issue #71 docs-only PR targets `lab4-staging` and is Development-linked to Issue #71.
- [ ] A real human peer reviews the actual PR head.
- [ ] Review findings are verified, answered, and fixed/re-reviewed where required.
- [ ] Issue #71 is accepted before dependent product implementation begins.

## 2. Per-feature PR gate

For Issues #72-#79:

- [ ] Branch starts from the current reviewed `lab4-staging` integration point.
- [ ] Branch name follows `feature/<issue>-<short-name>`.
- [ ] PR base is `lab4-staging`, not `main`.
- [ ] PR is linked to the correct Issue using actual GitHub Development relationship where required.
- [ ] Relevant contract/Test IDs are identified before implementation.
- [ ] Meaningful focused RED is observed where TDD applies.
- [ ] Focused GREEN and affected regression run.
- [ ] `git diff --check` passes and unrelated/local-only files are absent.
- [ ] Real peer review occurs on the current PR head.
- [ ] Changes Requested are reproduced/assessed, not followed performatively.
- [ ] Approval and required checks exist before authorized merge to `lab4-staging`.

## 3. Database safety gate

- [ ] `TEST_DATABASE_URL` and `DATABASE_URL` are proven distinct by canonical identity.
- [ ] Test upload roots are isolated from development uploads.
- [ ] Historical migration SQL remains byte-for-byte unchanged.
- [ ] Clean install passes.
- [ ] Populated Lab 3 -> Lab 4 upgrade preserves required rows/IDs/FKs/timestamps and Attachment bytes.
- [ ] Legacy terminal zero-Action Ticket behavior is verified.
- [ ] Repeat deploy/migration status/drift is verified.
- [ ] Late migration failure + recovery is rehearsed in a disposable target.
- [ ] Seed is repeat-safe before and after deliberate fixture edits.
- [ ] Real development-data migration, if ever performed, has explicit authorization and a private tested recovery/backup path.

## 4. Integrated release-candidate gate

- [ ] All ten planned Lab 4 Issues are reconciled against actual state; no duplicate/abandoned work is presented as Done.
- [ ] Six required docs are current and internally consistent.
- [ ] Every AC maps to actual executable evidence and final status.
- [ ] Full server build/tests pass.
- [ ] Full client build/tests pass.
- [ ] Prisma schema/generation/migration checks pass.
- [ ] Lab 4 traceability/discovery checks pass.
- [ ] Full required browser/E2E suite passes.
- [ ] Responsive Desktop/Tablet/Mobile checks pass.
- [ ] Migration/recovery/seed tests pass.
- [ ] Concurrency/race and duplicate-retry tests pass.
- [ ] Dashboard metric-to-independent-SQL comparisons pass.
- [ ] Performance smoke runs with documented fixture/machine/budget.
- [ ] Security/auth/ownership/privacy regression passes.
- [ ] Required screenshots are captured under `artifacts/lab-04/` from the recorded candidate SHA.
- [ ] Every major screenshot/state is visually inspected; existence alone is not accepted as UI proof.
- [ ] No historical Lab 3 artifact/document was rewritten by verification.
- [ ] No secrets, `.env`, runtime uploads, private backups, or unrelated generated reports are tracked.

## 5. GitHub workflow gate

- [ ] Actual Project/Kanban board is inspected with authorized access or verified human evidence.
- [ ] Existing status automation is understood before moving cards.
- [ ] Issue states match real engineering progress rather than cosmetic submission needs.
- [ ] Every completed feature has real PR/review/merge evidence.
- [ ] `reviewer.md` names only reviews that actually occurred.
- [ ] `ai-use.md` contains 6-10 real selected Lab 4 prompts by final submission and a student-confirmed reflection.
- [ ] No peer identity, comment, approval, CI run, or Project status is inferred/fabricated.

## 6. Staging -> main release gate

- [ ] `lab4-staging` integrated candidate is freshly verified.
- [ ] Separate release PR targets `main` from `lab4-staging`.
- [ ] Real peer review/approval occurs on the release PR.
- [ ] User explicitly authorizes merge to `main`.
- [ ] Resulting exact `main` SHA is re-read from GitHub after merge.
- [ ] Full required final verification runs on that exact `main` SHA.
- [ ] Final-main hosted/local evidence is labeled with the exact SHA and is not substituted by older candidate results.

## 7. Final PDF gate

- [ ] Exactly one concise PDF is produced.
- [ ] Headings appear exactly `Answer Part 1` through `Answer Part 9` in order.
- [ ] Part 1 proves Git/branch/staging/main/Kanban/review/README/.gitignore/tree evidence.
- [ ] Part 2 renders/links `specification.md` with FR/BR/AC/workflow/dashboard/migration/DoD evidence.
- [ ] Part 3 renders/links `tests.md` with actual final test paths/status/output from main.
- [ ] Part 4 renders `ai-use.md` with actual LLM use, 6-10 selected prompts, and student-confirmed `My Reflection`.
- [ ] Part 5 demonstrates Staff Dashboard including current-user Actions and DB metric checks.
- [ ] Part 6 demonstrates multiple Actions, create/assign/edit/status/complete/cancel/inactive-assignee/safe failures/responsive behavior.
- [ ] Part 7 demonstrates Ticket transitions, stable ordering, append-only behavior, and role visibility.
- [ ] Part 8 demonstrates Requester Dashboard ownership/drill-down plus representative full regression.
- [ ] Part 9 renders `ui-spec.md` plus desktop/tablet/mobile visual/accessibility evidence.
- [ ] All links work for the grader.
- [ ] Every page is rendered and inspected for clipping/overlap/blank pages/unreadable screenshots/broken glyphs.
- [ ] Student approves/owns the final personal reflection and submission.

## 8. Stop conditions

Stop rather than silently proceeding when:

- a required design decision conflicts across handout/reviewed contract;
- remote baseline unexpectedly changed and the delta is unevaluated;
- intended path/ref/worktree contains unexplained user work;
- DB/upload isolation is not proven;
- a required test is missing/failing/skipped;
- a command would overwrite frozen historical evidence;
- real peer review/Project access/merge/submission authorization is required but absent;
- completion would require inventing evidence.
