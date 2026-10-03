# Lab 4 AI Use and Reflection

## Assistant used

OpenAI ChatGPT (GPT-5.6 Sol, GPT-6 Astra Pro, GPT-6, and GPT-6 Luna). This attribution reflects the Lab 4 sessions recorded here.

## Selected key prompts

The table keeps ten representative prompts from actual Lab 4 work. Each prompt is a faithful summary, not a verbatim transcript.

| # | Prompt name | Actual prompt text or faithful concise copy | Purpose / result |
|---:|---|---|---|
| 1 | Lab 4 exploration and execution planning | Inspect the handout, live GitHub state, local repository and preserved worktrees; plan Lab 4 as no more than ten Issues without changing product code. | Reconciled the shipped Lab 3 baseline and remote state, identified migration, authorization, workflow and concurrency risks, and created Issues #71–#80. |
| 2 | Start Issue #71 from current remote | Start Issue #71, follow Lab 3 branch naming, verify the remote, read repository instructions, and use the earlier AI-use/reviewer document format. | Created the reviewed Sprint 4 contract and the initial Lab 4 evidence documents from a fresh integration baseline. |
| 3 | Address PR #81 review rounds | Check the PR #81 review against the handout and Issue #71, fix only valid findings, then address the follow-up review. | Separated recorder, assignee and performer; documented the source decisions; mapped acceptance criteria to tests and Answer Parts. PR #81 was later approved and merged. |
| 4 | Implement Issue #72 verification harness | Start Issue #72 from current staging and add Lab 4 traceability, isolated evidence routing, browser-suite guards and CI. | Added the verification harness and Lab 4 CI while preserving retained Lab 2/3 regression paths. PR #82 was reviewed, approved and merged. |
| 5 | Implement Issue #73 data foundation | Read the Issue #73 handoff and handout, verify staging, then implement the additive migration and repeat-safe seed. | Added Actions and workflow data without rewriting earlier migrations; added isolated migration/recovery coverage and Lab 4 fixtures. PR #83 was approved and merged. |
| 6 | Resolve PR #83 seed-safety review | Reproduce the PR #83 seed finding before changing code and fix only the invalid-assignee path. | Added a focused regression for a missing Action whose assignee had become inactive or a Requester; seed now checks current role and activation before recreating it. PR #83 was approved and merged. |
| 7 | Implement Issue #74 Actions API | Implement the authorized Actions endpoints test-first, including replay, assignment, actor attribution and concurrency. | Delivered read/create/edit/status/revision APIs with backend authorization, replay protection, locking and rollback coverage. PR #84 was approved and merged. |
| 8 | Implement Issue #77 Dashboard API | Implement authoritative Requester and Staff dashboard metrics and matching drill-down queries from the reviewed contract. | Added role-scoped metrics, current-user Actions, strict filters and database-to-list consistency checks. PR #87 was approved and merged. |
| 9 | Implement Issue #78 Dashboard UI | Build the role dashboards and preserve their filters through drill-down, browser history and Action deep links. | Added Requester/Staff/Admin dashboard navigation and round-trip context, with responsive and browser coverage. PR #88 was approved and merged. |
| 10 | Complete Issue #80 release readiness | Reconcile release documents, address peer-review findings, verify the release candidate, and complete the reviewed staging-to-main promotion. | PRs #90–#96 completed the release-document/review sequence. PR #95 was approved on exact head `7a4c8f8fd3a26ede6bb25445822faa71c5888f00` and merged to `main` as `39a7afbcd44da82990b5b79ecf0060830a7b960a`; exact-main Lab 4 CI run `37129118888` succeeded. |

## My Reflection

At first, I mainly used AI to help turn the Lab 4 handout into clear rules and tests before I started coding. That made the implementation easier to follow, especially for details I might have overlooked, like who actually performed an Action, stale updates, concurrent changes, migration safety, and checking that dashboard counts matched the records behind them. I still had to verify the suggestions myself. I checked review comments against the handout, reran the tests and CI, and looked at the repository state instead of assuming the generated answer was right. After working through the lab this way, I understand much better how the specification, tests, code review, and release evidence need to stay consistent with each other.
