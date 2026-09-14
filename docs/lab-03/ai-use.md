# Lab 3 AI Use and Reflection

## Assistant used

ChatGPT, GPT-5.6 Sol, with repository, GitHub, and course-file tools available in the project environment.

## Selected key prompts

The course record calls for 6–10 selected prompts. The entries below are faithful concise records of actual AI-assisted Lab 3 work completed so far; they are not claimed to be verbatim transcripts. Additional entries are added only after the corresponding work actually occurs.

| # | Prompt name | Actual prompt text or faithful concise copy | Purpose / result | Short reflection |
|---:|---|---|---|---|
| 1 | Lab 3 engineering contract and Issue #41 preparation | “เริ่มเฉพาะงานเตรียมและ Engineering Contract ของ Lab 3 ใน Issue #41 โดยยึด `Lab_3_sheet.pdf` และข้อกำหนดอาจารย์เป็นหลัก ... ตรวจ repository เดิม, `AGENTS.md` ถ้ามี, Git status และ GitHub ล่าสุด ... แก้ความขัดแย้งระหว่างไฟล์แผนกับ Issues #41–#52 ... จัดทำเอกสารใน `docs/lab-03/` ... รอบนี้ยังไม่ implement ฟีเจอร์ ไม่ใช้ migration เปลี่ยนฐานข้อมูล ไม่ reset ข้อมูล และไม่ merge PR.” | Inspected the current repository/Git/GitHub state, created the Lab 3 staging and Issue #41 feature branches, reconciled the Lab 3 issue plan with the handout, drafted the Sprint 3 contract/traceability documents, and opened the docs-only PR #53 for real peer review. No Lab 3 product feature or database migration was implemented by this prompt. | Contract-first work exposed two sequencing risks before code was written: new status data must be readable when introduced, and authentication must be activated across backend identity and frontend transport together rather than leaving a mixed-version application. |

## Current reflection

Issue #41 has been used only to establish the Lab 3 engineering contract and planning authority. The main correction from the first planning draft was to treat Lab 3 as a forward increment of the existing TokTickIT repository rather than a second clone-only product. The contract also separates requirements stated by `Lab_3_sheet.pdf` from project decisions such as the exact session mechanism, password policy constants, status-transition edges, and concurrency rules. PR #53 is open for peer review; no peer approval or merge is claimed yet, and all Lab 3 Test DD rows remain `Planned / Not run` until their implementation work actually occurs.

AI has been used so far for repository inspection, planning reconciliation, contract drafting, traceability design, and consistency checking. The output remains subject to student ownership: compare the documents against the Lab 3 handout, review the design decisions, and record only real implementation, test, migration, build, and peer-review results. The final submission's personal “My Reflection” remains the student's own reflection and is not fabricated here.

## Human ownership and decisions

The reviewed `docs/lab-03` contract is intended to become the Lab 3 source of truth after real peer review. Human/project decisions recorded so far are:

- TokTickIT Lab 3 continues the existing Lab 2 repository/product; historical Lab 2 evidence and applied migrations remain historical, while current source/tests/seed/configuration may evolve in new Lab 3 commits.
- `Lab_3_sheet.pdf` is the primary stakeholder/product-owner source for Sprint 3. Revision 2 and the readiness audit are supporting planning records, not replacements for the handout.
- New Ticket statuses must not be exposed before the integrated runtime can read and display them correctly.
- Authentication is split into a backend foundation increment followed by one cross-layer activation increment; after activation there is no Development Requester selector/header/body identity authority or test-only impersonation fallback in the normal application.
- The authorization matrix, exact Ticket transition edges, session/password constants, and optimistic-concurrency rules are documented as project decisions where the handout intentionally leaves design choices open.
- Only tests, migrations, reviews, approvals, and merges that actually occur may be promoted from planned/pending language to completed evidence.

AI assistance does not own these engineering decisions, and this record does not claim that a human manually authored text or code generated with AI assistance.
