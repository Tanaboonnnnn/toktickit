# Lab 4 Test DD Plan

Status: **Issue #76 Actions UI implementation candidate. HAR-01..HAR-03, MIG-01..MIG-03, SEED-01, UNIT-01, API-01..API-06, RACE-01..RACE-05, FLOW-01..FLOW-05, UI-01..UI-04, E2E-01, and E2E-02 have executed local evidence recorded below. Dashboard, final hardening, release, and final-main Test IDs remain future work.**

Primary authority: `SE+Lab+4.pdf` section 10 and the Acceptance Criteria in `specification.md`.

Current contract count: **57 unique planned Test IDs covering AC-01 through AC-28.** Test-ID count is not the same as runner assertion/test-case count.

## 1. Strategy

- Unit tests cover pure Action validation/lifecycle, Ticket workflow matrices, query normalization, date boundaries, and dashboard predicates.
- API/integration tests cover Action CRUD/lifecycle, role/ownership authorization, replay/idempotency, stale versions, cross-record races, Ticket resolution/cancellation, dashboards, migration/recovery, seed, and safe failures.
- UI component tests cover Actions Taken, workflow feedback, Dashboard states/navigation, draft retention, and retained role behavior.
- UI style/accessibility tests cover Zen Green continuity, semantic labels, read-only/editable meaning, focus, and non-color status meaning.
- Browser/E2E tests cover complete Action and Ticket journeys, Dashboard drill-down, role boundaries, retry/conflict behavior, responsive layouts, and representative Labs 1-3 regression.
- Migration/regression tests use only an isolated test database and temporary upload/evidence roots.
- Dashboard correctness is corroborated by an independent database query on fixed fixtures, not merely by comparing two callers of the same predicate helper.
- Concurrency tests assert final database invariants, not only HTTP response order.
- Performance smoke is bounded course-project evidence, not a production SLA claim.
- Planned tests remain planned until the executable file exists and the stated command runs successfully on the relevant source SHA.

## 2. Planned Test Registry

