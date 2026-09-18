# Issue #52 Repository-Visible UI Evidence

This folder exists so the instructor/reviewer can inspect the Lab 3 screenshots directly from GitHub without downloading a GitHub Actions artifact.

Current repository-visible snapshot:

- `repository-evidence-6452f4d/`
- rendered application source SHA: `6452f4df2fdbe091ff378a0e35d60f6e4a180dd0`
- capture result: **41 PNGs** = **27 major responsive screens + 14 state screenshots**
- required viewports: Desktop `1440x900`, Tablet `834x1112`, Mobile `390x844`
- every PNG has a sibling `.meta.json`; `manifest.json` records the full source SHA and all role/route/scenario/viewport/Test-ID/rubric mappings.

This corrective snapshot replaces the earlier PR #64 course-facing set that exposed technical fixture identifiers such as `issue51-...` in visible account names. The current evidence uses realistic human display names/product content while keeping technical uniqueness internal to the tests. The capture helper now rejects known fixture-token patterns if they leak into visible text or entered form values.

The commit that contains this directory is intentionally an **evidence-only follow-up commit**. The screenshots were rendered from the clean source SHA above before the PNG/metadata files were added to Git. Therefore the repository-visible snapshot is not claimed to be self-referential proof of its own container commit.

For exact current Pull Request HEAD proof, use the newest successful GitHub Actions artifact named `lab3-ui-evidence-<PR-head-SHA>`. CI checks out the real `pull_request.head.sha` and fails if the evidence capture sees a different Git SHA.

## Major responsive screens

Each required viewport contains these nine screens:

1. Login
2. Requester My Tickets
3. Requester Create Ticket
4. Requester Ticket Detail
5. Change Password
6. Requester Forbidden feedback
7. IT Staff Ticket Queue
8. IT Staff Ticket Detail
9. Administrator User Management

Browse them under `major/desktop-1440x900/`, `major/tablet-834x1112/`, and `major/mobile-390x844/`.

## State evidence

The `states/` directory additionally captures mandatory password change, inactive-login safe failure, Requester Attachment success/detail, Public-vs-Internal communication, Internal Note non-leakage to Requester, Problem Appears Resolved confirmation, Staff Queue filter/pagination, unassigned Claim, formal Resolve confirmation, Administrator Create/Edit/Initial Password reset, self-deactivation safety, and assigned-owner safety.
