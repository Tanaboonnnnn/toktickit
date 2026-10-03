# Lab 4 Repository Release Checklist

This checklist covers the GitHub repository release only. The submission PDF is prepared separately and is not a repository-release gate.

## Repository and documentation

- [x] The six required Lab 4 documents exist: `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, and `ai-use.md`.
- [x] README setup, migration, seed, verification, E2E/responsive commands and Node prerequisite are current.
- [x] `.gitignore` excludes transient test output while grader-facing screenshots remain trackable.
- [x] `reviewer.md` records real human reviews received and Lab 4 reviews given to peers.
- [x] `ai-use.md` contains the required assistant attribution, ten representative prompts, and the student-confirmed reflection without extra AI-authored ownership commentary.
- [x] No frozen Lab 1–3 evidence history was rewritten.

## Review and branch workflow

- [x] Feature work for Issues #71–#79 merged through reviewed PRs #81–#89 into `lab4-staging`.
- [x] Issue #80 release/reconciliation work used reviewed PRs #90–#96.
- [x] Native Development links were checked during the release workflow.
- [x] Project/Kanban evidence was human-verified; the release item moved through PR Review while PRs were active and returned to Done after the final promotion.
- [x] PR #96 was approved and merged into `lab4-staging` as `7a4c8f8fd3a26ede6bb25445822faa71c5888f00`.
- [x] PR #95 was re-reviewed on exact head `7a4c8f8fd3a26ede6bb25445822faa71c5888f00` and approved by `@L0u1sss`.
- [x] PR #95 merged `lab4-staging -> main` as `39a7afbcd44da82990b5b79ecf0060830a7b960a`.

## Exact-main verification

Push-triggered Lab 4 CI run `37129118888` succeeded on exact main SHA `39a7afbcd44da82990b5b79ecf0060830a7b960a`.

- [x] Server: 69 test files / 407 tests.
- [x] Client: 37 test files / 178 tests.
- [x] Lab 4 harness: 9 Node checks + 3 server safety tests.
- [x] Lab 3 trace: 50 Test IDs / 32 ACs.
- [x] Lab 4 trace: 24 FR / 54 BR / 28 AC / 57 Test IDs.
- [x] Chromium E2E: 70/70.
- [x] Responsive: 28/28.
- [x] Dependency installation/audit evidence reported 0 vulnerabilities.
- [x] `REL-01` review/process evidence is Pass.
- [x] `REL-02` exact-main verification evidence is Pass.

## External submission note

The handout still requires one concise PDF with Answer Part 1–9, but that file is produced and submitted separately from GitHub. `PDF-01` remains an external/manual submission item and does not keep the repository release open.