| Test ID | Type | Requirement / AC | Planned behavior | Expected result | Planned executable/evidence path | Final |
|---|---|---|---|---|---|---|
| SPEC-01 | Contract consistency | AC-01, AC-02, AC-10, AC-11, AC-26 | Validate source reconciliation, eleven required specification sections, matrices, DTO/UI/test agreement, and AC -> Test ID -> submission/rubric evidence crosswalk | Contract is internally consistent before product implementation | `docs/lab-04/specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md` | Planned / Not run |
| HAR-01 | Harness | AC-26 | Discover all Lab 4 plus retained suites; reject missing required suite / false empty success | Required suites selected honestly | `scripts/verify-lab4-harness.test.mjs`, `playwright.config.ts` | **Pass - Issue #72 local harness** |
| HAR-02 | Harness | AC-19, AC-26 | Protect test DB/upload roots and frozen Lab 3 artifact paths | Unsafe environment/frozen path fails closed before mutation | `scripts/verify-lab4-harness.test.mjs`, `server/tests/lab-04/harness-safety.unit.test.ts` | **Pass - Issue #72 local harness** |
| HAR-03 | CI/traceability | AC-26, AC-27 | Distinguish planning/increment/release modes and exact SHA/output roots | No candidate result is mislabeled final-main evidence | `scripts/verify-lab4-traceability.mjs`, `scripts/capture-lab4-release-evidence.mjs` | **Pass - Issue #72 local harness** |
| MIG-01 | Integration | AC-01, AC-19 | Clean install and populated Lab 3 -> Lab 4 migration, including Attachment byte checksums | Required old records/IDs/FKs/content/files preserved and new schema valid | `server/tests/lab-04/migration.integration.test.ts` | **Pass - Issue #73 local integration** |
| MIG-02 | Integration | AC-13, AC-19 | Repeat deploy, legacy terminal zero-Action Tickets, schema drift | Repeat is safe; legacy terminals remain valid; no destructive rewrite | `server/tests/lab-04/migration.integration.test.ts` | **Pass - Issue #73 local integration** |
| MIG-03 | Integration | AC-19 | Inject late migration failure in disposable target and execute documented recovery | No half-applied product mutation; recovery succeeds safely | `server/tests/lab-04/migration.integration.test.ts` | **Pass - Issue #73 local integration** |
| SEED-01 | Integration | AC-20 | Seed all required Lab 4 demo states, rerun, then rerun after deliberate fixture edits | No duplicates; edited identity/workflow/Action state is not reset | `server/tests/lab-04/seed.integration.test.ts` | **Pass - Issue #73 local integration** |
| UNIT-01 | Unit | AC-02, AC-03, AC-05 | Normalize/validate Action fields, server-only recorder/performer fields, conditional Result/follow-up, lifecycle matrix | Exact valid/invalid boundary behavior | `server/tests/lab-04/actions-policy.unit.test.ts` | **Pass - Issue #74 local** |
| API-01 | API | AC-01, AC-02, AC-03 | Valid Action create with different Ticket Owner/recorder/assignee; spoofed recorder/performer rejected | One Action under correct Ticket/cycle; authentic recorder/time; performer null before completion | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| API-02 | API/Auth | AC-06, AC-21 | Requester/Staff/Admin/session/CSRF/nested-parent authorization | Permitted reads/writes succeed; denied paths disclose nothing extra | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| API-03 | API | AC-04, AC-05 | Eligible/inactive/wrong-role assignment and all Action lifecycle paths with a different completing actor | Only documented assignments/transitions commit; completion auto-records immutable actual performer | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| API-04 | API | AC-07 | Same-key replay, changed-payload conflict, replay after later edit/parent close | One logical Action; matching replay returns same current identity | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| API-05 | API | AC-08, AC-14 | Stale child/parent versions, atomic revision/version behavior, explicit valid no-op | No lost update/false revision; accepted change increments once | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| API-06 | API | AC-06, AC-14 | All Action statuses/cycles across stable pages/ties; public revisions | Every Action reachable in deterministic order, safe public history | `server/tests/lab-04/actions-taken.api.test.ts` | **Pass - Issue #74 local** |
| RACE-01 | Concurrent API | AC-07, AC-08 | Simultaneous identical Action create requests | Exactly one Action/create revision; replay-safe responses | `server/tests/lab-04/actions-concurrency.api.test.ts` | **Pass - Issue #74 local** |
| RACE-02 | Concurrent API | AC-04, AC-08 | Assignment versus Administrator deactivation/demotion in both lock orders | No outstanding Action ends assigned to an ineligible User | `server/tests/lab-04/action-assignment-safety.api.test.ts` | **Pass - Issue #74 local** |
| RACE-03 | Concurrent API | AC-08, AC-09 | Two Action edits and parent Ticket version/owner change races | One valid serial outcome; stale loser cannot overwrite | `server/tests/lab-04/actions-concurrency.api.test.ts` | **Pass - Issue #74 local** |
| FLOW-01 | Unit/API | AC-10 | Evaluate all 64 Ticket source/destination pairs plus role/owner/text/confirmation guards | Only documented matrix edges pass | `server/tests/lab-04/ticket-workflow.unit.test.ts`, `server/tests/lab-04/ticket-workflow.api.test.ts` | **Pass - local Issue #75 focused run** |
| FLOW-02 | API | AC-11 | Resolution with zero/pending/mixed/all-cancelled/completed/follow-up combinations | Only qualifying current-cycle state resolves | `server/tests/lab-04/ticket-workflow.api.test.ts` | **Pass - local Issue #75 focused run** |
| FLOW-03 | API | AC-12 | Requester advisory indication and Action completion | Neither silently changes formal Ticket status | `server/tests/lab-04/ticket-workflow.api.test.ts` | **Pass - local Issue #75 focused run** |
| FLOW-04 | API | AC-13 | Legacy close and repeated reopen cycles | Legacy remains valid; new cycle demands new qualifying work | `server/tests/lab-04/ticket-workflow.api.test.ts` | **Pass - local Issue #75 focused run** |
| FLOW-05 | API | AC-09, AC-14 | Ticket cancellation fan-out and workflow-event order | Outstanding current-cycle Actions cancel atomically; history append-only | `server/tests/lab-04/workflow-history.api.test.ts` | **Pass - local Issue #75 focused run** |
| RACE-04 | Concurrent API | AC-09, AC-11 | Resolve versus Action create/complete/follow-up edit in both serialization orders | Final DB always satisfies resolution invariant or remains unresolved | `server/tests/lab-04/ticket-resolution-concurrency.api.test.ts` | **Pass - 6-test real-concurrency file** |
| RACE-05 | Concurrent API | AC-09, AC-14 | Ticket cancel versus child Action mutation / injected failure | No partial child/history cancellation survives rollback | `server/tests/lab-04/ticket-resolution-concurrency.api.test.ts` | **Pass - 6-test real-concurrency file** |
| UI-01 | Component | AC-02, AC-03, AC-05 | Staff Actions list/create/edit/assign/start/complete/cancel; distinct recorder/assignee/performer labels; conditional fields | Correct controls, labels, validation, authoritative server result | `client/tests/lab-04/ActionsTaken.test.tsx` | **Pass - Issue #76 local focused suite** |
| UI-02 | Component | AC-06, AC-14 | Requester all-items read-only Actions/history/privacy | All public Actions reachable; no mutation/Internal Notes | `client/tests/lab-04/ActionsTaken.test.tsx` | **Pass - Issue #76 local focused suite** |
| UI-03 | Component | AC-10, AC-11, AC-24 | Ticket permitted transitions/blocker feedback and unrelated draft retention | Backend-guided controls; blocked resolution clear; drafts preserved | `client/tests/lab-04/TicketWorkflow.test.tsx` | **Pass - 5 component tests** |
| UI-04 | Component | AC-07, AC-08, AC-24 | Ambiguous POST replay, stale edit reconciliation, cross-form draft lifetime | Same logical key retained; no silent overwrite/draft loss | `client/tests/lab-04/ActionsTaken.test.tsx`, `client/tests/lab-04/action-drafts.test.tsx` | **Pass - Issue #76 local focused suite** |
| DASH-01 | Unit/API | AC-15, AC-17 | Requester counts/previews, zero data, two-requester ownership isolation | Exact own-only metrics/previews | `server/tests/lab-04/requester-dashboard.api.test.ts`, `server/tests/lab-04/dashboard-metrics.unit.test.ts` | **Pass - Issue #77 local** |
| DASH-02 | API | AC-16, AC-17 | Staff/Admin metrics and current-user Action recorder/assignee/performer OR predicate | Exact counts; one Action matching multiple actor roles is deduplicated once with complete attribution | `server/tests/lab-04/staff-dashboard.api.test.ts` | **Pass - Issue #77 local** |
| DASH-03 | API/SQL | AC-17 | Fixed-clock lower/upper time boundary, RESOLVED/CLOSED, reopened, independent SQL | `[from,before)` and status predicates exactly match SQL | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | **Pass - Issue #77 local** |
| DASH-04 | API | AC-17, AC-18 | Strict combined filters, card->list equality beyond first page, stable ties | `totalItems` equals card count; unsupported queries rejected | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | **Pass - Issue #77 local** |
| DASH-05 | API/Auth | AC-15, AC-16, AC-24 | Wrong role/session, forged/unknown query, injected safe failure | No protected data leak; safe error contract | `server/tests/lab-04/requester-dashboard.api.test.ts`, `server/tests/lab-04/staff-dashboard.api.test.ts` | **Pass - Issue #77 local** |
| UI-05 | Component | AC-15, AC-17, AC-24 | Requester Dashboard values/previews/loading/empty/forbidden/failure | No fake zero during load/fail; retry and drill-down correct | `client/tests/lab-04/RequesterDashboard.test.tsx`, `client/tests/lab-04/DashboardApi.test.tsx`, `client/tests/lab-04/DashboardListContext.test.tsx` | **Pass - Issue #78 local focused suite** |
| UI-06 | Component | AC-16, AC-17, AC-24 | Staff/Admin Dashboard, current-user Actions, malformed DTO/failure states | Correct operational values and safe states | `client/tests/lab-04/StaffDashboard.test.tsx`, `client/tests/lab-04/DashboardApi.test.tsx`, `client/tests/lab-04/ActionsTaken.test.tsx` | **Pass - Issue #78 local focused suite** |
| UI-07 | Component | AC-18, AC-21 | Role homes, exact windows, refresh/Back/Forward, deep Action target, identity race | URL context preserved and stale private responses discarded | `client/tests/lab-04/DashboardNavigation.test.tsx`, `client/tests/lab-04/DashboardListContext.test.tsx`, `client/tests/lab-04/ActionsTaken.test.tsx` | **Pass - Issue #78 focused + browser suite** |
| PERF-01 | Performance smoke | AC-17 | Fixed ~1k Tickets/~3k Actions, warmups + 20 dashboard measurements, query/payload budget | Bounded query count/payload and approved local p95 smoke threshold | `server/tests/lab-04/dashboard-performance.integration.test.ts` | **Pass - Issue #77 local** |
| SEC-01 | API/security | AC-06, AC-21, AC-23 | Integrated auth/role/ownership/CSRF/nested-ID/Internal-Note privacy matrix | Direct requests enforce backend authorization/non-disclosure | `server/tests/lab-04/security-regression.api.test.ts` | Planned / Not run |
| SAFE-01 | API/UI | AC-24 | Safe unknown server failure and rejected Attachment download/client promise | No internal leak/unhandled client rejection; recoverable state preserved | `server/tests/lab-04/safe-errors.api.test.ts`, `client/tests/lab-04/safe-failures.test.tsx` | Planned / Not run |
| STYLE-01 | Style | AC-25 | Zen Green tokens, editable/read-only/private/shared/state conventions | Consistent text-bearing accessible visual semantics | `client/tests/lab-04/zen-green-styles.test.tsx` | Planned / Not run |
| A11Y-01 | Component/browser/manual | AC-25 | Labels/errors/keyboard/focus/busy/disabled semantics + final manual inspection | Operable without mouse; visible focus and associated errors | `client/tests/lab-04/accessibility.test.tsx`, `e2e/lab-04/final-regression.spec.ts`, `docs/lab-04/ui-spec.md` | Planned / Not run |
| RESP-01 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 1440x900 | No clipping/overlap/page overflow; readable controls | `e2e/lab-04/responsive-dashboards.spec.ts` | Planned / Not run for all major screens; Dashboard surfaces executed for Issue #78 |
| RESP-02 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 834x1112 | Tablet reflow remains usable/readable | `e2e/lab-04/responsive-dashboards.spec.ts` | Planned / Not run for all major screens; Dashboard surfaces executed for Issue #78 |
| RESP-03 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 390x844 | Mobile actions/content remain accessible without page overflow | `e2e/lab-04/responsive-dashboards.spec.ts` | Planned / Not run for all major screens; Dashboard surfaces executed for Issue #78 |
| E2E-01 | E2E | AC-02, AC-05, AC-06, AC-07 | Different recorder/assignee/completing performer actors, lifecycle, denied writes, Requester visibility, lost-success retry | Complete Action journey with one logical create and truthful performer attribution | `e2e/lab-04/actions-taken-flow.spec.ts` | **Pass - 1 Chromium flow on Issue #76 candidate** |
| E2E-02 | E2E | AC-09, AC-10, AC-11, AC-12, AC-13, AC-14 | Ticket lifecycle, resolution gate/follow-up, close/reopen/cancel/history | Complete documented lifecycle and audit behavior | `e2e/lab-04/ticket-resolution.spec.ts` | **Pass - 2 Chromium tests** |
| E2E-03 | E2E | AC-15, AC-16, AC-17, AC-18 | Requester + Staff dashboards, actual metrics, card/list/detail/back/deep-link | UI reflects backend predicates and preserves context | `e2e/lab-04/dashboards.spec.ts` | **Pass - 1 Chromium DB-backed flow on Issue #78 candidate** |
| E2E-04 | E2E | AC-21, AC-22, AC-23, AC-24, AC-25 | Representative all-role retained flows, safe failures, keyboard/responsive checks | Labs 1-3 representative regression remains correct | `e2e/lab-04/final-regression.spec.ts` | Planned / Not run |
| REG-01 | Retained suites | AC-21 | Lab 3 auth/session/password/CSRF/role homes, with intentional Dashboard-home updates | Security/auth behavior retained | `server/tests/lab-03/`, `client/tests/lab-03/`, `e2e/lab-03/` | Planned / Not run for Lab 4 candidate |
| REG-02 | Retained suites | AC-22 | Lab 2/3 Ticket create/idempotency/list/detail/Attachment lifecycle | Requester MVP remains correct under authentication | `server/tests/lab-02/`, `client/tests/lab-02/`, `e2e/lab-02/` | Planned / Not run for Lab 4 candidate |
| REG-03 | Retained suites | AC-23 | Comments/Internal Notes/advisory/Staff operations/Admin safety | Operational/admin behavior retained with Action-assignee safety extension | `server/tests/lab-03/`, `client/tests/lab-03/`, `e2e/lab-03/` | Planned / Not run for Lab 4 candidate |
| REG-04 | Retained suites | AC-19, AC-20, AC-26 | Earlier health/reference/migration/seed suites remain selected and meaningful | No regression hidden by suite exclusion | `server/tests/`, `client/tests/`, `e2e/`, `docs/lab-04/tests.md` | Planned / Not run for Lab 4 candidate |
| TRACE-01 | Traceability | AC-26 | Unique IDs, every AC mapped to planned tests and an Answer Part/rubric evidence destination, paths/evidence/results honest | No orphan AC/Test ID/evidence destination, fake Pass, or historical artifact rewrite | `scripts/verify-lab4-traceability.mjs`, `docs/lab-04/tests.md` | Planned / Not run |
| REL-01 | Review/process | AC-27 | Real peer review, Development links, staged history, actual board state | Process evidence matches GitHub reality | `docs/lab-04/reviewer.md`, live GitHub Issue/PR/Project evidence | Planned / Not run |
| REL-02 | Release verification | AC-26, AC-27 | Fresh complete verification on exact resulting final `main` SHA | Candidate evidence not substituted for final-main evidence | `docs/lab-04/tests.md`, `artifacts/lab-04/`, exact final GitHub SHA/check evidence | Planned / Not run |
| PDF-01 | Submission/manual | AC-28 | One PDF, Answer Part 1-9, working links, readable render, actual reflection/evidence | Grader-readable complete submission | `docs/lab-04/submission-outline.md` or final generation source; final PDF | Planned / Not run |

