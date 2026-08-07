# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Chatgpt/Codex(Luna high)

## Selected key prompts (6–10)
| # | Prompt (summarised)                                           | What I did with the result                                       |
| - | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1 | Implement Issue #1 only and verify project foundation safely. | Completed README setup and verified the project foundation.      |
| 2 | Implement Issue #2 API health check only.                     | Added the health endpoint and Online/Offline status.             |
| 3 | Inspect Prisma and database before Issue #3.                  | Checked schema, migration state, and seed setup.                 |
| 4 | Implement Category model, migration, and idempotent seed.     | Created the model, migration, and repeatable seed data.          |
| 5 | Fix Prisma migration permission problem safely.               | Resolved the PostgreSQL `CREATEDB` permission issue.             |
| 6 | Implement Issue #4 category API and React UI.                 | Added category endpoint and displayed categories from the API.   |
| 7 | Review and verify the repository after each Issue.            | Checked tests, build, and acceptance criteria before committing. |
| 8 | Final integration and release verification.                   | Verified `lab1-staging` before creating the release PR.          |


## Reflection

My prompts became better when I first refined them with ChatGPT before giving them to Codex. I clearly stated the branch, acceptance criteria, files to inspect, verification steps, and out-of-scope work, which helped Codex avoid changing later Issues too early.

I also had to correct or reject some agent suggestions, such as using unsafe Prisma commands or assuming the database was ready without verification. I checked the Git diff, tests, migration status, and API results myself before accepting the work.
