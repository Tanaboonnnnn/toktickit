import { describe, expect, it } from "vitest";
import path from "node:path";
import { assertDistinctTestDatabase, assertSeparateUploadRoots } from "../lab-03/support/database.js";

describe("Lab 4 harness safety", () => {
  it("rejects development/test database aliases that resolve to the same PostgreSQL database", () => {
    expect(() => assertDistinctTestDatabase({
      developmentUrl: "postgresql://user:pass@localhost:5432/toktickit",
      testUrl: "postgresql://user:pass@127.0.0.2:5432/toktickit",
    })).toThrow(/development database/i);
  });

  it("accepts a dedicated canonical test database", () => {
    expect(() => assertDistinctTestDatabase({
      developmentUrl: "postgresql://user:pass@localhost:5432/toktickit",
      testUrl: "postgresql://user:pass@127.0.0.1:5432/toktickit_test",
    })).not.toThrow();
  });

  it("rejects overlapping live/test upload roots and permits a sibling temp root", () => {
    const base = path.resolve("tmp", "toktickit-harness");
    const live = path.join(base, "uploads");
    expect(() => assertSeparateUploadRoots(live, path.join(live, "run"))).toThrow(/overlap/i);
    expect(() => assertSeparateUploadRoots(live, path.join(base, "test-uploads"))).not.toThrow();
  });
});