## 3. Acceptance-Criterion Traceability

The final-PDF destinations below use the handout's exact `Answer Part 1` through `Answer Part 9` structure. They identify where the grader-facing evidence for each AC belongs; they do **not** mark that evidence as already produced or passed.

| Key | Handout submission part |
|---|---|
| P1 | Answer Part 1 - Git Use with Engineering Workflow |
| P2 | Answer Part 2 - Spec DD |
| P3 | Answer Part 3 - Test DD and Traceability |
| P4 | Answer Part 4 - AI Use with Reflection |
| P5 | Answer Part 5 - Working IT Staff Dashboard UI |
| P6 | Answer Part 6 - Working Actions Taken UI |
| P7 | Answer Part 7 - Working Ticket Workflow |
| P8 | Answer Part 8 - Working Requester Dashboard and Final Regression UI |
| P9 | Answer Part 9 - Zen Green UI, Responsive, Accessibility, and Final Polish |

| AC | Planned Test IDs | Rubric / final-PDF evidence destination |
|---|---|---|
| AC-01 | MIG-01, API-01 | P6 create-Action demonstration; P3 API/migration evidence |
| AC-02 | UNIT-01, API-01, E2E-01 | P6 role/server-controlled-field demonstration; P3 unit/API/E2E evidence |
| AC-03 | UNIT-01, API-01, UI-01 | P6 validation demonstration; P9 validation-placement polish; P3 test evidence |
| AC-04 | API-03, RACE-02 | P6 assign/inactive-assignee demonstration; P3 API/concurrency evidence |
| AC-05 | UNIT-01, API-03, UI-01, E2E-01 | P6 edit/status/complete/cancel demonstration; P3 lifecycle evidence |
| AC-06 | API-02, API-06, UI-02, SEC-01, E2E-01 | P6 role restrictions/read-only Action visibility; P8 ownership/privacy regression; P3 authorization evidence |
| AC-07 | API-04, RACE-01, UI-04, E2E-01 | P6 safe duplicate/retry behavior; P3 idempotency/concurrency evidence |
| AC-08 | API-05, RACE-01, RACE-03, UI-04 | P7 append-only/audit behavior; P3 version/revision/concurrency evidence |
| AC-09 | RACE-03, FLOW-05, RACE-04, RACE-05, E2E-02 | P7 workflow consistency under competing mutations; P3 concurrency/E2E evidence |
| AC-10 | SPEC-01, FLOW-01, UI-03, E2E-02 | P7 permitted Ticket-transition demonstration; P2 documented matrix; P3 matrix tests |
| AC-11 | SPEC-01, FLOW-02, RACE-04, UI-03, E2E-02 | P7 resolution-gate demonstration; P2 gate rule; P3 API/concurrency/E2E evidence |
| AC-12 | FLOW-03, E2E-02 | P7 formal workflow boundary; P8 Requester advisory regression; P3 flow evidence |
| AC-13 | MIG-02, FLOW-04, E2E-02 | P7 reopen/legacy workflow demonstration; P2 legacy decision; P3 migration/flow evidence |
| AC-14 | API-05, API-06, FLOW-05, UI-02, E2E-02 | P7 stable ordering/append-only history; P8 retained Comments/Internal Notes behavior; P3 audit evidence |
| AC-15 | DASH-01, DASH-05, UI-05, E2E-03 | P8 Requester Dashboard metrics/previews/ownership; P3 dashboard evidence |
| AC-16 | DASH-02, DASH-05, UI-06, E2E-03 | P5 Staff Dashboard metrics/current-user Actions; P3 dashboard evidence |
| AC-17 | DASH-01, DASH-02, DASH-03, DASH-04, UI-05, UI-06, PERF-01, E2E-03 | P5/P8 accurate counts, drill-down and database-query match; P3 API/SQL/performance evidence |
| AC-18 | DASH-04, UI-07, E2E-03 | P5/P8 drill-down/navigation-context demonstration; P3 navigation/API evidence |
| AC-19 | HAR-02, MIG-01, MIG-02, MIG-03, REG-04 | P2 migration/recovery decisions; P3 clean/populated/repeat/recovery evidence |
| AC-20 | SEED-01, REG-04 | P3 repeat-safe seed evidence; seeded demo states support P5/P6/P8 demonstrations |
| AC-21 | UI-07, SEC-01, REG-01, E2E-04 | P8 authentication/security representative regression; P3 security/regression evidence |
| AC-22 | REG-02, E2E-04 | P8 My Tickets/Ticket Detail/Attachments representative regression; P3 retained-suite evidence |
| AC-23 | SEC-01, REG-03, E2E-04 | P8 Staff functions/Public Comments/Internal Notes/Admin regression; P3 security/regression evidence |
| AC-24 | UI-03, UI-04, DASH-05, UI-05, UI-06, SAFE-01, E2E-04 | P5/P6/P8 safe-failure behavior; P9 validation/error placement; P3 safe-error evidence |
| AC-25 | STYLE-01, A11Y-01, RESP-01, RESP-02, RESP-03, E2E-04 | P9 Zen Green/responsive/accessibility checklist + screenshots; P3 executable accessibility/responsive evidence |
| AC-26 | SPEC-01, HAR-01, HAR-02, HAR-03, REG-04, TRACE-01, REL-02 | P3 rendered Test DD, AC traceability and complete final-main test output |
| AC-27 | HAR-03, REL-01, REL-02 | P1 branch/PR/reviewer/Kanban history; P3 exact-final-main release verification |
| AC-28 | PDF-01 | Final single PDF containing readable Answer Parts P1-P9, working links, real evidence, and student-confirmed reflection including P4 |

