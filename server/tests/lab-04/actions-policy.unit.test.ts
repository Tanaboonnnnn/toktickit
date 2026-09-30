import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  parseActionListQuery,
  parseCreateActionBody,
  parseUpdateActionBody,
  parseActionStatusBody,
} from "../../src/actions/action-contract.js";
import { actionTransitionAllowed, isActiveActionParentStatus } from "../../src/actions/action-policy.js";

describe("UNIT-01 Action request policy", () => {
  it("normalizes a valid create request and keeps optimistic version out of business fields", () => {
    const clientRequestId = randomUUID();
    expect(parseCreateActionBody({
      clientRequestId,
      expectedTicketVersion: 7,
      description: "  Inspect uplink cable  ",
      result: "  Link is intermittent  ",
      assigneeId: 23,
      followUpRequired: true,
      followUpNote: "  Re-test after replacement  ",
      attachmentNotes: "  See cable-photo.png  ",
    })).toEqual({
      clientRequestId,
      expectedTicketVersion: 7,
      description: "Inspect uplink cable",
      result: "Link is intermittent",
      assigneeId: 23,
      followUpRequired: true,
      followUpNote: "Re-test after replacement",
      attachmentNotes: "See cable-photo.png",
    });
  });

  it("rejects spoofed immutable create fields and conditional validation failures", () => {
    expect(() => parseCreateActionBody({
      clientRequestId: randomUUID(), expectedTicketVersion: 1, description: "Inspect",
      followUpRequired: false, recordedById: 99,
    })).toThrowError(/validation/i);
    expect(() => parseCreateActionBody({
      clientRequestId: randomUUID(), expectedTicketVersion: 1, description: "Inspect",
      followUpRequired: true, followUpNote: "   ",
    })).toThrowError(/validation/i);
    expect(() => parseCreateActionBody({
      clientRequestId: randomUUID(), expectedTicketVersion: 1,
      description: "x".repeat(2001), followUpRequired: false,
    })).toThrowError(/validation/i);
  });

  it("requires both optimistic versions on edits and permits canonical no-op candidates", () => {
    expect(parseUpdateActionBody({
      expectedTicketVersion: 8,
      expectedActionVersion: 2,
      description: "  Re-tested port  ",
    })).toEqual({
      expectedTicketVersion: 8,
      expectedActionVersion: 2,
      description: "Re-tested port",
    });
    expect(() => parseUpdateActionBody({ expectedTicketVersion: 8, description: "x" })).toThrowError(/validation/i);
    expect(() => parseUpdateActionBody({ expectedTicketVersion: 8, expectedActionVersion: 2 })).toThrowError(/validation/i);
    expect(() => parseUpdateActionBody({
      expectedTicketVersion: 8, expectedActionVersion: 2, performedById: 9,
    })).toThrowError(/validation/i);
  });

  it("enforces completion and cancellation request requirements", () => {
    expect(parseActionStatusBody({
      expectedTicketVersion: 4,
      expectedActionVersion: 1,
      status: "COMPLETED",
      result: "  Connectivity restored  ",
      confirmation: true,
      followUpRequired: false,
      followUpNote: null,
      cancellationReason: null,
    })).toMatchObject({ status: "COMPLETED", result: "Connectivity restored", confirmation: true });
    expect(() => parseActionStatusBody({
      expectedTicketVersion: 4, expectedActionVersion: 1, status: "COMPLETED",
      result: " ", confirmation: true,
    })).toThrowError(/validation/i);
    expect(() => parseActionStatusBody({
      expectedTicketVersion: 4, expectedActionVersion: 1, status: "COMPLETED",
      result: "done", confirmation: false,
    })).toThrowError(/validation/i);
    expect(parseActionStatusBody({
      expectedTicketVersion: 4,
      expectedActionVersion: 1,
      status: "CANCELLED",
      confirmation: true,
      cancellationReason: "  Duplicate work  ",
    })).toMatchObject({ status: "CANCELLED", cancellationReason: "Duplicate work", confirmation: true });
    expect(() => parseActionStatusBody({
      expectedTicketVersion: 4, expectedActionVersion: 1, status: "CANCELLED",
      confirmation: true, cancellationReason: "x",
    })).toThrowError(/validation/i);
  });

  it("defines only the approved lifecycle edges and active parent states", () => {
    expect(actionTransitionAllowed("PENDING", "IN_PROGRESS")).toBe(true);
    expect(actionTransitionAllowed("PENDING", "COMPLETED")).toBe(true);
    expect(actionTransitionAllowed("PENDING", "CANCELLED")).toBe(true);
    expect(actionTransitionAllowed("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(actionTransitionAllowed("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(actionTransitionAllowed("COMPLETED", "IN_PROGRESS")).toBe(false);
    expect(actionTransitionAllowed("CANCELLED", "PENDING")).toBe(false);
    expect(actionTransitionAllowed("PENDING", "PENDING")).toBe(false);

    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const) {
      expect(isActiveActionParentStatus(status)).toBe(true);
    }
    for (const status of ["RESOLVED", "CLOSED", "CANCELLED"] as const) {
      expect(isActiveActionParentStatus(status)).toBe(false);
    }
  });

  it("parses bounded pagination strictly and rejects unknown/repeated query keys", () => {
    expect(parseActionListQuery({})).toEqual({ page: 1, pageSize: 20 });
    expect(parseActionListQuery({ page: "2", pageSize: "50" })).toEqual({ page: 2, pageSize: 50 });
    expect(() => parseActionListQuery({ pageSize: "51" })).toThrowError(/validation/i);
    expect(() => parseActionListQuery({ page: ["1", "2"] })).toThrowError(/validation/i);
    expect(() => parseActionListQuery({ status: "PENDING" })).toThrowError(/validation/i);
  });
});
