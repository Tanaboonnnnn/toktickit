import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/errors.js";
import {
  TicketNumberCollisionError,
  createTicketNumber,
  withTicketNumberRetry,
} from "../../src/ticket-number.js";

describe("UT-03 Ticket Number generation", () => {
  it("uses the backend UTC date and the required uppercase alphanumeric format", () => {
    const number = createTicketNumber(
      new Date("2026-08-23T23:30:00.000-05:00"),
      () => "4Z8Q2M",
    );

    expect(number).toBe("TKT-20260824-4Z8Q2M");
    expect(number).toMatch(/^TKT-\d{8}-[A-Z0-9]{6}$/);
  });

  it("retries a Ticket Number collision with fresh candidates and succeeds", async () => {
    const candidates = ["AAAAAA", "BBBBBB", "CCCCCC"];
    const attempted: string[] = [];

    const result = await withTicketNumberRetry(
      async (candidate) => {
        attempted.push(candidate);
        if (attempted.length < 3) throw new TicketNumberCollisionError();
        return candidate;
      },
      () => createTicketNumber(new Date("2026-08-23T09:30:00.000Z"), () => candidates[attempted.length]),
    );

    expect(result).toBe("TKT-20260823-CCCCCC");
    expect(attempted).toEqual([
      "TKT-20260823-AAAAAA",
      "TKT-20260823-BBBBBB",
      "TKT-20260823-CCCCCC",
    ]);
  });

  it("stops after five candidates and exposes only a safe internal error", async () => {
    let attempts = 0;

    await expect(withTicketNumberRetry(
      async () => {
        attempts += 1;
        throw new TicketNumberCollisionError();
      },
      () => createTicketNumber(new Date("2026-08-23T09:30:00.000Z"), () => "ZZZZZZ"),
    )).rejects.toBeInstanceOf(ApiError);

    expect(attempts).toBe(5);
    try {
      await withTicketNumberRetry(
        async () => { throw new TicketNumberCollisionError(); },
        () => createTicketNumber(new Date("2026-08-23T09:30:00.000Z"), () => "ZZZZZZ"),
      );
    } catch (error) {
      expect((error as ApiError).status).toBe(500);
      expect((error as ApiError).code).toBe("INTERNAL_ERROR");
      expect((error as ApiError).message).toBe("Unable to create ticket");
    }
  });
});
