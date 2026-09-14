# Lab 3 Issue and Dependency Plan

This file is the repository-resident concise plan approved in Issue #41. `Lab_3_sheet.pdf` and `specification.md` control product requirements. The downloadable Revision 2 plan remains background planning material; live GitHub issues are synchronized to this repository contract before implementation begins.

## Issue Map

| Issue | Deliverable | Hard dependency | Integration note |
|---|---|---|---|
| #41 | Engineering Contract / baseline / traceability | none | Current docs-only issue |
| #42 | Maintain shared verification harness + regression mapping | #41 peer-reviewed contract | One current build/test/E2E path; isolate test data, not the product |
| #43 | User/workflow schema migration, password primitives, seed/provisioning | #41, #42 | Add minimum eight-status/current-consumer compatibility when new data becomes visible |
| #44 | Authentication/session/authorization foundation | #43 | Foundation can be tested before application activation; does not declare legacy Requester flow converted |
| #45 | Authentication activation: backend Requester identity + Login/change-password/auth shell/transport | #44 | Atomic cross-layer cutover; after merge no Development Requester identity fallback |
| #46 | Complete authenticated Requester/Attachment regression | #45 | Audit all retained Ticket/Attachment behavior and remove obsolete runtime paths |
| #47 | Shared Staff Queue vertical slice | #46 | Shared queue API + responsive UI |
| #48 | Ticket operations: owner, IT Priority, status workflow | #47 | Explicit matrix + concurrency |
| #49 | Public Comments, Internal Notes, Requester resolution indication | #48 | Private-data projection boundary |
| #50 | Minimal Administrator User Management | #44, #45, #48 | Uses shared account/assignment concurrency rules |
| #51 | Integrated security/regression/migration/responsive verification | #46-#50 | Full candidate evidence |
| #52 | Review evidence, release to `main`, nine-part submission | #51 | Fresh final-main proof |

## Required Cross-Issue Gates

### Schema/status gate (#43)

Before multi-status seeded data becomes visible to normal screens, current API/client DTO/query/display code must accept all eight statuses. If the temporary Development Requester selector still exists before #45, it must list role `REQUESTER` accounts only. This prevents a schema/seed PR from creating an integrated app that cannot read its own fixtures.

### Authentication activation gate (#44 -> #45)

#44 builds and tests the authentication/session/authorization foundation. #45 is the activation increment that changes the existing Requester backend identity source and the existing frontend context/transport together. After #45 is integrated:

- no active Development Requester selector;
- no Change Requester action;
- no production identity authority from `X-Development-Requester-Id` or body `requesterId`;
- retained Requester screens have a usable real-login path;
- browser/E2E setup uses real sessions.

No required test is disabled merely to bridge the cutover.

## Branch Flow

```text
main
└── lab3-staging
    ├── feature/41-lab3-contract
    ├── feature/42-lab3-verification-harness
    ├── feature/43-lab3-user-migration
    ├── feature/44-lab3-auth-foundation
    ├── feature/45-lab3-auth-activation
    ├── feature/46-lab3-requester-regression
    ├── feature/47-lab3-staff-queue
    ├── feature/48-lab3-ticket-operations
    ├── feature/49-lab3-communication
    ├── feature/50-lab3-user-management
    ├── feature/51-lab3-integration-verification
    └── feature/52-lab3-release-evidence
```

Feature work is reviewed before merge to `lab3-staging`; final release is one reviewed `lab3-staging -> main` PR. No direct development commits on `main` or staging.

## Definition of Ready for Product Issues

- Applicable contract section is reviewed and unambiguous.
- Dependency PRs are actually integrated.
- AC/Test paths for the issue are present in `tests.md`.
- Test DB/upload/process safety is verified before read/write test execution.
- No unresolved cross-layer cutover contradiction is delegated to the coding agent.

## Issue #41 Stop Point

Issue #41 does **not** implement application features, apply migrations, seed/reset databases, install auth dependencies, merge its own PR, or claim peer approval. It ends with the synchronized engineering contract committed on the feature branch and a docs-only PR ready for a real peer review.
