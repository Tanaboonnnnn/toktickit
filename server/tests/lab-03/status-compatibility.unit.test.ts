import { describe, expect, it } from "vitest";
import { parseTicketListQuery } from "../../src/ticket-query.js";

const statuses = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
] as const;

describe("STATUS-01 requester query status compatibility", () => {
  it.each(statuses)("accepts %s as a currentStatus filter", (currentStatus) => {
    expect(parseTicketListQuery({ currentStatus }).currentStatus).toBe(currentStatus);
  });

  it("still rejects an unknown status safely", () => {
    expect(() => parseTicketListQuery({ currentStatus: "PENDING" })).toThrow();
  });
});
