import { describe, expect, it } from "vitest";
import { normalizeCommunicationBody, resolutionIndicationAllowed } from "../../src/communication/communication-contract.js";

describe("COM-03 communication policy", () => {
  it("trims and counts Unicode code points for communication bodies", () => {
    expect(normalizeCommunicationBody("  hello 👋  ")).toBe("hello 👋");
    expect(() => normalizeCommunicationBody("   ")).toThrow();
    expect(() => normalizeCommunicationBody("🙂".repeat(2001))).toThrow();
  });

  it("allows Requester indication only in the approved formal states", () => {
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const) {
      expect(resolutionIndicationAllowed(status)).toBe(true);
    }
    for (const status of ["RESOLVED", "CLOSED", "CANCELLED"] as const) {
      expect(resolutionIndicationAllowed(status)).toBe(false);
    }
  });
});
