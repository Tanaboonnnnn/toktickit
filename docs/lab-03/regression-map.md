# Lab 3 Regression Map

Issue #41 establishes the disposition model. Issue #42 performs the exhaustive per-file/per-case inventory and executes the safe baseline. Historical Lab 2 test results remain historical; current Lab 3 claims require current execution.

Disposition values:

- **Retain** — requirement remains materially unchanged; run/update only setup/types needed by Lab 3.
- **Evolve** — same product capability remains but identity/status/role expectation changes.
- **Replace** — Lab 2-only mechanism is intentionally removed and receives explicit Lab 3 replacement coverage.

| Lab 2 Test ID / family | Disposition | Lab 3 requirement | Planned owner / replacement |
|---|---|---|---|
| UT-01 Ticket validation | Retain | Summary/description/priority validation remains | #46 `requester-regression.api.test.ts` + existing unit test maintained |
| UT-02 Ticket idempotency | Retain/Evolve | Same replay/conflict plus no operational-state reset | #46 REQ-03 + maintained existing unit test |
| UT-03 Ticket Number | Retain | Backend unique official number remains | #46 maintained existing test |
| UT-04 Ticket query | Evolve | Same list contract plus eight statuses | #43 minimum status compatibility; #46 STATUS-01 |
| UT-05/UT-06 Attachment rules | Retain | Attachment rules unchanged | #46 ATT-01 + maintained existing tests |
| UT-07 Development Requester context | Replace | Real authentication/current-user/session replaces selector/sessionStorage | #45 UI-01/AuthShell/routes + E2E-01 |
| UT-08 safe error serializer | Retain/Evolve | Same no-leak principle plus auth/session cases | #51 SAFE-01 + maintained existing test |
| API-01 reference data + Development Requesters | Split | Category/Related System retained; Development Requester endpoint removed after auth activation | #46 retained reference checks; #45 auth/current-user replacement |
| API-02 Requester header errors | Replace | Missing/invalid auth + spoofing resistance | #44/#45 AZ-01; #46 REQ-02 |
| API-03..API-10 Ticket create/list/detail | Retain/Evolve | Same capability with session-derived Requester and eight statuses | #45 activation setup; #46 REQ-01..03/STATUS-01 |
| API-11..API-18 Attachment lifecycle | Retain/Evolve | Same lifecycle under auth/CSRF/resource checks | #46 ATT-01..03 |
| API-19 migration/seed | Evolve | Populated forward migration and Lab 3 repeat-safe seed/provisioning | #43 MIG/SEED tests |
| API-20 all-endpoint failures | Retain/Evolve | Safe failure across new auth/staff/admin APIs | #51 SAFE-01 |
| UI-01 Requester Selection | Replace | Login/current-user bootstrap | #45 `Login.test.tsx`, `AuthShell.test.tsx` |
| UI-02 Requester Switcher | Replace | Logout/login identity transition and stale-state clearing | #45 AuthShell/E2E-01; #46 UI-02 |
| UI-03..UI-05 Create Ticket | Retain/Evolve | Same form/idempotency/Attachment behavior with authenticated identity | #46 UI-02/E2E-02 plus maintained existing tests |
| UI-06..UI-07 My Tickets | Evolve | Same states/controls plus all statuses | #46 UI-02/E2E-02 |
| UI-08 Ticket Detail | Evolve | Authenticated ownership + Public Comments/indication later | #46 UI-02; #49 UI-05 |
| UI-09 Attachment Panel | Retain/Evolve | Same Requester lifecycle under authenticated transport | #46 UI-02/E2E-02 |
| UI-10 accessibility | Retain/Extend | Same conventions across all new screens | #51 A11Y-01 |
| STYLE-01..03 Zen Green/responsive states | Retain/Extend | Same design system across Lab 3 screens | #51 STYLE-01/A11Y-01/RESP-01..03 |
| STYLE-04 no Staff/Comments controls | Replace selectively | Lab 3 intentionally adds Public Comments and role-specific Staff UI; Requester still must not see Internal Notes/staff mutations | #49 privacy UI/API + #51 security matrix |
| RESP-01..03 | Retain/Extend | Same evidence viewports, now all major Lab 3 screens | #51 RESP-01..03 |
| E2E-01 Requester selector/create/switch | Replace/Evolve | Real login -> Requester create/list/isolation | #45 E2E-01 + #46 E2E-02 |
| E2E-02..E2E-06 Requester/Ticket/Attachment | Retain/Evolve | Same user value through authenticated identity | #46 E2E-02 plus maintained relevant specs |
| E2E-07 accessibility/failure | Retain/Extend | Same quality/security expectations across Lab 3 | #51 A11Y/SAFE/security-boundaries |

## Rules for Updating Existing Tests

1. Do not keep `X-Development-Requester-Id` or a selector test bypass after #45 just to keep an old test green.
2. Do not delete still-valid validation, idempotency, ownership, Attachment, safe-error, responsive, or accessibility assertions.
3. A changed expectation must cite the changed Lab 3 FR/BR/AC or a proven test defect.
4. Tests under `lab-02` may be edited/moved when they are part of the current product suite; Git history preserves their historical Lab 2 version.
5. `docs/lab-02/` and submitted Lab 2 evidence are not rewritten to pretend the new behavior existed earlier.
6. #42 completes exact file/case/command mapping before feature implementation relies on this map.
