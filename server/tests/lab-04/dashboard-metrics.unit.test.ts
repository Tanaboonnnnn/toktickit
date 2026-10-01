import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/errors.js";
import { parseTicketListQuery } from "../../src/ticket-query.js";
import { parseStaffTicketQuery } from "../../src/staff/staff-query.js";

const from = "2026-09-24T08:00:00.000Z";
const before = "2026-10-01T08:00:00.000Z";

for (const [role, parse] of [["Requester", parseTicketListQuery], ["Staff", parseStaffTicketQuery]] as const) {
  describe(`DASH-04 ${role} strict dashboard drill-down query`, () => {
    it("accepts active grouping with retained filters and deterministic ordering", () => {
      expect(parse({ statusGroup: "active", requestedPriority: "HIGH", page: "2", pageSize: "20" }))
        .toMatchObject({ statusGroup: "active", requestedPriority: "HIGH", page: 2, pageSize: 20,
          orderBy: [{ field: "updatedAt", direction: "desc" }, { field: "id", direction: "desc" }] });
    });

    it("normalizes an explicit offset resolved window to the same UTC instants", () => {
      expect(parse({ statusGroup: "resolved", resolvedFrom: "2026-09-24T15:00:00+07:00", resolvedBefore: before }))
        .toMatchObject({ statusGroup: "resolved", resolvedFrom: new Date(from), resolvedBefore: new Date(before) });
    });

    it.each([
      { statusGroup: "unknown" },
      { statusGroup: "active", currentStatus: "OPEN" },
      { statusGroup: "resolved" },
      { statusGroup: "resolved", resolvedFrom: from },
      { statusGroup: "resolved", resolvedBefore: before },
      { statusGroup: "active", resolvedFrom: from, resolvedBefore: before },
      { resolvedFrom: from, resolvedBefore: before },
      { statusGroup: "resolved", resolvedFrom: before, resolvedBefore: from },
      { statusGroup: "resolved", resolvedFrom: from, resolvedBefore: from },
      { statusGroup: "resolved", resolvedFrom: "yesterday", resolvedBefore: before },
      { statusGroup: "resolved", resolvedFrom: "2026-02-30T08:00:00Z", resolvedBefore: before },
      { statusGroup: "resolved", resolvedFrom: "2026-09-24T08:00:00", resolvedBefore: before },
      { statusGroup: ["active", "resolved"] },
      { statusGroup: "resolved", resolvedFrom: [from, from], resolvedBefore: before },
      { statusGroup: "resolved", resolvedFrom: from, resolvedBefore: [before, before] },
      { statusGroup: "active", userId: "1" },
    ])("rejects unsupported, contradictory, repeated or invalid bounds: %j", (input) => {
      expect(() => parse(input)).toThrow(ApiError);
      try { parse(input); } catch (error) {
        expect(error).toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
      }
    });

    it("rejects repeated URLSearchParams rather than silently choosing a scope", () => {
      expect(() => parse(new URLSearchParams("statusGroup=active&statusGroup=active"))).toThrow(ApiError);
    });
  });
}
