import { describe, expect, it } from "vitest";
import { ApiError, safeErrorBody, validationError } from "../../src/errors.js";

describe("UT-08 safe API error serialization", () => {
  it("serializes documented ApiError fields without changing the safe envelope", () => {
    expect(safeErrorBody(
      validationError({ summary: "Summary is required" }),
      "Unable to create ticket",
    )).toEqual({
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          fieldErrors: { summary: "Summary is required" },
        },
      },
    });
  });

  it("maps unexpected errors to a generic 500 without exposing implementation details", () => {
    const unsafe = new Error(
      "PrismaClientKnownRequestError: SELECT secret from C:\\private\\db with password=hunter2",
    );
    const serialized = safeErrorBody(unsafe, "Unable to create ticket");

    expect(serialized).toEqual({
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "Unable to create ticket" } },
    });
    expect(JSON.stringify(serialized)).not.toMatch(/Prisma|SELECT|private|password|hunter2/i);
  });

  it("keeps explicit duplicate conflicts safe and structured", () => {
    expect(safeErrorBody(
      new ApiError(
        409,
        "DUPLICATE_REQUEST_CONFLICT",
        "clientRequestId was already used for a different request",
      ),
      "Unable to create ticket",
    )).toEqual({
      status: 409,
      body: {
        error: {
          code: "DUPLICATE_REQUEST_CONFLICT",
          message: "clientRequestId was already used for a different request",
        },
      },
    });
  });
});
