# Lab 3 Baseline Record

Recorded during Issue #41 on 2026-09-14.

## Repository

- Repository: `https://github.com/Tanaboonnnnn/toktickit`
- Existing working folder: `/toktickit`
- Git remote: `origin -> https://github.com/Tanaboonnnnn/toktickit.git`
- Accepted Lab 3 starting `main` SHA after `git fetch origin --prune`: `729b73faf9e91983d91c2bc8be6c0aaecd864051`
- Local `main` and `origin/main` matched at that SHA before Issue #41 changes.
- Starting status before branch creation: `## main...origin/main` with no reported working-tree changes.
- `git diff --stat` and `git diff --check` produced no findings before Issue #41 changes.
- No root, server, or client `AGENTS.md` was found by direct read or tracked-file query at the starting SHA.
- `docs/lab-03/` did not exist at the starting SHA.
- `lab3-staging` did not exist locally or remotely before Issue #41.

## Lab 3 Branches Established by Issue #41

- `lab3-staging` was created from the accepted starting `main` SHA and pushed to `origin`.
- `feature/41-lab3-contract` was created from `lab3-staging` and is the only branch used for the Issue #41 document changes.
- No direct source/document commit was made on `main` or `lab3-staging`.

## Historical Lab 2 Boundary

The delivered Lab 2 history is preserved by Git. Lab 3 may modify current runtime source, tests, seed, configuration, README, and documentation in new feature commits where the new requirements require it. Issue #41 does not rewrite:

- applied historical migrations;
- historical Lab 2 commits/branches/PR evidence;
- `docs/lab-02/` evidence as a retrospective submission rewrite;
- `artifacts/lab-02/` screenshots as if they were Lab 3 evidence.

The previous Development Requester mechanism remains present at the starting SHA and is expected to be replaced by the approved Lab 3 authentication cutover; its presence at the baseline is not a Lab 3 completion claim.

## Relevant Starting-Code Observations

- Prisma model `RequesterUser` owns Tickets through `requesterId`.
- `TicketStatus` contains only `NEW` at the starting SHA.
- Requester-scoped server routes resolve `X-Development-Requester-Id`.
- `GET /api/development-requesters` returns active Development Requesters.
- Client API passes the Development Requester header and validates `currentStatus === "NEW"`.
- Client `App.tsx` boots through `RequesterContextProvider` and `RequesterSelection`.

These are baseline observations, not permanent Lab 3 requirements.

## Verification Provenance

The separate pre-implementation Readiness Audit recorded earlier baseline test/typecheck/Prisma evidence. Issue #41 does not relabel that earlier evidence as a new product test run. This docs-only Issue will record only commands actually executed on this branch, such as document/traceability consistency checks and `git diff --check`.

No migration, seed, destructive database operation, feature implementation, peer approval, PR merge, or final Lab 3 verification occurred when this baseline record was created.
