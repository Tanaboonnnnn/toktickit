import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as prismaModule from "../../src/prisma.js";
import { agentFor, createActionsFixture, destroyActionsFixture, type ActionsFixture } from "./support/actions-fixture.js";

let fixture: ActionsFixture;
let measured: PrismaClient;
let observing = false;
let businessQueries: string[] = [];
beforeAll(async () => {
  fixture = await createActionsFixture(); // Existing guard proves distinct DB identities before any mutation.
  await fixture.prisma.ticket.createMany({ data: Array.from({ length: 1000 }, (_, i) => ({
    ticketNumber: `DASH-PERF-${randomUUID()}`, clientRequestId: randomUUID(),
    requesterId: i < 700 ? fixture.normalRequester.id : fixture.requester.id,
    ownerId: i % 3 === 0 ? null : fixture.staff.id,
    categoryId: fixture.categoryId, relatedSystemId: fixture.relatedSystemId,
    summary: `Controlled dashboard ticket ${i}`, description: "Test-owned performance fixture",
    requestedPriority: "LOW" as const, itPriority: "HIGH" as const,
    currentStatus: i % 3 === 0 ? "WAITING_FOR_REQUESTER" as const : "OPEN" as const,
  })) });
  const tickets = await fixture.prisma.ticket.findMany({ where: { categoryId: fixture.categoryId }, select: { id: true }, orderBy: { id: "asc" } });
  fixture.ticketIds.push(...tickets.map((ticket) => ticket.id));
  await fixture.prisma.actionTaken.createMany({ data: Array.from({ length: 3000 }, (_, i) => ({
    ticketId: tickets[i % tickets.length].id, recordedById: fixture.staff.id, assigneeId: fixture.extraStaff.id,
    updatedById: fixture.staff.id, description: `Controlled dashboard Action ${i}`, status: "PENDING" as const,
    clientRequestId: randomUUID(), createFingerprint: `test-owned-${randomUUID()}`,
  })) });
  const queryClient = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  measured = queryClient;
  queryClient.$on("query", (event) => {
    if (!observing) return;
    // Prisma transaction controls and the existing requireActor User lookup are
    // excluded. Session-store SQL uses the separate retained pg connection.
    if (/^(BEGIN|COMMIT|ROLLBACK|SET TRANSACTION)\b/i.test(event.query.trim())) return;
    if (event.query.includes('"mustChangePassword"') && event.query.includes('"authVersion"')) return;
    businessQueries.push(event.query);
  });
  vi.spyOn(prismaModule, "getPrisma").mockReturnValue(measured);
}, 120_000); // Bounded fixture construction; this is not the per-request budget.
afterAll(async () => {
  observing = false;
  vi.restoreAllMocks();
  await measured?.$disconnect();
  await destroyActionsFixture(fixture);
});

describe("PERF-01 controlled SQL/payload/latency smoke", () => {
  it.each(["requester", "staff"] as const)("bounds %s dashboard on 1k Tickets / 3k Actions", async (role) => {
    const user = role === "requester" ? fixture.normalRequester : fixture.staff;
    const agent = await agentFor(fixture, user.email);
    const path = `/api/dashboard/${role}`;
    for (let i = 0; i < 3; i++) await agent.get(path).expect(200);
    const timings: number[] = [];
    const queryCounts: number[] = [];
    const payloads: number[] = [];
    for (let i = 0; i < 20; i++) {
      businessQueries = [];
      observing = true;
      const start = performance.now();
      const response = await agent.get(path).expect(200);
      timings.push(performance.now() - start);
      observing = false;
      queryCounts.push(businessQueries.length);
      payloads.push(Buffer.byteLength(response.text, "utf8"));
      expect(businessQueries.length).toBeGreaterThan(0); // The SQL instrumentation must actually observe queries.
      expect(response.body.recentTickets).toHaveLength(5);
      expect(role === "requester" ? response.body.attentionTickets : response.body.myActions).toHaveLength(5);
      expect(response.body.metrics.myActiveTickets).toBe(role === "requester" ? 700 : 666);
    }
    const p95 = [...timings].sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1];
    const record = { role, tickets: 1000, actions: 3000, warmups: 3, measurements: 20,
      maxBusinessSqlQueries: Math.max(...queryCounts), maxPayloadBytes: Math.max(...payloads), p95Ms: Math.round(p95 * 100) / 100,
      environment: `${process.platform}/${process.arch}, Node ${process.version}, local PostgreSQL test database` };
    console.log("PERF-01", JSON.stringify(record));
    expect(new Set(queryCounts).size).toBe(1);
    expect(record.maxBusinessSqlQueries).toBeLessThanOrEqual(12);
    expect(record.maxPayloadBytes).toBeLessThanOrEqual(64 * 1024);
    expect(p95).toBeLessThanOrEqual(2000);
  }, 120_000); // 3 warmups + 20 requests; each request is still subject to the 2s p95 budget.
});
