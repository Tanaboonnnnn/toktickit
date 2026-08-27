import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/errors.js";
import { parseTicketListQuery } from "../../src/ticket-query.js";

function invalid(input: Record<string, unknown>) {
  try {
    parseTicketListQuery(input);
    throw new Error("expected query to be rejected");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).code).toBe("VALIDATION_ERROR");
    return (error as ApiError).fieldErrors ?? {};
  }
}

describe("UT-04 My Tickets query parsing", () => {
  it("applies documented defaults and deterministic id desc tie ordering", () => {
    expect(parseTicketListQuery({})).toEqual({
      sortBy: "updatedAt",
      sortDirection: "desc",
      page: 1,
      pageSize: 10,
      orderBy: [
        { field: "updatedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    });
  });

  it("trims search and treats empty-after-trim as unrestricted", () => {
    expect(parseTicketListQuery({ search: "  email access  " }).search).toBe("email access");
    expect(parseTicketListQuery({ search: "   " })).not.toHaveProperty("search");
  });

  it("accepts the exact search maximum and rejects values above it", () => {
    expect(parseTicketListQuery({ search: "x".repeat(120) }).search).toHaveLength(120);
    expect(invalid({ search: "x".repeat(121) })).toHaveProperty("search");
  });

  it("validates category, enum filters, and sort allowlists", () => {
    expect(parseTicketListQuery({
      categoryId: "12",
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      sortBy: "summary",
      sortDirection: "asc",
    })).toMatchObject({
      categoryId: 12,
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      sortBy: "summary",
      sortDirection: "asc",
      orderBy: [
        { field: "summary", direction: "asc" },
        { field: "id", direction: "desc" },
      ],
    });
    expect(invalid({ categoryId: "0" })).toHaveProperty("categoryId");
    expect(invalid({ categoryId: "1.5" })).toHaveProperty("categoryId");
    expect(invalid({ requestedPriority: "URGENT" })).toHaveProperty("requestedPriority");
    expect(invalid({ currentStatus: "CLOSED" })).toHaveProperty("currentStatus");
    expect(invalid({ sortBy: "id" })).toHaveProperty("sortBy");
    expect(invalid({ sortDirection: "up" })).toHaveProperty("sortDirection");
  });

  it("validates page and permitted page sizes", () => {
    expect(parseTicketListQuery({ page: "3", pageSize: "20" })).toMatchObject({ page: 3, pageSize: 20 });
    expect(parseTicketListQuery({ pageSize: "50" }).pageSize).toBe(50);
    expect(invalid({ page: "0" })).toHaveProperty("page");
    expect(invalid({ page: "1.2" })).toHaveProperty("page");
    expect(invalid({ pageSize: "1" })).toHaveProperty("pageSize");
    expect(invalid({ pageSize: "25" })).toHaveProperty("pageSize");
  });

  it("rejects unknown and repeated scalar query parameters", () => {
    expect(invalid({ ticketNumber: "TKT-" })).toHaveProperty("ticketNumber");
    expect(invalid({ page: ["1", "2"] })).toHaveProperty("page");
    expect(invalid({ search: ["a", "b"] })).toHaveProperty("search");
  });
});
