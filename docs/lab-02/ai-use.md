# Lab 2 AI Use and Reflection

## Assistant used

OpenAI Codex, a GPT-5-based coding agent. The environment did not expose a more specific model/deployment identifier, so none is claimed.

## Selected key prompts

The course record calls for 6–10 selected prompts. The entries below are faithful concise records of the actual AI-assisted Lab 2 work; they are not claimed to be verbatim transcripts.

| # | Prompt name | Actual prompt text or faithful concise copy | Purpose / result | Short reflection |
|---:|---|---|---|---|
| 1 | Lab 2 engineering contract and test plan | “Act as the specification/design agent for CPE334 TokTickIT Lab 2. Inspect the repository and feature branch first; create only the six `docs/lab-02` specification/evidence files; define the fixed Requester ticketing scope, data model, REST behavior, Zen Green responsive UI, 37-or-more observable concerns, complete test traceability, and run a consistency audit. Do not implement, migrate, commit, push, or fabricate evidence.” | Codex inspected the Lab 1 stack/conventions and drafted the six Lab 2 documents with explicit requirements, rules, acceptance criteria, API/data/UI contracts, planned tests, and evidence placeholders. | The prompt's fixed values, exclusions, branch guard, required structures, and audit checklist substantially reduced ambiguity. The remaining engineering choices still needed to be labeled as student decisions rather than presented as handout facts. |
| 2 | Lab 2 implementation planning | “Inspect the approved Lab 2 contract and plan Issue #14 without implementing APIs or frontend behavior yet.” | Codex inspected the repository, mapped the contract to Issue #14 increments, separated schema foundation from later Ticket/Attachment product behavior, and identified the required evidence gates. | Contract-first scope control prevented later Lab 3 behavior from leaking into Issue #14. |
| 3 | Database/schema/seed TDD | “Proceed with only the database/schema/seed TDD increment; require an isolated `TEST_DATABASE_URL`, add one additive migration, and prove deterministic idempotent seed behavior.” | Codex planned and implemented API-19 evidence, including the dedicated test-database guard, additive Lab 2 migration, deterministic seed, repeated-seed checks, and RED/GREEN verification. | Test-database isolation and ownership-aware cleanup were required before treating database evidence as trustworthy. |
| 4 | Reference data API | “Proceed with only the Reference Data API TDD increment.” | Codex implemented and tested API-01 active filtering, endpoint-specific deterministic ordering, complete response evidence, and safe error handling. API-02 was intentionally deferred because no real requester-scoped production endpoint existed yet. | Deferring API-02 avoided inventing a fake authentication or requester-scoped endpoint. |
| 5 | Development Requester context | “Proceed with only the Development Requester client-context TDD increment.” | Codex implemented and tested ID-only `sessionStorage`, restoration and invalidation, Requester switching/reset boundaries, and explicit non-authentication semantics. | The selected Requester is a temporary testing context, not proof of identity or authentication. |
| 6 | Requester selection and application shell | “Proceed with only the Development Requester Selection and Application Shell TDD increment.” | Codex implemented and tested UI-01/UI-02 loading, empty, failure, Retry, selection, switching, Zen Green foundation, accessibility semantics, and a disabled future My Tickets affordance. | The shell establishes Issue #14 context without pretending that later Ticket screens exist. |
| 7 | Audit/remediation and evidence preparation | “Perform a strict final audit, then remediate only the approved Issue #14 findings and prepare truthful evidence.” | Codex strengthened fixture cleanup safety and complete-response ordering evidence, removed misleading `aria-current`, aligned the shell breakpoint to `<768px`, and prepared the verified tests/documentation record. | Findings outside Issue #14 scope were preserved as deferred rather than changed opportunistically. |
| 8 | Peer-review remediation | “Verify the Request changes feedback against the repository and fix only confirmed Issue #14 defects.” | AI-assisted review verified the feedback against the actual tests/code, removed the legacy Lab 1 Check System control from the Lab 2 flow, strengthened UI-01/UI-02 evidence, made API-19 prove migration from a fresh temporary schema in the isolated test database, and documented fresh-clone test-database setup. | Review feedback was checked technically before editing; documentation claims were narrowed or strengthened so `Pass` evidence matches what the tests actually prove. |
| 9 | Issue #18 Ticket Creation API | “Proceed with only the next scoped Lab 2 Ticket Creation API TDD increment. Implement requester-scoped `POST /api/tickets`, validation, backend Ticket Numbers, idempotent replay/conflict/concurrency behavior, safe failures, and only the planned tests; do not implement later Ticket-list, Detail, Attachment, UI, or authentication behavior.” | Codex wrote the planned UT-01, UT-02, UT-03, UT-08, API-02, API-03, API-04, API-05, and API-06 tests in test-first slices, implemented the minimum requester boundary and Ticket-create service, ran the focused and full server/client verification, and updated only the corresponding evidence statuses. | The implementation stayed behind the planned verification boundary; the concurrent uniqueness race, replay-before-reference validation, safe malformed-JSON handling, and no-partial-row retry were treated as explicit evidence rather than assumed from a happy-path create. |

## Current reflection

AI was used for repository inspection, implementation planning, contract traceability, schema/API/client implementation assistance, test design, verification, audit, and evidence drafting. The output remains subject to student ownership: compare the documents against the Lab 2 handout, review all design decisions, and record only real implementation, test, build, migration, and review results. No CI link, peer approval, or future test outcome has been invented.

## Human ownership and decisions

The merged `docs/lab-02` contract remained the source of truth. Human decisions recorded during this work were:

- Development Requester is a temporary testing context, not authentication.
- API-02 was deferred instead of inventing a fake requester-scoped endpoint.
- Ticket and Attachment models were allowed only as the schema foundation required by the approved single additive Lab 2 migration; later Ticket/Attachment product behavior remains out of Issue #14.
- No Redux, Zustand, Axios, or React Router dependency was added.
- Test-database isolation was required before database TDD and verification.
- Audit findings outside Issue #14 scope were intentionally deferred.
- Only tests that existed, executed, and passed were promoted from Planned to Pass.

AI assistance did not own these engineering decisions, and this record does not claim that the human manually authored code that was generated with AI assistance.
