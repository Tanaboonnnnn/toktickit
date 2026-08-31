import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttachmentFixture, destroyAttachmentFixture, bytes, upload, type AttachmentFixture } from "./attachment-test-fixture.js";
let f: AttachmentFixture;
beforeAll(async () => { f = await createAttachmentFixture("api15"); }); afterAll(async () => { await destroyAttachmentFixture(f); });
describe("API-15 Attachment metadata", () => {
  it("returns active and removed metadata in createdAt/id order without internals", async () => {
    const first = await upload(f, f.requesterA.id, f.ticketId, bytes.png, "first.png", "image/png"); const second = await upload(f, f.requesterA.id, f.ticketId, bytes.pdf, "second.pdf", "application/pdf");
    await f.prisma.attachment.update({ where: { id: first.body.attachment.id }, data: { removedAt: new Date(), removalReason: "No longer needed" } });
    const before = (await f.prisma.ticket.findUniqueOrThrow({ where: { id: f.ticketId } })).updatedAt;
    const r = await import("supertest").then(({ default: req }) => req(f.app).get(`/api/tickets/${f.ticketId}/attachments`).set("X-Development-Requester-Id", String(f.requesterA.id)));
    expect(r.status).toBe(200); expect(r.body.items.map((x: { id: number }) => x.id)).toEqual([first.body.attachment.id, second.body.attachment.id]); expect(r.body.items[0]).toMatchObject({ state: "REMOVED", downloadUrl: null, removalReason: "No longer needed" }); expect(r.body.items[1]).toMatchObject({ state: "ACTIVE", downloadUrl: expect.stringContaining("/download") }); expect(JSON.stringify(r.body)).not.toMatch(/storedName|filesystem|uploads/i);
    expect((await f.prisma.ticket.findUniqueOrThrow({ where: { id: f.ticketId } })).updatedAt.getTime()).toBe(before.getTime());
  });
});
