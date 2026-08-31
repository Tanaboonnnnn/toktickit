import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttachmentFixture, destroyAttachmentFixture, bytes, upload, type AttachmentFixture } from "./attachment-test-fixture.js";
let f: AttachmentFixture;
beforeAll(async () => { f = await createAttachmentFixture("api12"); }); afterAll(async () => { await destroyAttachmentFixture(f); });
describe("API-12 Attachment type validation", () => {
  it.each([
    ["archive.zip", "application/zip", bytes.pdf], ["photo.png", "image/jpeg", bytes.jpeg],
    ["photo.jpg", "image/jpeg", Buffer.from("not jpeg")], ["renamed.pdf", "application/pdf", bytes.png],
  ])("rejects invalid media %s", async (name, mime, data) => {
    const response = await upload(f, f.requesterA.id, f.ticketId, data, name, mime);
    expect(response.status).toBe(415); expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    expect(JSON.stringify(response.body)).not.toMatch(/storedName|filesystem|uploads|Prisma|SQL/i);
  });
  it("leaves no metadata after type failures", async () => {
    expect(await f.prisma.attachment.count({ where: { ticketId: f.ticketId } })).toBe(0);
  });
});
