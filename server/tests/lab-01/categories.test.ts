import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(4);
    expect(res.body.map((category: { name: string }) => category.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
    expect(res.body.map((category: { id: number }) => category.id)).toEqual(
      [...res.body.map((category: { id: number }) => category.id)].sort((a, b) => a - b),
    );
    expect(res.body.every((category: Record<string, unknown>) => {
      return Object.keys(category).sort().join(",") === "id,name";
    })).toBe(true);
  });
});