## 4. Required TDD workflow for implementation Issues

For behavior work after Issue #71 review:

1. Identify the applicable FR/BR/AC/Test ID before editing implementation.
2. Create or evolve the most focused executable test first when practical.
3. Confirm meaningful RED: failure because required behavior is missing/wrong, not because Prisma was not generated, DB is unavailable, or another environment prerequisite is broken.
4. Make the smallest coherent implementation behind the selected module interface.
5. Re-run focused test to GREEN.
6. Run affected package/regression checks.
7. Inspect `git diff` and update this ledger only with evidence actually executed on the recorded source state.

Environment/setup failure is never recorded as TDD RED.

## 5. Migration and data verification protocol

- Prove `TEST_DATABASE_URL` is distinct from `DATABASE_URL` using the existing canonical host/port/database safety logic before mutation.
- Use only disposable/test-owned schemas and temporary upload roots.
- Snapshot required Lab 3 rows and active/removed Attachment byte checksums before populated-upgrade testing.
- Apply historical migrations unchanged plus the new forward migration.
- Compare IDs/FKs/core fields/timestamps/Attachment bytes after migration.
- Include a legacy terminal Ticket with zero Actions.
- Re-run deploy/status/drift checks.
- Inject one late migration failure in a disposable target and execute documented recovery.
- Run seed twice, make deliberate fixture edits, seed again, and prove edits were not reset.
- Never use a destructive development DB reset as evidence.

## 6. Dashboard correctness protocol

Use deterministic clock fixtures. For each card:

1. Compute expected value with an independent SQL query over fixed fixtures.
2. Call Dashboard endpoint and compare exact count.
3. Follow its drill-down query without modifying data and compare detailed list `totalItems`.
4. Verify count can exceed preview length / first page.
5. Exercise zero state.
6. For Requester, repeat with a second Requester containing foreign matching rows and prove no count/list leakage.
7. For recent-resolved, test exact lower-bound included, upper-bound excluded, CLOSED inclusion, REOPENED exclusion, and exact Dashboard-returned window reuse.

## 7. Performance-smoke protocol

Before measurement, the reviewed contract fixes the dataset/measurement method rather than tuning the threshold after seeing results:

- isolated test data: approximately 1,000 Tickets and 3,000 Actions;
- three warm-up requests per Dashboard endpoint;
- twenty measured requests per endpoint;
- monotonic elapsed-time measurement;
- record machine/database context;
- target no N+1 loop, <=12 business-data SQL queries, response JSON <=64 KiB, local p95 <=2 seconds.

Any threshold miss is reported honestly and investigated; the threshold is not silently lowered/raised after failure. This is a smoke check, not a production-scale performance guarantee.

## 8. Responsive / visual evidence protocol

Required viewports:

- 1440x900 desktop
- 834x1112 tablet
- 390x844 mobile

Final evidence roots:

```text
artifacts/lab-04/screenshots/staff-dashboard/
artifacts/lab-04/screenshots/requester-dashboard/
artifacts/lab-04/screenshots/actions-taken/
```

Additional `ticket-workflow/` and `regression/` folders are acceptable. Every generated manifest entry should record scenario/Test ID, source SHA, actor role, route, viewport, command, and actual file. Screenshot existence is not a Pass by itself; rendered output must be manually inspected for clipping, overlap, overflow, broken focus/readability, and stale placeholder data.

### 8.1 Reviewed evidence scenario registry

These stable IDs freeze the visual/evidence surfaces already approved in Issue #71; they do **not** add product scope. Lab 4 release capture must reject an unknown scenario ID, an unknown Test ID, a Test ID not allowed for that scenario, any rubric value outside `P1`-`P9`, or a rubric part not allowed for that scenario. The human-readable `scenario` text remains descriptive; `Scenario ID` is the stable manifest identity.

| Scenario ID | Reviewed surface / intent | Allowed Test IDs | Allowed rubric parts |
|---|---|---|---|
| L4-STF-DASHBOARD | Staff operational Dashboard metrics, previews, drill-down and states | UI-06, E2E-03, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P5, P9 |
| L4-REQ-DASHBOARD | Requester-owned Dashboard metrics, previews, drill-down and states | UI-05, E2E-03, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P8, P9 |
| L4-ADM-DASHBOARD | Administrator reuse of Staff Dashboard without expanding Requester-only product permissions | UI-06, E2E-03, REG-03, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P5, P9 |
| L4-STF-ACTIONS | Staff/Admin Actions Taken list/create/edit/status/complete/cancel and failure states | UI-01, E2E-01, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P6, P9 |
| L4-REQ-ACTIONS | Owning Requester read-only Actions Taken visibility and privacy boundary | UI-02, E2E-01, SEC-01, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P6, P8, P9 |
| L4-TICKET-WORKFLOW | Formal Ticket transition/gate/history UI and conflict/failure states | UI-03, E2E-02, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P7, P9 |
| L4-RETAINED-REGRESSION | Representative retained authentication, Requester, Staff/Admin and responsive regression evidence | E2E-04, REG-01, REG-02, REG-03, RESP-01, RESP-02, RESP-03, A11Y-01, STYLE-01 | P8, P9 |

## Issue #77 Dashboard backend execution record

Kickoff base: freshly fetched `origin/lab4-staging` `b6282721cc58a5210545cac985fba6ffdecd1fda`; isolated branch/worktree `feature/77-lab4-dashboard-api`. Development/test identity checks resolved `localhost:5432/toktickit` and `localhost:5432/toktickit_test`; fixtures use the retained canonical safety guard and clean up only their owned IDs. Dashboard tests create no upload bytes and no migration or seed behavior was changed.

The meaningful REDs were four valid strict-query requests, three absent Requester API cases, and four absent Staff API cases. GREEN evidence covers DASH-01..05 and PERF-01 through the planned five executable test files: **5 files / 53 tests passed**. It includes all active/terminal Ticket status predicates, owned-only aggregation/previews, recorder/assignee/performer union with complete attribution/deduplication, completed/cancelled/old-cycle/inactive historical references, exact fixed-clock lower-inclusive/upper-exclusive UTC bounds and offset equivalence, independent SQL/card/list equality beyond page one, stable ties, combined filters, safe 400/401/403/500 behavior, repeatable-read consistency during a real concurrent Ticket update, and retained Ticket recency semantics. The product GETs leave Ticket versions/timestamps unchanged.

