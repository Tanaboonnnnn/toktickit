# TokTickIT Lab 4 Submission Outline

This file is the working source for the single final Lab 4 PDF. It deliberately does not claim final-main, Project/Kanban, student-reflection, or PDF completion before those events happen.

Current reviewed staging SHA: `88a8dcebe0bbcb9960bac62aae1a3fdc9253270d`  
Current remote `main`: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116`  
Issue #80: open until the release/submission gates are actually complete.

# Answer Part 1

## Git Use with Engineering Workflow

Evidence to render/link in the final PDF:

- Feature flow: Issues #71-#79 -> PRs #81-#89 -> `lab4-staging`.
- Release-readiness flow: PR #90 -> PR #91 -> PR #92 -> current final-reconciliation PR -> `lab4-staging`.
- Separate reviewed `lab4-staging -> main` promotion PR and resulting exact final-main SHA.
- `docs/lab-04/reviewer.md` with real reviewer usernames, review findings, responses, approvals, exact heads, merge SHAs and CI provenance.
- README setup/verification excerpt.
- `.gitignore` evidence showing transient Lab 4 outputs ignored while grader-facing screenshots remain trackable.
- Repository tree showing the six required Lab 4 documents and required server/client/E2E test structure.
- Actual final GitHub Project/Kanban with all truly completed Issues in the real Done state.

Current state: feature and release-readiness review history is recorded through approved/merged PR #92. Project/Kanban and final `main` promotion remain pending.

# Answer Part 2

## Spec DD

Render/link `docs/lab-04/specification.md`.

Show:

- FR-01 through FR-24.
- BR-01 through BR-54.
- AC-01 through AC-28.
- Action lifecycle and assignment/actor semantics.
- Ticket eight-status transition matrix and backend resolution gate.
- workflow-cycle/reopen behavior and append-only history.
- Requester/Staff Dashboard calculations and drill-down predicates.
- migration preservation/recovery and repeat-safe seed decisions.
- Product Definition of Done.
- Evidence that the reviewed specification preceded implementation PRs.

Current state: contract is reviewed, implemented on staging, and `SPEC-01` is reconciled in the final staging document pass.

# Answer Part 3

## Test DD and Traceability

Render/link `docs/lab-04/tests.md`.

Show:

- 57 unique Test IDs mapped across AC-01 through AC-28 and Answer Parts 1-9.
- unit, API/integration, authorization, concurrency, workflow, migration/recovery, seed, UI, style, accessibility, performance-smoke, E2E and retained Labs 1-3 regression.
- exact final-main complete verification output after promotion.
- distinction between 57 planned Test IDs and runner assertion/test-case counts.

Current staging verification at `88a8dce`:

- server: 69 files / 407 tests
- client: 37 files / 178 tests
- Lab 4 harness: 9 Node + 3 server safety tests
- Lab 3 trace: 50 Test IDs / 32 ACs
- Lab 4 planning trace: 24 FR / 54 BR / 28 AC / 57 Test IDs
- Chromium E2E: 70/70
- responsive: 28/28
- Requester performance smoke: 9 business queries, 4,510 bytes, p95 44.71 ms
- Staff performance smoke: 11 business queries, 7,573 bytes, p95 44.07 ms

Final PDF must replace staging-only provenance with the resulting exact-main verification where the rubric requires main evidence.

# Answer Part 4

## AI Use with Reflection

Render/link `docs/lab-04/ai-use.md`.

Include:

- actual OpenAI assistants used;
- ten representative Lab 4 prompts;
- prompt purpose/result and short technical reflection;
- a brief first-person **My Reflection** confirmed by the student.

Current state: AI-use disclosure and ten prompt rows are complete. The first-person student reflection is intentionally not fabricated and still requires student confirmation.

# Answer Part 5

## Working IT Staff Dashboard UI

Use actual product screenshots/evidence for:

- IT Staff/Administrator operational Dashboard;
- approved metrics with exact backend values;
- current-user Actions Taken with recorder/assignee/performer attribution;
- recent/urgent Ticket preview;
- metric drill-down into the correct queue/filter;
- loading, empty, forbidden and safe-failure states;
- responsive desktop/tablet/mobile behavior;
- independent database-query evidence matching selected dashboard metrics.

Primary source evidence: `artifacts/lab-04/screenshots/`, `tests.md`, dashboard API tests, and the fixed-fixture performance/metric checks.

# Answer Part 6

## Working Actions Taken UI

Demonstrate actual Actions on one Ticket:

- list and stable pagination/order;
- create;
- assign/reassign;
- edit;
- start/status transition;
- complete with authentic performer;
- cancel;
- conditional follow-up validation;
- inactive/wrong-role assignee rejection;
- Requester read-only visibility;
- safe failure/conflict/retry;
- responsive desktop/tablet/mobile behavior.

Use real product screenshots and E2E/component/API evidence only; do not substitute generated mockups.

# Answer Part 7

## Working Ticket Workflow

Demonstrate:

- permitted Ticket transitions across the eight-state matrix;
- backend resolution gate and blocker feedback;
- Requester `Problem Appears Resolved` remaining advisory;
- current-cycle Action requirements;
- reopen creating a new work cycle;
- cancellation behavior;
- stable ordering and append-only Ticket workflow history;
- role-appropriate visibility;
- race/stale-update safety.

# Answer Part 8

## Working Requester Dashboard and Final Regression UI

Demonstrate:

- Requester-owned Dashboard metrics only;
- active, attention-required and recently resolved Ticket behavior;
- drill-down with the exact backend-provided window/filter;
- ownership denial/non-disclosure;
- representative final regression for Login/change password, My Tickets, Ticket Detail, Attachments, Public Comments, Staff functions, Internal Notes privacy and Administrator User Management.

Use final-main evidence for the final PDF.

# Answer Part 9

## Zen Green UI, Responsive, Accessibility, and Final Polish

Render/link `docs/lab-04/ui-spec.md` and show actual desktop/tablet/mobile screenshots for major Lab 4 screens.

Checklist evidence:

- Zen Green design consistency;
- readable status/priority/private/shared cues that do not rely on color alone;
- editable versus read-only distinction;
- validation placement and first-invalid-field focus;
- keyboard operation and visible focus;
- loading/empty/forbidden/failure states;
- no clipped content;
- no overlapping controls;
- no page-level horizontal overflow;
- readable tablet/mobile labels;
- coherent retained Lab 1-3 screens.

Final assembly gate: the single PDF must be rendered page-by-page, inspected visually, checked for working links, and tied to the exact final-main SHA and actual verified Project state before `PDF-01` is marked Pass.
