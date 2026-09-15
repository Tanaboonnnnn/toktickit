# TokTickIT

TokTickIT Lab 1 demonstrates a full-stack vertical slice with React + TypeScript
+ Vite + Bootstrap, Node.js + Express + TypeScript, Prisma + PostgreSQL, and
Vitest + Supertest. Its Lab 1 regression harness includes the `Check System`
control for checking backend health and loading the four IT request categories.

The current Lab 2 application flow starts with Development Requester Selection;
the legacy Lab 1 `Check System` control is not rendered in that normal flow.

## Lab 2 requester flow

1. Select a seeded Development Requester.
2. Create a Ticket with active Category and Related System data.
3. Add permitted JPG/JPEG, PNG, WEBP, or PDF Attachments.
4. Open My Tickets.
5. Search, filter, sort, and page through Tickets owned by the selected Requester.
6. Open Ticket Detail.
7. Download active Attachments.
8. Soft-remove an Attachment with a required reason; its Removed metadata remains visible.
9. Change Development Requester and confirm that requester-owned data is isolated.

The selector and `X-Development-Requester-Id` header are temporary Lab 2 testing
context, not authentication.

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
`TEST_DATABASE_URL`. For example:

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
TEST_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit_test?schema=public"
```

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
