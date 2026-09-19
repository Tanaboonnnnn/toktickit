# TokTickIT

TokTickIT Lab 1 demonstrates a full-stack vertical slice with React + TypeScript
+ Vite + Bootstrap, Node.js + Express + TypeScript, Prisma + PostgreSQL, and
Vitest + Supertest. Its Lab 1 regression harness includes the `Check System`
control for checking backend health and loading the four IT request categories.

Lab 3 activates real email/password authentication across the existing Requester
application. The Lab 2 Development Requester selector/header identity mechanism is
retired from the active application; Requester ownership now comes from the
server-authenticated session.

## Lab 3 authenticated Requester flow

1. Sign in with an active TokTickIT User account.
2. If the account has an initial password, complete the mandatory Change Password flow before opening normal app screens.
3. Create a Ticket with active Category and Related System data.
4. Add permitted JPG/JPEG, PNG, WEBP, or PDF Attachments.
5. Open My Tickets and search, filter, sort, and page through only the authenticated Requester's Tickets.
6. Open Ticket Detail, download active Attachments, and soft-remove an Attachment with a required reason.
7. Use Change Password when needed; the shell shows the authenticated User name and role.
8. Logout to invalidate the server session. Direct/protected Requester routes require authentication again after logout.

`X-Development-Requester-Id`, browser `requesterId` authority, Development Requester
Selection, and Change Requester are not part of the post-#45 application contract.

## Prerequisites

- Node.js and npm
- PostgreSQL running locally or on an accessible server
- Git

## Configure the environment

From the repository root, copy the example environment files:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Edit `server/.env` and set `DATABASE_URL` to your own PostgreSQL connection
string. Lab 2 integration tests also require a separate PostgreSQL database through
`TEST_DATABASE_URL`. Lab 3 authentication additionally requires the exact frontend
origin and a private session-signing secret of at least 32 characters. For example:

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit_test?schema=public"
FRONTEND_ORIGIN="http://localhost:5173"
SESSION_SECRET=""
```

Do not reuse the placeholder above as a real secret. The checked-in
`server/.env.example` intentionally leaves `SESSION_SECRET` empty so a copied file
fails closed until a unique local value is supplied. The authentication cookie is
`HttpOnly` and `SameSite=Lax`; it is automatically `Secure` for HTTPS origins. Plain
HTTP authentication is accepted only for loopback development origins such as
`localhost` / `127.0.0.1`. Keep `SESSION_SECRET` out of Git, documentation,
screenshots, issues, and Pull Requests.

Create the `toktickit_test` database (or another dedicated test database) before
running the server test suite. Using pgAdmin or another PostgreSQL administrator,
create an empty database, for example with `CREATE DATABASE toktickit_test;`, then
set `TEST_DATABASE_URL` to that database. It must use a different database name from
`DATABASE_URL`; the Lab 2 integration tests fail closed rather than falling back to
development data. API-19 creates and drops a temporary schema inside that dedicated
test database to prove migration from a clean schema.

Keep real `.env` files private. Never point `TEST_DATABASE_URL` at development or
production data. The client defaults to `http://localhost:3000` and can be changed
with `VITE_API_URL` in `client/.env`.

## Install and run the frontend

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Install and run the backend

In a second terminal:

```powershell
cd server
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default. On Windows PowerShell,
use `npm.cmd` instead of `npm` if script execution is blocked.

## Prepare the database

Run these commands from `server` after configuring `DATABASE_URL`:

```powershell
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run provision:migrated-users
npx prisma migrate status
```

`migrate deploy` applies the existing migration files; it does not create a new
migration. The current Lab 3 migration evolves the existing Lab 2 data in place;
do not reset or recreate the database to simulate an upgrade.

`prisma:seed` runs the repeat-safe Lab 3 seed. It preserves existing edited User
credentials, roles, activation state, and Ticket workflow state while creating any
missing safe local fixtures required by Lab 3: Requester, IT Staff, and Administrator
accounts, reference data, and mixed Ticket/status/comment/note examples. On a clean
local database, newly created seed Users receive one-time initial passwords printed
only to that local terminal and the database stores only Argon2id hashes.

`provision:migrated-users` is specifically for Requesters that already existed before
the Lab 3 migration and therefore still have `passwordHash=null`. It generates a
one-time random initial password, prints it once to the local terminal, stores only
the Argon2id hash, keeps `mustChangePassword=true`, and skips accounts that were
already provisioned. Treat printed initial passwords as local-only credentials: do
not commit them, copy them into documentation, screenshots, issues, or Pull Requests,
or share them outside the intended local handoff.

Rerunning either seed or migrated-Requester provisioning must not rotate an existing
credential or reset edited role/activation/workflow state. A provisioning rerun that
finds no unprovisioned migrated Requester may legitimately report zero changes.
`migrate status` checks the database connection and migration state after setup.
Do not use destructive commands such as `prisma migrate reset` or `prisma db
push` for this lab.

For a fresh clone, apply the checked-in migrations to the dedicated test database
once before running the complete server suite. From `server`, temporarily point
Prisma at the same URL you placed in `TEST_DATABASE_URL`:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit_test?schema=public"
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
Remove-Item Env:DATABASE_URL
```

