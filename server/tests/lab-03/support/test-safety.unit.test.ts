import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertDistinctTestDatabase, assertSeparateUploadRoots } from "./database.js";

const DEV = "postgresql://dev:secret@localhost:5432/toktickit";
const TEST = "postgresql://test:secret@localhost:5432/toktickit_test";

describe("ENV-01 database safety", () => {
  it("fails closed when TEST_DATABASE_URL is missing", () => {
    expect(() => assertDistinctTestDatabase({ developmentUrl: DEV })).toThrow(/TEST_DATABASE_URL/i);
  });

  it("fails closed when DATABASE_URL is missing", () => {
    expect(() => assertDistinctTestDatabase({ testUrl: TEST })).toThrow(/DATABASE_URL/i);
  });

  it("fails closed for an invalid test database URL", () => {
    expect(() => assertDistinctTestDatabase({ developmentUrl: DEV, testUrl: "not a url" })).toThrow(/valid PostgreSQL/i);
  });

  it("rejects the exact same development and test database", () => {
    expect(() => assertDistinctTestDatabase({ developmentUrl: DEV, testUrl: DEV })).toThrow(/development database/i);
  });

  it("rejects the same database even when schema, credentials, protocol spelling, host case, and URL encoding differ", () => {
    const equivalent = "postgres://someone:else@LOCALHOST:5432/tok%74ickit?schema=isolated";
    expect(() => assertDistinctTestDatabase({ developmentUrl: DEV, testUrl: equivalent })).toThrow(/development database/i);
  });

  it("rejects a test URL that differs only by PostgreSQL schema", () => {
    expect(() => assertDistinctTestDatabase({
      developmentUrl: `${DEV}?schema=public`,
      testUrl: `${DEV}?schema=lab3_isolated`,
    })).toThrow(/development database/i);
  });

  it("allows the same database name on a different host because it is a distinct database server", () => {
    expect(() => assertDistinctTestDatabase({
      developmentUrl: DEV,
      testUrl: "postgresql://test:secret@127.0.0.2:5432/toktickit",
    })).not.toThrow();
  });
  it("allows a configured dedicated test database without requiring a lab3 name", () => {
    expect(() => assertDistinctTestDatabase({ developmentUrl: DEV, testUrl: TEST })).not.toThrow();
  });
});

describe("ENV-01 upload-root safety", () => {
  const base = path.join(os.tmpdir(), "toktickit-env01");
  const live = path.join(base, "uploads");

  it("rejects the same upload root after path normalization", () => {
    expect(() => assertSeparateUploadRoots(live, path.join(live, "..", "uploads"))).toThrow(/overlap/i);
  });

  it("rejects a test upload root nested inside the live upload root", () => {
    expect(() => assertSeparateUploadRoots(live, path.join(live, "test-run"))).toThrow(/overlap/i);
  });

  it("rejects a live upload root nested inside the test upload root", () => {
    expect(() => assertSeparateUploadRoots(path.join(base, "test-parent", "live"), path.join(base, "test-parent"))).toThrow(/overlap/i);
  });

  it("allows a separate temporary test upload root", () => {
    expect(() => assertSeparateUploadRoots(live, path.join(base, "temporary-test-uploads"))).not.toThrow();
  });
});

