import { describe, expect, it } from "vitest";
import { parseTicketCreateBody } from "../../src/ticket-contract.js";
import { isReplayCompatible } from "../../src/ticket-idempotency.js";

const validBody = {
  clientRequestId: "c5404d4c-0b9b-4c52-9f3a-24872db6996f",
  categoryId: 12,
  relatedSystemId: 34,
  summary: "Cannot access email",
  requestedPriority: "HIGH",
  description: "Sign-in repeatedly returns an access denied message.",
};

const existingTicket = {
  requesterId: 7,
  categoryId: 12,
  relatedSystemId: 34,
  summary: "Cannot access email",
  requestedPriority: "HIGH" as const,
  description: "Sign-in repeatedly returns an access denied message.",
};

describe("UT-02 Ticket duplicate-request comparison", () => {
  it("treats the same requester and normalized logical content as replay-compatible", () => {
    const input = parseTicketCreateBody({
      ...validBody,
      summary: "  Cannot access email  ",
      description: "  Sign-in repeatedly returns an access denied message.  ",
    });

    expect(isReplayCompatible(existingTicket, 7, input)).toBe(true);
  });

  it.each([
    ["requester", { requesterId: 8 }],
    ["category", { categoryId: 99 }],
    ["related system", { relatedSystemId: 99 }],
    ["summary", { summary: "Different summary" }],
    ["priority", { requestedPriority: "LOW" as const }],
    ["description", { description: "A different valid description." }],
  ])("treats changed %s as a conflict", (_field, change) => {
    const input = parseTicketCreateBody(validBody);
    const ticket = { ...existingTicket, ...change };
    const requesterId = "requesterId" in change ? 7 : 7;

    expect(isReplayCompatible(ticket, requesterId, input)).toBe(false);
  });

  it("does not use clientRequestId itself as a content match", () => {
    const input = parseTicketCreateBody({
      ...validBody,
      clientRequestId: "f3a3dd41-9c5b-4c7a-9f2e-89d7be2dcb0f",
    });

    expect(isReplayCompatible(existingTicket, 7, input)).toBe(true);
  });
});
