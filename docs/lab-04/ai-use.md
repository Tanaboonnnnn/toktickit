# Lab 4 AI Use and Reflection

## Assistant used

OpenAI ChatGPT (GPT-5.6 Sol, GPT-6 Astra Pro, GPT-6, and GPT-6 Luna). This attribution reflects the Lab 4 sessions recorded here.

## Selected key prompts

The table keeps ten representative prompts from actual Lab 4 work. Each prompt is a faithful summary, not a verbatim transcript.

| # | Prompt name | Actual prompt text or faithful concise copy | Purpose / result | Short reflection |
|---:|---|---|---|---|
| 1 | Lab 4 exploration and execution planning | Inspect the handout, live GitHub state, local repository and preserved worktrees; plan Lab 4 as no more than ten Issues without changing product code. | Reconciled the shipped Lab 3 baseline and remote state, identified migration, authorization, workflow and concurrency risks, and created Issues #71–#80. | Comparing remote and local state first exposed stale refs and kept the dirty Lab 3 root out of the new work. |
| 2 | Start Issue #71 from current remote | Start Issue #71, follow Lab 3 branch naming, verify the remote, read AGENTS.md, and use the earlier AI-use/reviewer document format. | Created the reviewed Sprint 4 contract and the initial Lab 4 evidence documents from a fresh integration baseline. | Agreeing on actor roles, resolution, dashboards and history before implementation kept later layers on one contract. |
| 3 | Address PR #81 review rounds | Check the PR #81 review against the handout and Issue #71, fix only valid findings, then address the follow-up review. | Separated recorder, assignee and performer; documented the nine source decisions; mapped all acceptance criteria to tests and Answer Parts. PR #81 was later approved and merged. | Verifying each comment against the source caught real gaps without changing requirements the handout did not make. |
| 4 | Implement Issue #72 verification harness | Start Issue #72 from current staging and add Lab 4 traceability, isolated evidence routing, browser-suite guards and CI. | Added the verification harness and Lab 4 CI while preserving the retained Lab 2/3 regression paths. PR #82 was reviewed, approved and merged. | A browser command that rejects an empty suite prevents a false green result. |
| 5 | Implement Issue #73 data foundation | Read the Issue #73 handoff and handout, verify staging, then implement the additive migration and repeat-safe seed. | Added Actions and workflow data without rewriting earlier migrations; added isolated migration/recovery coverage and Lab 4 fixtures. PR #83 was approved and merged. | The migration tests checked the existing-data upgrade path instead of a convenient empty database only. |
| 6 | Resolve PR #83 seed-safety review | Reproduce the PR #83 seed finding before changing code and fix only the invalid-assignee path. | Added a focused regression for a missing Action whose assignee had become inactive or a Requester; seed now checks current role and activation before recreating it. PR #83 was approved and merged. | Reproducing the exact state showed why a cached user ID was not enough to authorize a new fixture. |
| 7 | Implement Issue #74 Actions API | Implement the authorized Actions endpoints test-first, including replay, assignment, actor attribution and concurrency. | Delivered read/create/edit/status/revision APIs with backend authorization, replay protection, locking and rollback coverage. PR #84 was approved and merged. | The concurrency tests checked database invariants, not just response codes. |
| 8 | Implement Issue #77 Dashboard API | Implement authoritative Requester and Staff dashboard metrics and matching drill-down queries from the reviewed contract. | Added role-scoped metrics, current-user Actions, strict filters and database-to-list consistency checks. PR #87 was approved and merged. | A dashboard count is only useful when its drill-down returns the same set of records. |
| 9 | Implement Issue #78 Dashboard UI | Build the role dashboards and preserve their filters through drill-down, browser history and Action deep links. | Added Requester/Staff/Admin dashboard navigation and round-trip context, with responsive and browser coverage. PR #88 was approved and merged. | Testing back/forward and reload caught navigation gaps that a static screenshot could not show. |
| 10 | Complete Issue #80 release readiness | Continue Issue #80 from the current remote state, preserve existing worktrees, reconcile every Lab 4 release document, verify the candidate, address peer-review findings, harden dependencies without weakening tests, and prepare the reviewed staging-to-main release. | PR #90 reconciled release evidence and was approved/merged; PR #91 corrected the review ledger and was approved/merged; PR #92 cleared dependency advisories, corrected the Node prerequisite after review, passed exact-head CI `37109923169`, and merged to `lab4-staging` as `88a8dce` with successful post-merge CI `37112630882`. Final-main, Project/Kanban, and PDF gates remain separate until they actually occur. | Separating candidate, PR-head, staging, and final-main evidence prevents a green pre-release run from being mislabeled as final submission evidence. |

## My Reflection

At first, I mainly used AI to help turn the Lab 4 handout into clear rules and tests before I started coding. That made the implementation easier to follow, especially for details I might have overlooked, like who actually performed an Action, stale updates, concurrent changes, migration safety, and checking that dashboard counts matched the records behind them. I still had to verify the suggestions myself. I checked review comments against the handout, reran the tests and CI, and looked at the repository state instead of assuming the generated answer was right. After working through the lab this way, I understand much better how the specification, tests, code review, and release evidence need to stay consistent with each other.

## Human ownership and decisions

- The student authorized the final Issue #80 reconciliation after PR #92 merged, while preserving the dirty Lab 3 root/worktrees and keeping real peer approval, exact-final-main verification, Project/Kanban truth, student-owned reflection, and final PDF generation as explicit release gates.
- The reviewed contract keeps the Action recorder, assignee, performer, Ticket owner and later mutation actor distinct.
- Ticket resolution requires qualifying current-cycle work; reopening starts a new cycle, and historical transitions remain append-only.
- Dashboard authorization and metrics come from the server; requester problem feedback remains advisory.
- The project extends the existing Express, Prisma, PostgreSQL, React and Zen Green application rather than replacing it.
- Test IDs are marked Pass only after their required checks actually run.
