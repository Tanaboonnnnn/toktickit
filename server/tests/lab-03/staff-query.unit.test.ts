import { describe, expect, it } from "vitest";
import { parseStaffTicketQuery } from "../../src/staff/staff-query.js";

describe("QUEUE-01 Staff Ticket Queue query contract", () => {
  it("uses the documented defaults and deterministic id-desc tie breaker", () => {
    expect(parseStaffTicketQuery({})).toEqual({
      owner: "all",
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

  it("normalizes every supported filter and sort option", () => {
    expect(parseStaffTicketQuery(new URLSearchParams({
      search: "  wifi  ",
      categoryId: "7",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      itPriority: "LOW",
      owner: "me",
      sortBy: "itPriority",
      sortDirection: "asc",
      page: "3",
      pageSize: "20",
    }))).toMatchObject({
      search: "wifi",
      categoryId: 7,
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      itPriority: "LOW",
      owner: "me",
      sortBy: "itPriority",
      sortDirection: "asc",
      page: 3,
      pageSize: 20,
    });
    expect(parseStaffTicketQuery({ owner: "unassigned" }).owner).toBe("unassigned");
    expect(parseStaffTicketQuery({ owner: "42" }).owner).toBe(42);
  });

  it.each([
    [{ unexpected: "1" }, "unexpected"],
    [{ search: ["a", "b"] }, "search"],
    [{ search: "x".repeat(121) }, "search"],
    [{ categoryId: "0" }, "categoryId"],
    [{ currentStatus: "PENDING" }, "currentStatus"],
    [{ requestedPriority: "URGENT" }, "requestedPriority"],
    [{ itPriority: "URGENT" }, "itPriority"],
    [{ owner: "someone" }, "owner"],
    [{ sortBy: "summary" }, "sortBy"],
    [{ sortDirection: "sideways" }, "sortDirection"],
    [{ page: "0" }, "page"],
    [{ pageSize: "25" }, "pageSize"],
  ])("rejects invalid or ambiguous query values %#", (input, field) => {
    expect(() => parseStaffTicketQuery(input as Record<string, unknown>)).toThrowError(
      expect.objectContaining({ status: 400, code: "VALIDATION_ERROR", fieldErrors: expect.objectContaining({ [field]: expect.any(String) }) }),
    );
  });
});
