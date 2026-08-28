import { describe, expect, it } from "vitest";
import { assertAttachmentCapacity, countActiveAttachments, validateRemovalReason } from "../../src/attachment-contract.js";

describe("attachment business rules", () => {
  it("counts only active rows and enforces the five-active boundary", () => {
    const rows = [{ removedAt: null }, { removedAt: new Date() }, { removedAt: null }, { removedAt: null }, { removedAt: null }, { removedAt: null }];
    expect(countActiveAttachments(rows)).toBe(5);
    expect(countActiveAttachments(rows.slice(0, 5))).toBe(4);
    expect(countActiveAttachments(rows)).toBeLessThanOrEqual(5);
    expect(() => assertAttachmentCapacity(4)).not.toThrow();
    expect(() => assertAttachmentCapacity(5)).toThrow(/five active/i);
  });

  it("trims valid reasons and enforces 3..200 characters", () => {
    expect(validateRemovalReason("  okay  ")).toBe("okay");
    expect(validateRemovalReason("abc")).toBe("abc");
    expect(validateRemovalReason("x".repeat(200))).toHaveLength(200);
    expect(() => validateRemovalReason("ab")).toThrow();
    expect(() => validateRemovalReason("x".repeat(201))).toThrow();
    expect(() => validateRemovalReason("   ")).toThrow();
  });
});
