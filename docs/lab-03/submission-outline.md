# Lab 3 Submission Outline - Answer Part 1 to Answer Part 9

This file is an evidence map only. The student originally deferred PDF creation during Issue #52, then later asked to proceed after final repository evidence synchronization. Build the PDF only from verified repository/GitHub/CI evidence rather than rewriting events from memory.

## Answer Part 1 - Git Use and Engineering Workflow (10)

- Issues #41-#52 and their linked feature PRs.
- `lab3-staging` integration chronology, PR #66 final evidence sync, PR #68 release-security correction, and reviewed release PR #67 to `main`.
- Real peer-review received evidence from `reviewer.md`.
- Real peer-review-given evidence when supplied.
- Product-release `main` SHA `dad3746328f71b2873e0d90495c49aa483855d5b`, exact-main CI run #15, and truthful board/Issue state. If a later documentation-only promotion creates a newer `main` SHA, the PDF records both roles clearly instead of rewriting the tested product-release SHA.

## Answer Part 2 - Specification DD (5)

- `specification.md` with Sprint Goal, Stakeholder Request, Scope, FR, BR, UI summary, Data Changes, API contract, AC, DoD, assumptions/decisions.
- Authorization and status-transition matrices.
- Evidence that the contract existed before feature implementation.

## Answer Part 3 - Test DD and Traceability (10)

- `tests.md` 50 Test IDs and 32 AC mappings.
- Migration/seed/regression/security/UI/E2E evidence paths.
- TRACE-01 output and exact-main run #15 results: server **51/285**, client **25/136**, Chromium **37/37**, responsive **10/10**, plus the 41-image capture.

## Answer Part 4 - AI Use and Reflection (5)

- `ai-use.md` selected 6-10 real prompts/interactions.
- Student's own `My Reflection`; AI must not invent personal learning/reflection. This remains the only content item that requires direct student authorship/confirmation before the final PDF is frozen.

## Answer Part 5 - Login and Password Change UI (5)

- Login, invalid/inactive/busy/failure, mandatory Change Password, authenticated role display, Logout and protected-access denial.
- Playwright screenshots and E2E-01 evidence.

## Answer Part 6 - IT Staff Ticket Queue (5)

- Shared Queue, search/filter/sort/pagination, assigned/unassigned/mine scope and states.
- Desktop/tablet/mobile screenshots.

## Answer Part 7 - IT Staff Ticket Detail (10)

- Claim/reassign, IT Priority, formal workflow, Public Comments, Internal Notes, Attachments and Requester resolution indication.
- Direct backend authorization/privacy evidence plus Staff Detail screenshots.

## Answer Part 8 - Administrator User Management (5)

- Minimal safe list/search/filter/create/edit/activation/reset scope.
- Duplicate/self/last-admin/assigned-owner safety and forbidden-role evidence.
- User Management screenshots.

## Answer Part 9 - Zen Green and Responsive Evidence (5)

- Rendered `ui-spec.md` excerpt/summary as required by the handout.
- SHA-labelled Playwright screenshot manifest.
- Desktop `1440x900`, Tablet `834x1112`, Mobile `390x844` screenshots of the nine major screens.
- Targeted state screenshots for mandatory Change Password, Attachments, Public/Internal communication, Requester resolution indication, filtered Staff Queue, Staff claim/resolve controls, Administrator create/edit/reset/safety, and inactive-account safe failure.
- GitHub Actions `Lab 3 CI` exact-main artifact `lab3-ui-evidence-dad3746328f71b2873e0d90495c49aa483855d5b` from run #15, plus any later documentation-only final delivery CI if applicable.
- Visual checklist: consistency, role navigation, badges, editable/read-only distinction, validation/focus, clipping/overlap/horizontal overflow.

## Final provenance rule

The final PDF may quote/link only evidence that actually occurred. Release-PR approval, product-release main SHA/results and review-given proof are now verified. `My Reflection` remains student-owned, and any later documentation-only promotion SHA/result must be taken from the real GitHub event after it occurs rather than predicted here.
