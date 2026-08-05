# TokTickIT

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

## Safe Prisma checks

Run these from `server` after configuring `DATABASE_URL`:

```powershell
npx prisma validate
npx prisma generate
npx prisma migrate status
```

These commands validate or inspect the Prisma setup. `migrate status` checks the
database connection and migration state; it does not apply migrations.

## Tests

Run the existing test commands from each package directory:

```powershell
cd client
npm test

cd ..\server
npm test
```