Controlled PERF-01 fixture: **1,000 test-owned Tickets / 3,000 Actions**; Windows x64, Node **v24.14.0**, Prisma **5.22.0**, local PostgreSQL test database. Each role used **3 warmups + 20 measured HTTP requests**. The latest focused run recorded Requester **9 business SQL queries**, **4,500 response bytes**, **44.03 ms p95**; Staff **11 queries**, **7,530 bytes**, **48.11 ms p95**. Counts remained constant across measurements. The query instrumentation records actual Prisma SQL events; transaction controls, the existing authenticated-actor lookup, and the separately managed session store are excluded from the business-query budget. These are local course smoke results against the documented <=12 queries / <=64 KiB / <=2-second p95 alarms, not production performance guarantees.

The first full TypeScript build after adding query instrumentation caught a test-only Prisma generic inference error (`query` event inferred as `never`). The listener was attached to the inferred query-enabled client instead of widening types. This compile correction is not recorded as product TDD RED. Trace ownership is extended only now that all six #77 Test IDs have real executable local evidence. UI-05..07, E2E-03, broad responsive/accessibility and final-main/release rows remain Planned / Not run in their later scopes.

Fresh final local aggregate verification on the implementation tree committed as `de60e2ac20d96437876eb7259d7860a565153b57`: `npm.cmd run verify` **Pass (exit 0)**; server **67 files / 403 tests**, client **29 files / 153 tests**, harness **9 Node + 3 safety tests**, retained Lab 3 trace and Lab 4 planning trace **Pass**, Chromium E2E **43/43**, responsive **16/16**. Increment trace #77 and `git diff --check` passed. The aggregate smoke logged **9/11 business queries**, **4,510/7,573 bytes**, **25.90/32.83 ms p95**. These fresh results supplement the focused evidence above; they do not claim Dashboard UI execution, human review, hosted CI, or final-main/release completion.

## 9. Issue #71 baseline verification record

These checks were executed only to establish the delivered Lab 3 source baseline before writing this contract. They are **not Lab 4 product Test-ID Pass evidence**.

Source baseline/worktree: `d41ab98d9d40266b355fe5fb3b3bcb193df8a116` on `feature/71-lab4-contract`, created from fetched `origin/main`.

| Check | Fresh Issue #71 result |
|---|---|
| `npm.cmd exec prisma generate` (server) | Success; Prisma Client v5.22.0 generated after clean install |
| `npm.cmd --prefix server run build` | Pass |
| Focused retained Lab 3 server unit subset | 8 files / 67 tests passed |
| `npm.cmd --prefix client run build` | Pass |
| `npm.cmd --prefix client test` | 25 files / 136 tests passed; one known jsdom navigation warning was emitted while suite still passed |
| `npm.cmd run test:trace:lab3` | Pass - 50 unique Lab 3 Test IDs / 32 ACs / mapped paths exist |

Not run in Issue #71: database/API integration suites, migration/seed mutation, browser/E2E/responsive capture, or Lab 4 executable tests. Issue #71 is documentation-only and must not mutate project data or historical Lab 3 evidence.

## 10. Issue #72 verification-harness execution record

Issue #72 starts from fetched `lab4-staging` merge `6969b70a11010008db63f685a745710df68d089f` in isolated branch `feature/72-lab4-verification-harness`. The preserved dirty Lab 3 root/worktrees were not reset, cleaned, stashed, or reused.

The harness now discovers future `e2e/lab-04/**/*.spec.ts`, routes ordinary browser screenshots to ignored `artifacts/lab-04/test-output/`, rejects frozen Lab 2/3 evidence paths, keeps the managed database/upload/process guards, provides planning/increment/release trace modes, and adds Lab 4 CI for `lab4-staging`/`main` with the canonical `toktickit_test` identity. Release evidence remains scenario/Test-ID/rubric driven; it does not inherit Lab 3's fixed 41-image count.

Fresh local checks executed after the safe-output routing was installed:

| Check | Issue #72 result |
|---|---|
| Prisma Client generation from `server/prisma/schema.prisma` | Pass - Prisma Client v5.22.0 generated in the isolated worktree |
| `npm.cmd --prefix server run build` | Pass |
| `npm.cmd --prefix server test` | Pass - 52 files / 288 tests |
| `npm.cmd --prefix client run build` | Pass |
| `npm.cmd --prefix client test` | Pass - 25 files / 136 tests |
| `npm.cmd run test:harness:lab4` | Pass - 8 Node harness tests + 3 server safety tests |
| `npm.cmd run test:trace:lab3` | Pass - retained 50 Test IDs / 32 ACs |
| `npm.cmd run test:trace:lab4 -- --mode=planning` | Pass - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs |
| `npm.cmd run test:e2e` | Pass - 37 retained browser tests |
| `npm.cmd run test:responsive` | Pass - 13 retained responsive browser tests |
| `npm.cmd run test:e2e:lab4` / `test:responsive:lab4` before later feature specs exist | Expected non-zero guard: explicitly refuses a false green empty Lab 4 suite |
| `git diff --check` | Pass |

The three Issue #72-owned HAR rows may therefore record local Pass evidence. This does **not** promote TRACE-01, REL-02, migration, Actions, Dashboard, final regression, or final-main rows: those remain future work. Hosted PR-head CI/review evidence is recorded only after GitHub actually produces it.

## 11. Issue #74 Actions API execution record

Issue #74 started from fetched `origin/lab4-staging` SHA `29538dd5af5cc0202d30105b4d4c2e383ddf5bec` in a dedicated clean `feature/74-lab4-actions-api` worktree. The preserved dirty root and Issue #73 worktree were not reset, stashed, cleaned, deleted, or reused. Before database-backed tests, the local safety check resolved the development database as `loopback:5432/toktickit` and the test database as `loopback:5432/toktickit_test`; Prisma reported the test schema up to date with all four migrations.

TDD progressed through meaningful RED -> GREEN waves: missing pure Action policy modules; missing read/auth routes; missing create/replay mutation service; missing edit/status/version/audit routes; then a real Administrator-safety RED where an outstanding Action assignee could still be deactivated. The latter was fixed by extending the existing locked Administrator safety transaction, not by weakening the race assertion. A later broad test run exposed only a test-fixture Ticket Number collision caused by two parallel fixture creates; the fixture identity was changed to UUID-backed uniqueness without changing product assertions.

Fresh focused evidence after the final Issue #74 gap audit:

| Check | Issue #74 result |
|---|---|
| `npm.cmd test -- tests/lab-04/actions-policy.unit.test.ts tests/lab-04/actions-taken.api.test.ts tests/lab-04/actions-concurrency.api.test.ts tests/lab-04/action-assignment-safety.api.test.ts` (server) | **Pass - 4 files / 32 tests** |
| `UNIT-01` | Pass - normalization/validation, immutable client-field rejection, lifecycle matrix, pagination query policy |
| `API-01..API-06` | Pass - public read/privacy, nested parent IDOR, create/edit/status/revision behavior, actor-scoped replay, all lifecycle edges/statuses/cycles, completed correction after a historical assignee becomes inactive, stale/no-op/audit semantics, and injected revision-persistence rollback with a safe 500 envelope |
| `RACE-01` | Pass - simultaneous identical create produced one logical Action/create revision and one parent bump with `201` + replay-safe `200` |
| `RACE-02` | Pass - outstanding assignment blocks deactivation/demotion; forced assignment-first and admin-first serialization were exercised for both deactivation and demotion |
| `RACE-03` | Pass - competing Action edits and Action edit vs Ticket owner mutation serialize to one valid winner without partial audit/version state |

