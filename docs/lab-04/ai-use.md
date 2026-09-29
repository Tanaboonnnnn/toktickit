# Lab 4 AI Use and Reflection

## Assistant used

OpenAI ChatGPT (GPT-5.6 Sol,GPT-6 Astra Pro).

This file follows the Lab 2 `ai-use.md` structure, but the assistant attribution is kept truthful to the actual Lab 4 session rather than copying a historical model name that was used in a different lab.

## Selected key prompts

The course record ultimately calls for 6-10 selected prompts. Only prompts that actually occurred during Lab 4 work are recorded here. This early Issue #71 contract currently has **4** selected Lab 4 prompts; later entries must be appended from real implementation/review/release work rather than invented in advance. The entries are faithful concise records, not claimed verbatim transcripts.

| # | Prompt name | Actual prompt text or faithful concise copy | Purpose / result | Short reflection |
|---:|---|---|---|---|
| 1 | Lab 4 exploration and execution planning | “Read the Lab 4 handoff/material, inspect the real local repository and live GitHub state first, preserve existing Lab 3 work, then create a complete Lab 4 plan with no more than ten Issues and a handoff that another agent can execute. Do not change product code during planning.” | Inspected the handout, shipped Lab 3 baseline, local worktrees and live GitHub; identified architectural/race/migration risks; created Issues #71-#80 and the execution handoff without product implementation. | The remote/local comparison mattered because the local refs were stale and the root worktree contained preserved Lab 3 work; planning from that root would have used the wrong baseline. |
| 2 | Start Issue #71 from current remote | “Start Lab 4 Issue #71. Keep branch naming consistent with Lab 3, verify the remote because local is not current, use codebase-design, and use the Lab 2 `ai-use.md` / `reviewer.md` document template.” | Fetched the exact remote `main`, created `lab4-staging` and isolated `feature/71-lab4-contract`, established a fresh retained baseline, and authored the Sprint 4 engineering contract documents only. | Contract-first work kept the unresolved Action actor/assignment, resolution-gate, dashboard, history, and concurrency decisions explicit before schema/API/UI implementation could multiply their cost. |
| 3 | Validate and address PR #81 review | “Check the comments on PR #81, verify whether the reviewer’s points are actually true, and fix the valid ones.” | Compared the human review against Issue #71, the Lab 4 handout, and the current contract; accepted three real gaps, corrected recorder/performer semantics, added the nine-item source reconciliation, and aligned Issue #71 with local-only helper-note handling. | Treating review comments as claims to verify rather than instructions to copy prevented an unnecessary handout change while still correcting real contract and process inconsistencies. |
| 4 | Address second PR #81 review | “The friend reviewed PR #81 again; fix it thoroughly.” | Inspected the new Changes Requested event, checked it against Issue #71 and the handout's Answer Part 1-9 evidence requirements, then added an explicit AC -> planned Test ID -> Rubric/Answer Part evidence crosswalk and updated real review evidence. | Traceability is only auditable when both verification and grader-facing evidence destinations are explicit; a test path alone does not show where an acceptance criterion will be demonstrated in the final submission. |

## Current reflection

Issue #71 is still the specification-agent phase, so this section records engineering observations only and is **not** the final student `My Reflection` required by the Lab 4 submission. The final first-person reflection must be written or explicitly confirmed by the student after enough specification-agent and coding-agent work has actually occurred.

The main early lesson from this phase is evidence discipline: the delivered `main` branch had to be verified against the remote before any new branch was created, while the dirty Lab 3 root and preserved worktrees had to remain untouched. The contract also benefited from treating workflow/query behavior as deep modules: route/UI adapters should learn a small interface while transaction ordering, authorization, exact dashboard predicates, stale-version checks, and audit behavior remain localized behind that seam.

No Lab 4 implementation, migration, browser evidence, peer approval, or final-main result is claimed by this Issue #71 record.

## Human ownership and decisions

The reviewed `docs/lab-04` contract is intended to become the Sprint 4 source of truth after real peer review. Human-owned project decisions currently documented for review include:

- Actions use `PENDING`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` with no terminal status reversal.
- Original recorder, Action assignee, actual completing performer, Ticket Owner, and later mutation actor are separate concepts.
- Action Date/Time is server creation time; normal backdating is not included.
- Resolution requires qualifying current-cycle completed work, no outstanding current-cycle work, and no unresolved current-cycle follow-up, in addition to retained Ticket requirements.
- Reopen starts a new workflow cycle; legacy terminal zero-Action Tickets remain valid.
- Editable Actions retain append-only evidence through immutable Action revisions; Ticket transitions gain forward-only Lab 4 workflow events.
- Dashboard metrics are backend-authoritative with a fixed active-status set and a rolling 168-hour resolved window returned to the client for exact drill-down.
- Existing Express/Prisma/PostgreSQL, React/hash routing, Zen Green, authentication, and test stack are extended rather than replaced.
- Only evidence that actually exists and executes may be promoted from Planned / Not run to Pass.

AI assistance does not transfer responsibility for these engineering decisions. The student remains responsible for reviewing the handout, approving/amending the contract, inspecting generated changes, understanding tests, and owning the final submission/reflection.