After removing the temporary shell override, `npm.cmd test` reads both
`DATABASE_URL` and `TEST_DATABASE_URL` from `server/.env`. API-19 additionally
creates a fresh temporary schema inside the dedicated test database and drops it
afterward, so its clean-migration evidence does not reset either configured
database.

### Reviewer / fresh-clone Lab 3 DB verification

The Lab 3 migration and seed integration tests intentionally require **both**
`DATABASE_URL` and `TEST_DATABASE_URL`. This is a fail-closed safety check: the
tests compare the two database identities before any mutation and refuse to run if
the dedicated test database is missing or could be the development database. Do
not remove or bypass this guard just to make the tests start.

For a fresh clone or peer-review machine, use this minimal setup from the repository
root:

```powershell
Copy-Item server/.env.example server/.env
```

Edit `server/.env` so both URLs contain credentials that work on that machine and
use different database names. `DATABASE_URL` is used by these focused tests for the
database-identity safety comparison; the migration/seed fixtures themselves are
created only inside temporary schemas in the dedicated `TEST_DATABASE_URL` database.
Create that test database first if it does not exist.

Then run from `server`:

```powershell
npm.cmd install
npx.cmd prisma generate
npm.cmd run test:lab3-review
```

`test:lab3-review` runs the password unit tests plus the Issue #43 migration and
seed integration suites. The DB-backed suites create uniquely named temporary
schemas under `TEST_DATABASE_URL` and drop those schemas after the run; they do not
migrate, seed, reset, or drop the database named by `DATABASE_URL`.

For Issue #44 authentication/session/authorization review, run from `server`:

```powershell
npm.cmd run test:lab3-auth-review
npm.cmd run build
```

`test:lab3-auth-review` exercises the real PostgreSQL-backed Supertest session/CSRF
fixtures plus login, mandatory password change, logout/revocation/expiry, bounded
login throttling, Origin/CORS policy, and direct backend role/resource authorization.
It requires the same distinct `DATABASE_URL` / `TEST_DATABASE_URL` safety setup.

For Issue #45 cross-layer authentication-activation review, run from the repository root:

```powershell
npm.cmd run test:lab3-auth-activation-review
```

This focused reviewer gate builds both applications, runs the Issue #44 auth/security
foundation together with the post-#45 authenticated Requester activation API tests,
runs Login/Change Password/AuthShell/status client tests, and executes the real-browser
`E2E-01` Login -> mandatory password change -> Requester app -> Logout journey. The
exhaustive retained Ticket/Attachment regression remains owned by Issue #46 as mapped
in `docs/lab-03/regression-map.md`; the focused command is not a substitute for the
final product-wide `verify` gate.

## Tests

Install the root Playwright test dependency and Chromium once from the repository root:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

The browser tests use the same dedicated `TEST_DATABASE_URL` described above, start isolated API/client processes on test-only ports, and use temporary Attachment storage. Do not point the test database at development or production data.

Run the package test suites:

```powershell
cd client
npm test

cd ..\server
npm test
```

Run the managed Lab 2 browser verification from the repository root:

```powershell
npm.cmd run test:e2e
npm.cmd run test:responsive
```

`test:e2e` runs the current Chromium E2E suite, collecting retained/evolved specs under `e2e/lab-02/` and Lab 3 specs under `e2e/lab-03/` as they are added. `test:responsive` runs the current Desktop (`1440×900`), Tablet (`834×1112`), and Mobile (`390×844`) responsive specs. Current screenshots write under `artifacts/lab-03/screenshots/` so submitted Lab 2 evidence is not overwritten. The supported scripts own API/client startup and cleanup; direct `npx playwright test` does not start those services. Run `npm.cmd run verify` for the aggregate current-suite gate.