Fresh pre-PR verification after the Issue #74 gap additions:

| Check | Issue #74 result |
|---|---|
| `npm.cmd --prefix server run build` | **Pass** |
| `npm.cmd run test:trace:lab4 -- --mode=increment --issue=74` | **Pass** - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs; Issue #74 owns only `UNIT-01`, `API-01..API-06`, and `RACE-01..RACE-03` |
| `npm.cmd run verify` | **Pass** - server 58 files / 324 tests; client 25 files / 136 tests; Lab 4 harness 9 Node tests + 3 server safety tests; retained Lab 3 trace pass; Lab 4 planning trace pass; retained E2E 37/37; retained responsive 13/13 |
| `git diff --check` | **Pass**; line-ending warnings only, no whitespace errors |

The 32-test/324-server-test results above include a self-review correction prepared after PR #84 was already opened: a focused RED reproduced that completed content correction was incorrectly blocked after its historical assignee became inactive, then the implementation was narrowed so current assignee eligibility is rechecked only for outstanding `PENDING`/`IN_PROGRESS` Actions. A second regression deliberately caused revision persistence to fail after the in-transaction Action/Ticket updates and proved rollback plus the safe public 500 envelope. This correction is included in the branch update that accompanies this evidence record; hosted PR-head CI must therefore be checked again on the resulting exact remote SHA before review/merge evidence is treated as current.

The full `verify` result above is local candidate evidence, not hosted PR-head CI and not final-main/release evidence. `FLOW-01..FLOW-05`, `RACE-04`, `RACE-05`, UI/Dashboard/E2E Lab 4 product IDs, `REL-02`, and later release rows remain `Planned / Not run` exactly because Issue #74 does not implement or execute them.

Hosted Issue #74 completion evidence was rechecked at Issue #75 kickoff: human reviewer `@thananun-7203` **Approved** exact PR #84 head `bdacb67cd42ea06b797215dbbc70dc0597d25614` at `2026-09-30T07:08:24Z`; PR #84 merged into `lab4-staging` at `2026-09-30T07:08:44Z` as `6ced65026bc91804363108588e708f0445f3eb65`; post-merge Lab 4 CI run `36682044004` completed **success** on that exact staging SHA. These hosted facts complement, rather than replace, the local Issue #74 execution record above.

## 12. Issue #75 Ticket workflow execution record

Issue #75 starts from a fresh fetch of `origin/lab4-staging` at exact SHA `6ced65026bc91804363108588e708f0445f3eb65` in dedicated clean worktree `.worktrees/feature-75-lab4-ticket-workflow`. Live GitHub showed Issue #75 open with no existing feature branch/PR; the preserved dirty Lab 3 root and completed Issue #74 worktree were not reset, stashed, cleaned, deleted, or reused.

Before Issue #75 product edits, Prisma Client generation succeeded and the focused retained/current workflow baseline passed **4 files / 33 tests**: Lab 3 Ticket workflow/concurrency plus Lab 4 Actions API/concurrency. This is startup baseline evidence only; no Issue #75 Test ID is promoted to Pass by that run.

Issue #75 owns `FLOW-01..FLOW-05`, `RACE-04`, `RACE-05`, `UI-03`, and `E2E-02`. TDD produced meaningful RED before implementation: the new resolution unit test failed all three missing current-cycle predicates; the first API/history run failed eight assertions across gate/event/reopen/cancel/projection behavior; the UI suite failed on duplicated transition authority and draft reset; and the first browser run exposed an incorrect frontend-origin CSRF target in the new fixture. A later fail-closed UI regression also reproduced that accepting a Staff Detail DTO without backend workflow metadata would reintroduce duplicated client authority.

The implemented workflow now enforces the retained eight-status matrix plus the current-cycle resolution predicate in the same locked Ticket transaction; records forward-only Ticket workflow events; increments `workflowCycle` on reopen; atomically cancels outstanding current-cycle Actions with revisions when the Ticket is cancelled; exposes bounded ownership-safe workflow history; returns backend-authoritative permitted transitions and blocker counts; preserves Requester advisory independence; and keeps unrelated Staff status drafts through refresh/conflict reloads. Retained Lab 3 fixtures were evolved only where the approved Lab 4 rule changed their setup/cleanup, with the original assertions preserved in `docs/lab-04/regression-map.md`.

Fresh local candidate verification after those corrections:

| Check | Issue #75 result |
|---|---|
| Focused workflow/API/history set | **Pass - 5 files / 33 tests** |
| `server/tests/lab-04/ticket-resolution-concurrency.api.test.ts` | **Pass - 6/6 real-concurrency tests** |
| Focused Staff workflow client/regression set | **Pass - 4 files / 21 tests** |
| `npm.cmd run test:trace:lab4 -- --mode=increment --issue=75` | **Pass** - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs; Issue #75 mapping is limited to its reviewed workflow IDs |
| `npm.cmd run test:e2e:lab4` | **Pass - 2/2 Chromium tests** |
| `npm.cmd run verify` | **Pass** - server **62 files / 349 tests**; client **26 files / 141 tests**; Lab 4 harness **9 Node + 3 server safety tests**; retained Lab 3 trace pass; Lab 4 planning trace pass; browser E2E **39/39** including the two Issue #75 Lab 4 cases; retained responsive **13/13** |

During verification, one earlier interrupted run had left a single `issue44/issue48` fixture group in the isolated `TEST_DATABASE_URL`; this was proven to be test-owned data from the retained Staff workflow fixture and removed transactionally before the final full verification. No development/project database row was reset or deleted. The final verification above was then rerun from a clean test-fixture state and passed.

These results are **local candidate evidence only**. Mandatory Issue #75 self-review, exact remote PR-head hosted CI, real peer review, integration, and final-main/release evidence remain separate gates and are not pre-claimed here.

## 13. Issue #76 Actions UI execution record

Issue #76 started from a fresh live-remote verification of `origin/lab4-staging` at exact SHA `291ba99440be47372fe9b38f84aefc49fb38dd0c` in dedicated worktree `.worktrees/feature-76-lab4-actions-ui`. PR #85 was already Approved/merged, Issue #75 was closed completed, and post-merge Lab 4 CI `36729227522` had succeeded on that exact base. No existing #76 branch or PR was reused, and the preserved dirty root / worktrees #71-#75 were not reset, cleaned, stashed, or repurposed.

Issue #76 owns `UI-01`, `UI-02`, `UI-04`, and `E2E-01`. TDD introduced a single deep Actions client seam rather than rebuilding #74/#75 backend behavior: typed/runtime-validated list/create/edit/status/revision adapters, backend-derived per-Action and list-level capabilities, Staff/Admin create/edit/reassign/start/complete/cancel/history controls, and owning-Requester all-cycle/all-status read-only visibility. Create retry freezes and replays the original normalized UUID/payload after an ambiguous result; stale `409` preserves drafts, refreshes parent Ticket + child Action versions, and requires deliberate reapplication instead of a blind retry. Same-Ticket parent refresh preserves the Action draft while Ticket identity change clears it. Staff attachment download rejection is handled explicitly.

