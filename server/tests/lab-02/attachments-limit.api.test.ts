import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttachmentFixture, destroyAttachmentFixture, bytes, upload, type AttachmentFixture } from "./attachment-test-fixture.js";
let f: AttachmentFixture;
beforeAll(async () => { f = await createAttachmentFixture("api14"); }); afterAll(async () => { await destroyAttachmentFixture(f); });
describe("API-14 active Attachment limit", () => {
  it("allows five, rejects sixth, excludes removed, and allows replacement", async () => {
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) { const r = await upload(f, f.requesterA.id, f.ticketId, bytes.png, `a${i}.png`, "image/png"); expect(r.status).toBe(201); ids.push(r.body.attachment.id); }
    const sixth = await upload(f, f.requesterA.id, f.ticketId, bytes.png, "sixth.png", "image/png"); expect(sixth.status).toBe(409); expect(sixth.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
    const removed = await f.prisma.attachment.update({ where: { id: ids[0] }, data: { removedAt: new Date(), removalReason: "retired" } }); expect(removed.removedAt).not.toBeNull();
    const replacement = await upload(f, f.requesterA.id, f.ticketId, bytes.png, "replacement.png", "image/png"); expect(replacement.status).toBe(201);
  });
  it("serializes two concurrent uploads at four active rows", async () => {
    await f.prisma.attachment.deleteMany({ where: { ticketId: f.ticketId } });
    for (let i = 0; i < 4; i++) expect((await upload(f, f.requesterA.id, f.ticketId, bytes.jpeg, `c${i}.jpg`, "image/jpeg")).status).toBe(201);
    const results = await Promise.all([upload(f, f.requesterA.id, f.ticketId, bytes.jpeg, "race-a.jpg", "image/jpeg"), upload(f, f.requesterA.id, f.ticketId, bytes.jpeg, "race-b.jpg", "image/jpeg")]);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1); expect(results.filter((r) => r.status === 409)).toHaveLength(1);
    expect(await f.prisma.attachment.count({ where: { ticketId: f.ticketId, removedAt: null } })).toBe(5);
  });
});
