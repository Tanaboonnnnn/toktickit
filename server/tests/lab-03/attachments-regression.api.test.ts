import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { authenticatedAgent, bytes, createAttachmentFixture, csrf, destroyAttachmentFixture, origin, storageEntries, upload, type AttachmentFixture } from "../lab-02/attachment-test-fixture.js";

let fixture: AttachmentFixture;

beforeAll(async () => {
  fixture = await createAttachmentFixture("lab3-attachments");
});

afterAll(async () => {
  if (fixture) await destroyAttachmentFixture(fixture);
});

describe("ATT-01 / ATT-02 authenticated Attachment read boundaries", () => {
  it.each(["staff", "administrator"] as const)("allows %s read-only metadata/download on a shared Ticket", async (kind) => {
    const uploaded = await upload(fixture, fixture.requesterA.id, fixture.ticketId, bytes.pdf, `${kind}.pdf`, "application/pdf");
    expect(uploaded.status).toBe(201);
    const actor = kind === "staff" ? fixture.staff : fixture.administrator;
    const agent = await authenticatedAgent(fixture, actor);

    const metadata = await agent.get(`/api/tickets/${fixture.ticketId}/attachments`);
    expect(metadata.status).toBe(200);
    expect(metadata.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: uploaded.body.attachment.id, originalName: `${kind}.pdf`, state: "ACTIVE" }),
    ]));
    expect(JSON.stringify(metadata.body)).not.toMatch(/storedName|filesystem|uploads/i);

    const downloaded = await agent.get(`/api/tickets/${fixture.ticketId}/attachments/${uploaded.body.attachment.id}/download`);
    expect(downloaded.status).toBe(200);
    expect(Buffer.from(downloaded.body)).toEqual(bytes.pdf);
  });

  it.each(["staff", "administrator"] as const)("denies %s upload and removal even with valid CSRF", async (kind) => {
    const uploaded = await upload(fixture, fixture.requesterA.id, fixture.ticketId, bytes.png, `${kind}-deny.png`, "image/png");
    expect(uploaded.status).toBe(201);
    const actor = kind === "staff" ? fixture.staff : fixture.administrator;
    const agent = await authenticatedAgent(fixture, actor);
    const token = await csrf(agent);

    const uploadAttempt = await agent
      .post(`/api/tickets/${fixture.ticketId}/attachments`)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .attach("file", bytes.png, { filename: "not-allowed.png", contentType: "image/png" });
    expect(uploadAttempt.status).toBe(403);
    expect(uploadAttempt.body.error.code).toBe("FORBIDDEN");

    const removeAttempt = await agent
      .delete(`/api/tickets/${fixture.ticketId}/attachments/${uploaded.body.attachment.id}`)
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .send({ removalReason: "not permitted" });
    expect(removeAttempt.status).toBe(403);
    expect(removeAttempt.body.error.code).toBe("FORBIDDEN");
    expect((await fixture.prisma.attachment.findUniqueOrThrow({ where: { id: uploaded.body.attachment.id } })).removedAt).toBeNull();
  });
});

describe("ATT-03 authorization and CSRF checks before multipart staging", () => {
  it("does not create storage entries for unauthenticated, wrong-role, or CSRF-failed upload requests", async () => {
    const baseline = await storageEntries(fixture.root);

    const unauthenticated = await import("supertest").then(({ default: request }) => request(fixture.app)
      .post(`/api/tickets/${fixture.ticketId}/attachments`)
      .attach("file", bytes.png, { filename: "unauthenticated.png", contentType: "image/png" }));
    expect(unauthenticated.status).toBe(401);
    expect(await storageEntries(fixture.root)).toEqual(baseline);

    const staffAgent = await authenticatedAgent(fixture, fixture.staff);
    const staffToken = await csrf(staffAgent);
    const wrongRole = await staffAgent
      .post(`/api/tickets/${fixture.ticketId}/attachments`)
      .set("Origin", origin)
      .set("X-CSRF-Token", staffToken)
      .attach("file", bytes.png, { filename: "wrong-role.png", contentType: "image/png" });
    expect(wrongRole.status).toBe(403);
    expect(await storageEntries(fixture.root)).toEqual(baseline);

    const requesterAgent = await authenticatedAgent(fixture, fixture.requesterA);
    const missingCsrf = await requesterAgent
      .post(`/api/tickets/${fixture.ticketId}/attachments`)
      .set("Origin", origin)
      .attach("file", bytes.png, { filename: "missing-csrf.png", contentType: "image/png" });
    expect(missingCsrf.status).toBe(403);
    expect(missingCsrf.body.error.code).toBe("CSRF_INVALID");
    expect(await storageEntries(fixture.root)).toEqual(baseline);
  });
});