The browser TDD journey exposed one real UI-spec mismatch that component mocks had not caught: Create Action did not preselect the authenticated actor. The implementation was corrected so the current Staff/Admin actor is the initial eligible assignee selection while the backend remains authoritative and the user may deliberately choose another eligible assignee. `E2E-01` then proved one committed Action after a lost response + same-key replay, distinct recorder/assignee/completing performer attribution, Staff edit/start/complete interaction, Requester read-only Action/history visibility, and direct Requester mutation denial.

Regression verification also exposed retained Lab 2/3 tests whose fetch fixtures did not know about the new Actions endpoint, plus one old scope assertion that explicitly required Requesters not to see “Actions Taken.” Those fixtures were updated to the approved Lab 4 read contract, and the scope guard now asserts the required read-only Actions surface while still denying Internal Notes and all Staff mutation controls. No legacy security assertion was removed merely to obtain a green suite.

Current executed Issue #76 evidence after the pre-PR self-review corrections:

| Check | Issue #76 result |
|---|---|
| `client/tests/lab-04/ActionsTaken.test.tsx` + `action-drafts.test.tsx` + `TicketWorkflowHistory.test.tsx` | **Pass - 3 files / 11 tests** |
| #74/#75 focused API/RACE/FLOW preservation set | **Pass - 5 files / 41 tests** |
| Full server suite | **Pass - 62 files / 350 tests** |
| Full client suite | **Pass - 29 files / 153 tests** |
| `npm.cmd run test:harness:lab4` | **Pass - 9 Node harness + 3 server safety tests** |
| `npm.cmd run test:trace:lab4 -- --mode=increment --issue=76` | **Pass** - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs |
| `npm.cmd run test:e2e:lab4` | **Pass - 6/6 Chromium tests** (E2E-01, retained E2E-02, and three Actions viewport checks) |
| Actions visual checks | **Pass for the Issue #76 Actions surfaces only** at 1440x900, 834x1112, 390x844; broad `RESP-01..03` remain Planned for Issue #79 because they cover all major Lab 4 screens |

The first aggregate `npm.cmd run verify` attempt after implementation stopped at retained client fixtures; after those contract-aware fixture updates, the server and client full suites passed. A subsequent aggregate attempt advanced through server/client but correctly failed the Lab 4 harness because the harness test still expected Issue #76 to be an unmapped future increment after `scripts/lab4-verification.mjs` gained #76 ownership. The harness expectation was updated to accept #76 and reject future #77 instead. The next aggregate run exposed three retained browser-test/evidence assumptions rather than product failures: one proxy test raced on response-body completion, one Ticket Detail assertion became ambiguous after the new Actions helper text repeated the Ticket number, and User Management screenshot setup left unrelated technical fixture rows visible behind the Create User form. Those checks were tightened without weakening their behavior assertions.

The mandatory pre-PR review then found two real UI-contract gaps that earlier green suites did not cover: Staff Ticket Detail had backend Ticket workflow-event history but no rendered public history section, and Action validation did not consistently focus/associate the first invalid editable field. New focused REDs reproduced both gaps. The candidate now renders a paginated truthful Lab-4-only Ticket workflow history with an explicit no-backfill empty state, refreshes it with parent Ticket version changes, and associates/focuses Action validation errors across create/edit/complete/cancel controls. Retained E2E-02 now verifies the visible `IN_PROGRESS -> RESOLVED` event after resolution. The final fresh `npm.cmd run verify` after these corrections passed end to end: server **62 files / 350 tests**, client **29 files / 153 tests**, Lab 4 harness **9 Node + 3 server safety tests**, Lab 3 trace **Pass**, Lab 4 planning trace **Pass**, browser E2E **43/43**, and responsive **16/16** including the three Actions viewport cases.

Final pre-PR hardening kept the last successful Action list visible if a same-page refresh fails, made every public Action revision page reachable from the UI, and expanded the real `E2E-01` evidence journey to capture create validation/focus, ambiguous-response reconciliation, edit mode, and stale-conflict draft preservation. The focused Actions/draft/workflow-history component set passes **11/11** and the focused Issue #76 browser set passes **3/3**. A fresh aggregate `npm.cmd run verify` after those changes again passed with the same **62/350 server**, **29/153 client**, **43/43 browser**, and **16/16 responsive** totals. These remain local candidate results only.

Clean exact-source evidence capture on `4957dccc9c36037b9a3005d1c19954880d300c39` passed **6/6** Lab 4 browser scenarios and generated **12** scenario-driven screenshots with per-image metadata plus a source-SHA manifest in `artifacts/lab-04/screenshots/issue76-4957dcc/`. Manual inspection covered all 12 images, including Staff/Requester desktop-tablet-mobile views and create-validation, ambiguous retry, edit, stale-conflict, completion, and Requester history/read-only states; no page-level horizontal overflow, clipped primary controls, missing visible validation state, or private Internal Notes leak was observed.

These results remain **local candidate evidence**, not hosted PR-head CI, human approval, merge, or final-main/release evidence. Those states are recorded only after the corresponding GitHub events exist.

## Issue #78 Dashboard UI execution record

Starting source base: verified `origin/lab4-staging@e5a101894dfd706842e1e9e807c766695aaf79dc`; working candidate remains uncommitted on `feature/78-lab4-dashboard-ui`. Test database target was verified as `localhost/toktickit_test`, distinct from development `localhost/toktickit`; the managed browser harness created its separate run-owned upload root and cleaned it. The E2E fixtures were owned by this run and their cleanup was verified after an interrupted run.

| Check | Issue #78 candidate result |
|---|---|
| Focused Dashboard/Action UI set: `npm.cmd --prefix client test -- tests/lab-04/DashboardApi.test.tsx tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/StaffDashboard.test.tsx tests/lab-04/DashboardNavigation.test.tsx tests/lab-04/DashboardListContext.test.tsx tests/lab-04/ActionsTaken.test.tsx` | **Pass - 6 files / 25 tests** |
| Affected retained Client regression: AuthShell, Staff Queue, My Tickets controls/states, Ticket Detail, Requester regression | **Pass - 6 files / 29 tests**; only Login and successful Change Password expected-home hashes evolved from `#/tickets` to accepted `#/dashboard` |
| Complete Client suite: `npm.cmd --prefix client test` | **Pass - 34 files / 170 tests**; existing non-fatal jsdom navigation diagnostic observed |
| Client production build: `npm.cmd --prefix client run build` | **Pass** |
| Issue trace: `npm.cmd run test:trace:lab4 -- --mode=increment --issue=78` | **Pass** - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs |
| DB-backed Dashboard journey: `node e2e/lab-02/support/run-playwright.mjs e2e/lab-04/dashboards.spec.ts --project=chromium` | **Pass - E2E-03, 1 Chromium flow**; independent database metric comparisons, requester active/resolved drill-down and detail/back/refresh/Back/Forward, Staff queue/detail/back, Action target on page 2 focused, Administrator reuse/Users/no Requester Create |
| Dashboard responsive viewports: `node e2e/lab-02/support/run-playwright.mjs e2e/lab-04/responsive-dashboards.spec.ts --project=chromium` | **Pass - 9/9** across Requester, Staff, and Administrator at 1440x900, 834x1112, 390x844; horizontal overflow and viewport containment checks passed; final screenshots are in the roots below |
| `npm.cmd run verify` | **Pass (exit 0)** - server **67 files / 403 tests**, client **34 files / 170 tests**, harness **9 Node + 3 server safety tests**, Lab 3 trace and Lab 4 planning trace Pass, Chromium E2E **53/53**, responsive **25/25** |

