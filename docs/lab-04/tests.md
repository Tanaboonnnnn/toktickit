# Lab 4 Test DD Plan

Status: **Issue #75 Ticket workflow increment in progress. HAR-01..HAR-03, MIG-01..MIG-03, SEED-01, UNIT-01, API-01..API-06, and RACE-01..RACE-03 have executed evidence recorded below. FLOW-01..FLOW-05, RACE-04, RACE-05, UI-03, and E2E-02 remain `Planned / Not run` until their Issue #75 executable checks run on the relevant source SHA. All Dashboard/#76/release Test IDs remain future work.**

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
| FLOW-01 | Unit/API | AC-10 | Evaluate all 64 Ticket source/destination pairs plus role/owner/text/confirmation guards | Only documented matrix edges pass | `server/tests/lab-04/ticket-workflow.unit.test.ts`, `ticket-workflow.api.test.ts` | Planned / Not run |
| FLOW-02 | API | AC-11 | Resolution with zero/pending/mixed/all-cancelled/completed/follow-up combinations | Only qualifying current-cycle state resolves | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not run |
| FLOW-03 | API | AC-12 | Requester advisory indication and Action completion | Neither silently changes formal Ticket status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not run |
| FLOW-04 | API | AC-13 | Legacy close and repeated reopen cycles | Legacy remains valid; new cycle demands new qualifying work | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned / Not run |
| FLOW-05 | API | AC-09, AC-14 | Ticket cancellation fan-out and workflow-event order | Outstanding current-cycle Actions cancel atomically; history append-only | `server/tests/lab-04/workflow-history.api.test.ts` | Planned / Not run |
| RACE-04 | Concurrent API | AC-09, AC-11 | Resolve versus Action create/complete/follow-up edit in both serialization orders | Final DB always satisfies resolution invariant or remains unresolved | `server/tests/lab-04/ticket-resolution-concurrency.api.test.ts` | Planned / Not run |
| RACE-05 | Concurrent API | AC-09, AC-14 | Ticket cancel versus child Action mutation / injected failure | No partial child/history cancellation survives rollback | `server/tests/lab-04/ticket-resolution-concurrency.api.test.ts` | Planned / Not run |
| UI-01 | Component | AC-02, AC-03, AC-05 | Staff Actions list/create/edit/assign/start/complete/cancel; distinct recorder/assignee/performer labels; conditional fields | Correct controls, labels, validation, authoritative server result | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned / Not run |
| UI-02 | Component | AC-06, AC-14 | Requester all-items read-only Actions/history/privacy | All public Actions reachable; no mutation/Internal Notes | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned / Not run |
| UI-03 | Component | AC-10, AC-11, AC-24 | Ticket permitted transitions/blocker feedback and unrelated draft retention | Backend-guided controls; blocked resolution clear; drafts preserved | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned / Not run |
| UI-04 | Component | AC-07, AC-08, AC-24 | Ambiguous POST replay, stale edit reconciliation, cross-form draft lifetime | Same logical key retained; no silent overwrite/draft loss | `client/tests/lab-04/ActionsTaken.test.tsx`, `action-drafts.test.tsx` | Planned / Not run |
| DASH-01 | Unit/API | AC-15, AC-17 | Requester counts/previews, zero data, two-requester ownership isolation | Exact own-only metrics/previews | `server/tests/lab-04/requester-dashboard.api.test.ts`, `dashboard-metrics.unit.test.ts` | Planned / Not run |
| DASH-02 | API | AC-16, AC-17 | Staff/Admin metrics and current-user Action recorder/assignee/performer OR predicate | Exact counts; one Action matching multiple actor roles is deduplicated once with complete attribution | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned / Not run |
| DASH-03 | API/SQL | AC-17 | Fixed-clock lower/upper time boundary, RESOLVED/CLOSED, reopened, independent SQL | `[from,before)` and status predicates exactly match SQL | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned / Not run |
| DASH-04 | API | AC-17, AC-18 | Strict combined filters, card->list equality beyond first page, stable ties | `totalItems` equals card count; unsupported queries rejected | `server/tests/lab-04/dashboard-drilldown.api.test.ts` | Planned / Not run |
| DASH-05 | API/Auth | AC-15, AC-16, AC-24 | Wrong role/session, forged/unknown query, injected safe failure | No protected data leak; safe error contract | `server/tests/lab-04/requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts` | Planned / Not run |
| UI-05 | Component | AC-15, AC-17, AC-24 | Requester Dashboard values/previews/loading/empty/forbidden/failure | No fake zero during load/fail; retry and drill-down correct | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned / Not run |
| UI-06 | Component | AC-16, AC-17, AC-24 | Staff/Admin Dashboard, current-user Actions, malformed DTO/failure states | Correct operational values and safe states | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned / Not run |
| UI-07 | Component | AC-18, AC-21 | Role homes, exact windows, refresh/Back/Forward, deep Action target, identity race | URL context preserved and stale private responses discarded | `client/tests/lab-04/DashboardNavigation.test.tsx` | Planned / Not run |
| PERF-01 | Performance smoke | AC-17 | Fixed ~1k Tickets/~3k Actions, warmups + 20 dashboard measurements, query/payload budget | Bounded query count/payload and approved local p95 smoke threshold | `server/tests/lab-04/dashboard-performance.integration.test.ts` | Planned / Not run |
| SEC-01 | API/security | AC-06, AC-21, AC-23 | Integrated auth/role/ownership/CSRF/nested-ID/Internal-Note privacy matrix | Direct requests enforce backend authorization/non-disclosure | `server/tests/lab-04/security-regression.api.test.ts` | Planned / Not run |
| SAFE-01 | API/UI | AC-24 | Safe unknown server failure and rejected Attachment download/client promise | No internal leak/unhandled client rejection; recoverable state preserved | `server/tests/lab-04/safe-errors.api.test.ts`, `client/tests/lab-04/safe-failures.test.tsx` | Planned / Not run |
| STYLE-01 | Style | AC-25 | Zen Green tokens, editable/read-only/private/shared/state conventions | Consistent text-bearing accessible visual semantics | `client/tests/lab-04/zen-green-styles.test.tsx` | Planned / Not run |
| A11Y-01 | Component/browser/manual | AC-25 | Labels/errors/keyboard/focus/busy/disabled semantics + final manual inspection | Operable without mouse; visible focus and associated errors | `client/tests/lab-04/accessibility.test.tsx`, `e2e/lab-04/final-regression.spec.ts`, `docs/lab-04/ui-spec.md` | Planned / Not run |
| RESP-01 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 1440x900 | No clipping/overlap/page overflow; readable controls | `e2e/lab-04/responsive-desktop.spec.ts` | Planned / Not run |
| RESP-02 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 834x1112 | Tablet reflow remains usable/readable | `e2e/lab-04/responsive-tablet.spec.ts` | Planned / Not run |
| RESP-03 | Browser/visual | AC-25 | Major Lab 4 screens + long content at 390x844 | Mobile actions/content remain accessible without page overflow | `e2e/lab-04/responsive-mobile.spec.ts` | Planned / Not run |
| E2E-01 | E2E | AC-02, AC-05, AC-06, AC-07 | Different recorder/assignee/completing performer actors, lifecycle, denied writes, Requester visibility, lost-success retry | Complete Action journey with one logical create and truthful performer attribution | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned / Not run |
| E2E-02 | E2E | AC-09, AC-10, AC-11, AC-12, AC-13, AC-14 | Ticket lifecycle, resolution gate/follow-up, close/reopen/cancel/history | Complete documented lifecycle and audit behavior | `e2e/lab-04/ticket-resolution.spec.ts` | Planned / Not run |
| E2E-03 | E2E | AC-15, AC-16, AC-17, AC-18 | Requester + Staff dashboards, actual metrics, card/list/detail/back/deep-link | UI reflects backend predicates and preserves context | `e2e/lab-04/dashboards.spec.ts` | Planned / Not run |
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

## 12. Issue #75 Ticket workflow kickoff record

Issue #75 starts from a fresh fetch of `origin/lab4-staging` at exact SHA `6ced65026bc91804363108588e708f0445f3eb65` in dedicated clean worktree `.worktrees/feature-75-lab4-ticket-workflow`. Live GitHub showed Issue #75 open with no existing feature branch/PR; the preserved dirty Lab 3 root and completed Issue #74 worktree were not reset, stashed, cleaned, deleted, or reused.

Before Issue #75 product edits, Prisma Client generation succeeded and the focused retained/current workflow baseline passed **4 files / 33 tests**: Lab 3 Ticket workflow/concurrency plus Lab 4 Actions API/concurrency. This is startup baseline evidence only; no Issue #75 Test ID is promoted to Pass by that run.

Issue #75 owns the next TDD waves for `FLOW-01..FLOW-05`, `RACE-04`, `RACE-05`, `UI-03`, and `E2E-02`. Each row stays `Planned / Not run` until its actual test exists and has been observed RED for missing Issue #75 behavior, then GREEN on the implementation.
