import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/errors.js";
import { parseTicketCreateBody } from "../../src/ticket-contract.js";

const validBody = {
  clientRequestId: "c5404d4c-0b9b-4c52-9f3a-24872db6996f",
  categoryId: 1,
  relatedSystemId: 2,
  summary: "Valid summary",
  requestedPriority: "HIGH",
  description: "A valid description with enough characters.",
};

function expectFieldError(body: Record<string, unknown>, field: string) {
  try {
    parseTicketCreateBody(body);
    throw new Error("expected validation to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    expect((error as ApiError).fieldErrors).toHaveProperty(field);
  }
}

describe("UT-01 Ticket validation and normalization", () => {
  it("accepts inclusive Summary and Description boundaries and trims both values", () => {
    const summary = `  ${"S".repeat(5)}  `;
    const description = `  ${"D".repeat(10)}  `;
    const result = parseTicketCreateBody({
      ...validBody,
      summary,
      description,
    });

    expect(result.summary).toBe("S".repeat(5));
    expect(result.description).toBe("D".repeat(10));

    expect(parseTicketCreateBody({
      ...validBody,
      summary: "S".repeat(120),
      description: "D".repeat(2000),
    })).toMatchObject({
      summary: "S".repeat(120),
      description: "D".repeat(2000),
    });
  });

  it.each([
    ["summary", "1234"],
    ["summary", "S".repeat(121)],
    ["description", "123456789"],
    ["description", "D".repeat(2001)],
    ["summary", "   "],
    ["description", " \t\n "],
  ])("rejects exact boundary violation for %s", (field, value) => {
    expectFieldError({ ...validBody, [field]: value }, field);
  });

  it("rejects invalid priorities and non-positive/non-integer reference IDs", () => {
    expectFieldError({ ...validBody, requestedPriority: "URGENT" }, "requestedPriority");
    expectFieldError({ ...validBody, categoryId: 0 }, "categoryId");
    expectFieldError({ ...validBody, categoryId: -1 }, "categoryId");
    expectFieldError({ ...validBody, relatedSystemId: 1.5 }, "relatedSystemId");
    expectFieldError({ ...validBody, relatedSystemId: "2" }, "relatedSystemId");
  });

  it("requires a valid UUID and all create fields", () => {
    expectFieldError({ ...validBody, clientRequestId: "not-a-uuid" }, "clientRequestId");
    expectFieldError({ ...validBody, clientRequestId: 123 }, "clientRequestId");
    expectFieldError({}, "clientRequestId");
    expectFieldError({ ...validBody, summary: undefined }, "summary");
  });

  it.each(["LOW", "MEDIUM", "HIGH"])("accepts priority %s", (requestedPriority) => {
    expect(parseTicketCreateBody({ ...validBody, requestedPriority }).requestedPriority)
      .toBe(requestedPriority);
  });

  it("accepts a valid UUID without imposing a version-specific restriction", () => {
    expect(parseTicketCreateBody({
      ...validBody,
      clientRequestId: "018f2b4d-6d4e-7abc-8def-0123456789ab",
    }).clientRequestId).toBe("018f2b4d-6d4e-7abc-8def-0123456789ab");
  });
});