The trace verifier previously had no Issue #78 ownership entry. Its increment map now owns UI-05/UI-06/UI-07/E2E-03; the harness test confirms those rows pass and Issue #79 is still an unmapped future increment. `RESP-01..03` remain Planned for the complete major-screen evidence gate; Issue #78's three dashboard surfaces ran and passed at all three viewports, and Lab 4 Actions viewports are included in aggregate verification.

Dashboard screenshots and metadata captured from the final dashboard responsive run:

- `artifacts/lab-04/screenshots/requester-dashboard/{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/staff-dashboard/{desktop,tablet,mobile}.png`
- `artifacts/lab-04/screenshots/administrator-dashboard/{desktop,tablet,mobile}.png`

All nine images were visually inspected. Long Ticket summaries wrap, tablet metric links remain inside their cards, metric text and attribution remain readable on mobile, navigation remains usable, and no page-level horizontal overflow or clipped Dashboard content was observed. Screenshot metadata records scenario ID, Test ID, viewport, and rubric part for each file.

### Issue #78 independent review corrections

The fixed-base GPT-6.1 Sol Spec review identified four behavior/evidence gaps. Each behavior correction received a focused RED before the narrow fix. At initial capture the candidate was uncommitted, so metadata recorded `sourceRevision: null`. After implementation commit `632a16adb2591ee0dcbf232831c978b0fae981f6`, all 22 dashboard screenshot sidecars were regenerated and verified against that exact source SHA.

| Finding | RED and GREEN evidence |
|---|---|
| A stale Dashboard request could process a delayed 401 after its effect was cancelled and notify auth failure for the newer session. | RED: `npm.cmd --prefix client test -- tests/lab-04/RequesterDashboard.test.tsx` failed because the newer user disappeared after the old request returned 401. GREEN: `npm.cmd --prefix client test -- tests/lab-04/RequesterDashboard.test.tsx tests/lab-04/DashboardApi.test.tsx` passed **2 files / 6 tests** after request cancellation was passed through the dashboard transport and stale auth side effects were suppressed. |
| My Tickets restored applied URL search but showed an empty draft input after route restoration. | RED: `npm.cmd --prefix client test -- tests/lab-04/DashboardListContext.test.tsx` expected `VPN access` in the search input and received an empty value. GREEN: focused Dashboard list + retained My Tickets/Staff Queue set passed **4 files / 18 tests**; a fresh mount initializes both applied and editable search from the parsed route. |
| Explicit empty strict query parameters were accepted/dropped instead of rejected. | RED: `npm.cmd --prefix client test -- tests/lab-04/DashboardNavigation.test.tsx` failed for `resolvedFrom=`. Coverage now also rejects empty `resolvedBefore`, `statusGroup`, `page`, and detail `actionId`; GREEN: navigation/list/Staff Queue focused set passed **3 files / 14 tests**. |
| Prior Dashboard state screenshots omitted loading/empty/forbidden/failure and did not carry a source revision field. | RED: `node e2e/lab-02/support/run-playwright.mjs e2e/lab-04/dashboard-states.spec.ts --project=chromium` ran 12 scenarios and failed because metadata lacked `sourceRevision` (state assertions/captures executed). GREEN: same command passed **12/12**; explicit revision plumbing rejects malformed full-SHA values, and the capture orchestrator verifies each metadata revision matches its candidate SHA. Captures assert all four states for Requester plus Staff and Admin reuse: `L4-REQ-DASHBOARD` (`UI-05`, P8), `L4-STF-DASHBOARD` and `L4-ADM-DASHBOARD` (`UI-06`, P5), mapped to AC-15/16/24. The initial uncommitted metadata used `null`; it was superseded by the commit-bound capture recorded below. |

Fresh post-review verification after the four findings and retained-test updates:

| Check | Result |
|---|---|
| Focused Dashboard/Auth/list/retained client regressions | **Pass - 8 files / 39 tests**; Actions attribution/target assertions remain included |
| `npm.cmd --prefix client test -- tests/lab-04/StaffDashboard.test.tsx tests/lab-03/UserManagement.test.tsx` | **Pass - 2 files / 8 tests** after preserving authenticated transport assertions and awaiting async rows |
| `npm.cmd --prefix client run build` | **Pass** |
| `npm.cmd run test:harness:lab4` | **Pass - 9 Node + 3 server safety tests** |
| `npm.cmd run test:trace:lab4 -- --mode=increment --issue=78` | **Pass** - 24 FRs / 54 BRs / 28 ACs / 57 Test IDs |
| `npm.cmd run verify` with `DATABASE_URL` and `TEST_DATABASE_URL` loaded from the preserved local root `.env` (values not emitted) | **Pass** - server **67/403**, client **34/172**, harness **9+3**, Lab 3 and Lab 4 planning traces Pass, browser E2E **65/65**, responsive **25/25** |
| `git diff --check` | **Pass** |

The aggregate's first unconfigured run failed because the PowerShell environment did not contain the required database variables; it was rerun successfully from the preserved root `.env` after confirming the test database identity is distinct from development. A first configured full Client run also revealed two retained test assumptions, corrected without changing product behavior or weakening intent; the focused corrected pair passed and the complete Client suite then passed. Those initial state sidecars used `sourceRevision: null`; the exact-source recapture below now binds all 22 Dashboard images to the committed implementation SHA.
State scenario PNG/metadata pairs are under `artifacts/lab-04/screenshots/{requester-dashboard,staff-dashboard,administrator-dashboard}/states/`; all 22 Dashboard image sidecars now carry the implementation source SHA.

### Requester forbidden Dashboard state follow-up

Root's final evidence audit found that the initial state suite represented Requester 401 only as an expired session, while explicit 403 evidence existed only for Staff/Admin. A focused Requester component regression first failed because the 403 was rendered as a generic retryable failure. RequesterDashboard now renders a distinct Access Denied state for 403 without metrics or Retry; the 401-to-Login scenario remains separate. The focused Client check passed `npm.cmd --prefix client test -- tests/lab-04/RequesterDashboard.test.tsx` (**1 file / 5 tests**). The browser state suite passed **13/13**, including the new Requester 403 capture `artifacts/lab-04/screenshots/requester-dashboard/states/forbidden.png`; metadata identifies `L4-REQ-DASHBOARD`, `UI-05`, P8, AC-15/24, viewport 1280x720; its exact-source sidecar now records the committed implementation SHA. Expired-session remains separately captured as `session-expired.png`.

Fresh verification after adding Requester 403 behavior/evidence: `npm.cmd run verify` passed server **67/403**, Client **34/173**, harness **9+3**, Lab 3/Lab 4 planning traces, E2E **66/66**, and responsive **25/25**. `npm.cmd run test:trace:lab4 -- --mode=increment --issue=78` and `git diff --check` passed. The Requester forbidden screenshot was generated from assertion-backed 403 state; its exact-source sidecar is included in the commit-bound capture below.

### Issue #78 exact-source dashboard evidence capture

After implementation commit `632a16adb2591ee0dcbf232831c978b0fae981f6`, `npm.cmd run capture:evidence:lab4 -- issue78` produced `artifacts/lab-04/screenshots/issue78-632a16a/manifest.json` with **34 entries**. Every manifest entry's `sourceRevision` and `sourceSha` match the commit SHA. A focused rerun of `responsive-dashboards.spec.ts` and `dashboard-states.spec.ts` with `LAB4_EVIDENCE_ROOT=artifacts/lab-04/screenshots` and that explicit source SHA passed **22/22**; all 22 Requester/Staff/Admin dashboard PNG sidecars under their role folders match the same SHA. The files were byte-identical to the previously visually inspected PNGs; four representative images were inspected again. The separate broad responsive suite remains **25/25** from final aggregate verification.