## Lab 1 branch and review workflow

```text
feature branch -> lab1-staging -> main
```

Do not commit directly to `main` or `lab1-staging`. Implement each Issue on its
own feature branch, open feature Pull Requests against `lab1-staging`, and
require peer review and passing tests before merging. Release the completed
integration branch from `lab1-staging` to `main`.

## Lab 2 branch and release workflow

```text
feature branch -> lab2-staging -> integrated release-candidate verification
-> one reviewed release Pull Request -> main
```

Do not commit directly to `main` or `lab2-staging`. Merge each Lab 2 feature
through a reviewed Pull Request into `lab2-staging`, freshly verify the integrated
staging head, then open one release Pull Request from `lab2-staging` to `main`.
Merge that release Pull Request only after review approval and rerun the final
verification on `main` after merge.

## Lab 3 branch, verification, and release workflow

```text
feature branch -> lab3-staging -> integrated release-candidate verification
-> reviewed lab3-staging-to-main release Pull Request -> main
-> fresh exact-main verification + Playwright evidence capture
```

Lab 3 continues the same TokTickIT product. Do not create a second application,
rewrite historical Lab 2 migrations/evidence, or commit directly to `main` or
`lab3-staging`. Feature PRs target `lab3-staging`; the final release uses one
reviewed PR from `lab3-staging` to `main`.

From the repository root, use the aggregate gate:

```powershell
npm.cmd run verify
```

The fresh worktree setup must run `npx.cmd prisma generate --schema prisma/schema.prisma`
inside `server` after dependency installation. Database-backed checks require the
same distinct `DATABASE_URL` / `TEST_DATABASE_URL` safety configuration described
above; do not point tests at development data.

For deterministic release screenshots from the integrated Lab 3 Playwright journey:

```powershell
npm.cmd run capture:evidence:lab3 -- release-candidate
```

The capture command records the current Git SHA in a manifest and requires **41 PNGs**:
nine major screens each at Desktop `1440x900`, Tablet `834x1112`, and Mobile
`390x844` (**27 major responsive screenshots**) plus **14 targeted state screenshots**
covering mandatory password change, Attachment success/detail, Public versus Internal
communication, Requester resolution indication, filtered Staff Queue, Staff ownership/
workflow confirmation, Administrator create/edit/reset/safety feedback, and inactive-login
safe failure. Each manifest entry records role, route, scenario, viewport, and Test-ID/
rubric mapping. After the reviewed release PR merges, check out the exact delivered
`main` SHA and rerun the same command with the `final-main` label. Final-main
verification and screenshots are evidence of the delivered commit; they are never
claimed before that merge actually occurs.

For Pull Requests, exact-head evidence is produced by CI rather than committed back
into the same branch. Committing a generated screenshot set would itself create a new
HEAD and immediately make the embedded source SHA stale. The workflow therefore checks
out `pull_request.head.sha`, passes that SHA to the capture command, and fails if
`git rev-parse HEAD` does not match it. Reviewers should use the newest successful
`lab3-ui-evidence-<PR-head-SHA>` artifact for exact-head visual proof.

For course/instructor browsing, Issue #52 also keeps one **repository-visible evidence
snapshot** under `artifacts/lab-03/screenshots/issue-52/repository-evidence-<source-sha>/`.
That directory is intentionally committed so opening the GitHub repository is enough to
see all 41 screenshots and their metadata. Its manifest records the application-source
SHA that produced the images; the following evidence-only commit may have a different
HEAD because it adds the PNG/metadata files themselves. No application code is allowed
to change between that source SHA and the repository-evidence container commit. CI still
provides the separate exact-current-PR-head artifact described above.

### GitHub Actions CI for Lab 3

`.github/workflows/lab3-ci.yml` runs on pull requests targeting `lab3-staging` or
`main`, and on pushes to those two integration branches. The Linux job provisions
PostgreSQL with separate development/test database identities, installs all three
lockfile scopes, generates Prisma Client, deploys migrations and local-only seed data
to the dedicated test database, installs Chromium, captures the 41-image SHA-labelled
UI evidence set, and runs the complete `npm run verify` gate. The UI evidence folder is
uploaded as a GitHub Actions artifact named with the exact evidence-source SHA; Playwright
diagnostics are uploaded on failure. CI credentials are ephemeral test values, not
repository or personal secrets.
