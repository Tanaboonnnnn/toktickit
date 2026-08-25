# TokTickIT

TokTickIT Lab 1 demonstrates a full-stack vertical slice with React + TypeScript
+ Vite + Bootstrap, Node.js + Express + TypeScript, Prisma + PostgreSQL, and
Vitest + Supertest. Its Lab 1 regression harness includes the `Check System`
control for checking backend health and loading the four IT request categories.

The current Lab 2 application flow starts with Development Requester Selection;
the legacy Lab 1 `Check System` control is not rendered in that normal flow.

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
npx prisma migrate status
```

`migrate deploy` applies the existing migration files; it does not create a new
migration. `prisma:seed` runs the configured idempotent Lab 2 seed, preserving the
four required Categories and creating the required Related Systems and Development
Requester fixtures used by the current requester-context flow.
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

## Tests

Run the existing test commands from each package directory:

```powershell
cd client
npm test

cd ..\server
npm test
```

## Lab 1 branch and review workflow

```text
feature branch -> lab1-staging -> main
```

Do not commit directly to `main` or `lab1-staging`. Implement each Issue on its
own feature branch, open feature Pull Requests against `lab1-staging`, and
require peer review and passing tests before merging. Release the completed
integration branch from `lab1-staging` to `main`.
