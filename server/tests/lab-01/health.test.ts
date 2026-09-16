import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { configureAuthenticatedTestRuntime } from "../lab-02/support/authenticated-requester.js";

function env(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8").split(/\r?\n/)
    .find((entry) => entry.trimStart().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2");
}

let app: Express;

beforeAll(async () => {
  const testDatabaseUrl = env("TEST_DATABASE_URL");
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required for the Lab 1 health regression");
  configureAuthenticatedTestRuntime();
  process.env.DATABASE_URL = testDatabaseUrl;
  ({ app } = await import("../../src/app.js"));
});

// WORKED EXAMPLE — retained as a public health regression after Lab 3 auth activation.
describe("GET /api/health", () => {
  it("returns 200 with status ok and the service name", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "TokTickIT API" });
  });
});
