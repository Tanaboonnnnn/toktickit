# TokTickIT Lab 4 Submission Outline

This file is the working source for the single final Lab 4 PDF. The student-confirmed reflection is complete. Project/Kanban workflow is being tracked as live evidence: the supplied screenshot records an earlier Done checkpoint, while Issue #80 is currently open and in `PR Review` because the separate promotion PR #95 is active. Final-main and PDF completion are not claimed before those events happen.

- PR #94 was approved and merged into `lab4-staging` as `65770a03190ead324066461192abd0cfbd8e2988`.
- Promotion PR #95 opened from `lab4-staging` to `main` using that exact staging SHA; exact-head CI `37124638527` passed on the opening candidate.
- PR #95 then received a real human **Changes Requested** review because repository release evidence still described PR #94 as the active gate. This reconciliation updates that stale provenance without claiming a future docs-merge SHA.
- Current remote `main`: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116`.
- Issue #80: open until promotion approval/merge, exact-main verification, and final PDF gates are actually complete.

# Answer Part 1

## Git Use with Engineering Workflow

Evidence to render/link in the final PDF:

- Feature flow: Issues #71-#79 -> PRs #81-#89 -> `lab4-staging`.
- Release-readiness flow: PR #90 -> PR #91 -> PR #92 -> PR #93 -> PR #94 -> `lab4-staging`.
- Promotion flow: PR #95 is the separate `lab4-staging -> main` PR; its approval/merge and resulting exact final-main SHA remain pending.
- `docs/lab-04/reviewer.md` with real reviewer usernames, review findings, responses, approvals, exact heads, merge SHAs and CI provenance.
- README setup/verification excerpt.
- `.gitignore` evidence showing transient Lab 4 outputs ignored while grader-facing screenshots remain trackable.
- Repository tree showing the six required Lab 4 documents and required server/client/E2E test structure.
- Actual final GitHub Project/Kanban with all truly completed Issues in the real Done state; intermediate release PRs should show Issue #80 in `PR Review` while review is active and return it to `Done` after merge.

Current state: feature and release-readiness review history is recorded through approved/merged PR #94. PR #95 is now the active `lab4-staging -> main` promotion. The student-supplied screenshot records a historical checkpoint where all non-Done workflow columns were 0 and Done was 38, with Issue #80 visible in Done. Issue #80 is currently open, its native Development panel is verified to include PRs #90–#95, and its Project status is `PR Review` while #95 is active. PR #95 has passing exact-head CI on opening candidate `65770a0` but currently has a human Changes Requested review for stale release documentation; it must be re-reviewed on the new exact head after this docs reconciliation reaches staging. Exact-main verification begins only after an approved promotion merge.

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

Current exact staging verification at promotion-opening candidate `65770a03190ead324066461192abd0cfbd8e2988` (post-PR #94 CI run `37124131599`; PR #95 exact-head CI run `37124638527` also passed on this SHA):

- server: 69 files / 407 tests
- client: 37 files / 178 tests
- Lab 4 harness: 9 Node + 3 server safety tests
- Lab 3 trace: 50 Test IDs / 32 ACs
- Lab 4 planning trace: 24 FR / 54 BR / 28 AC / 57 Test IDs
- Chromium E2E: 70/70
- responsive: 28/28
- The latest product performance smoke remains the reviewed pre-PR #93 product evidence because PR #93 was documentation-only; no new performance number is invented for the docs-only merge.

PR #95's opening candidate is staging evidence only. This docs reconciliation intentionally does not embed its own future merge SHA: after it reaches `lab4-staging`, PR #95's head changes and must receive fresh exact-head CI plus human re-review. Final PDF must replace staging-only provenance with the resulting exact-main verification where the rubric requires main evidence.

# Answer Part 4

## AI Use with Reflection

Render/link `docs/lab-04/ai-use.md`.

Include:

- actual OpenAI assistants used;
- ten representative Lab 4 prompts;
- prompt purpose/result and short technical reflection;
- a brief first-person **My Reflection** confirmed by the student.

Current state: AI-use disclosure, ten prompt rows, and the first-person reflection are complete. The reflection text was confirmed by the student before inclusion.

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
