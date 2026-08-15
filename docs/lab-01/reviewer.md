# Lab 1 — Peer Review Record

**Author:** Tanboon Teawsawat — 67070507211 — GitHub: @Tanaboonnnnn

**Peer reviewers:**
- พลัฏฐ์ อมาตย์ชยาภา — 67070507212 — GitHub: @L0u1sss
- ฌาธนัชย์ อุทัยพิบูลย์ — 67070507210 — GitHub: @Chxtamos

## Pull Requests I Authored

| PR | Branch | Reviewer verdict |
|---|---|---|
| [PR #5](https://github.com/Tanaboonnnnn/toktickit/pull/5) | `feature/1-project-foundation` | Approved |
| [PR #6](https://github.com/Tanaboonnnnn/toktickit/pull/6) | `feature/2-health-check` | Approved |
| [PR #7](https://github.com/Tanaboonnnnn/toktickit/pull/7) | `feature/3-category-seed` | Approved |
| [PR #8](https://github.com/Tanaboonnnnn/toktickit/pull/8) | `feature/4-category-list` | Approved |

## Reviewer Comments I Received

### @Chxtamos

> ถูกตรงตาม Issue 1 ทุกอย่าง ผล Test: React, Bootstrap, Express, PostgreSQL และ Prisma  
> `npm run test` ผ่านปกติ ไม่มีปัญหา

### @L0u1sss

> React + TypeScript + Vite, Bootstrap, Node.js + Express + TypeScript ลงเรียบร้อย  
> เชื่อม PostgreSQL ได้  
> Prisma schema validation แล้ว  
> Vitest และ Supertest ถูกต้อง  
> มี `.gitignore` และ `.env.example` แล้ว  
> `.env` และ `node_modules` ไม่โผล่บน GitHub  
> มี README setup ตามงานปัจจุบัน

## My Response

> ขอบคุณที่สละเวลามารีวิวงานครับ ผมตรวจสอบเรียบร้อยและ merge เข้า `lab1-staging` แล้วครับ

## Pull Requests I Reviewed for My Partner
https://github.com/L0u1sss/TokTickIT/pull/6

### My Review Comment

**จุดที่เรียบร้อยแล้ว**

- Backend `/api/health` เปลี่ยนเป็น HTTP 200
- JSON response ถูกต้อง
- มีการเรียก API จริงด้วย `fetch`
- มี loading state
- มี success/error state
- มีข้อความแจ้งเตือนเมื่อ backend ใช้งานไม่ได้

**จุดที่ต้องแก้ไข**

1. **มีการจัดการ categories เกินขอบเขต Issue 2**  
   ไฟล์: `client/src/App.tsx`  
   Issue 2 ควรจัดการเฉพาะ Health Check แต่ไฟล์นี้ยังมีการจัดการข้อมูล categories ซึ่งเป็นงานของ Issue 4

2. **เรียก `setCategories(result.categories)`**  
   ไฟล์: `client/src/App.tsx`  
   บรรทัดนี้อยู่ใน scope ของ Issue 4 ควรนำออกจาก PR ของ Issue 2

3. **แสดงรายการด้วย `categories.map(...)`**  
   ไฟล์: `client/src/App.tsx`  
   ส่วนนี้เป็น Category List UI ของ Issue 4 จึงควรแยกออก

4. **คืนค่า `categories: []` แบบไม่ตรงกับการทำงานจริง**  
   ไฟล์: `client/src/api.ts`  
   `checkSystem()` เรียกเฉพาะ `/api/health` แต่ยังคืนค่า categories ควรแยก flow นี้ไป Issue 4

5. **ข้อความสถานะไม่ตรงกับ Lab Sheet**  
   ไฟล์: `client/src/App.tsx`  
   ควรใช้ข้อความ:
   - `System Status: Online`
   - `System Status: Offline`

## Partner's Response

### @L0u1sss

> แก้แล้วลูกพี่ PR อีกรอบหน่อย