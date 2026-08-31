import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttachmentFixture, destroyAttachmentFixture, bytes, upload, type AttachmentFixture } from "./attachment-test-fixture.js";
let f: AttachmentFixture;
beforeAll(async () => { f = await createAttachmentFixture("api13"); }); afterAll(async () => { await destroyAttachmentFixture(f); });
describe("API-13 Attachment size validation", () => {
  it("rejects an empty file", async () => { const r = await upload(f, f.requesterA.id, f.ticketId, Buffer.alloc(0), "empty.pdf", "application/pdf"); expect(r.status).toBe(400); expect(r.body.error.code).toBe("VALIDATION_ERROR"); });
  it("accepts exactly 5,242,880 bytes with a valid PDF signature", async () => { const data = Buffer.concat([bytes.pdf, Buffer.alloc(5_242_880 - bytes.pdf.length)]); const r = await upload(f, f.requesterA.id, f.ticketId, data, "boundary.pdf", "application/pdf"); expect(r.status).toBe(201); });
  it("rejects 5,242,881 bytes with 413 and no metadata", async () => { const data = Buffer.concat([bytes.pdf, Buffer.alloc(5_242_881 - bytes.pdf.length)]); const r = await upload(f, f.requesterA.id, f.ticketId, data, "oversized.pdf", "application/pdf"); expect(r.status).toBe(413); expect(r.body.error.code).toBe("PAYLOAD_TOO_LARGE"); expect(await f.prisma.attachment.findFirst({ where: { originalName: "oversized.pdf" } })).toBeNull(); });
});
