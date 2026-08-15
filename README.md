# TokTickIT

TokTickIT Lab 1 demonstrates a full-stack vertical slice with React + TypeScript
+ Vite + Bootstrap, Node.js + Express + TypeScript, Prisma + PostgreSQL, and
Vitest + Supertest. A user can click `Check System` to check backend health and
load the four IT request categories from PostgreSQL through the backend API.

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
string. For example:

```text
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/toktickit?schema=public"
```

Keep real `.env` files private. The client defaults to `http://localhost:3000`
and can be changed with `VITE_API_URL` in `client/.env`.

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
migration. `prisma:seed` runs the configured idempotent seed and creates these
four categories: `Account and Access`, `Hardware`, `Software`, and `Network`.
`migrate status` checks the database connection and migration state after setup.
Do not use destructive commands such as `prisma migrate reset` or `prisma db
push` for this lab.

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
