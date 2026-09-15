import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/password.js";

describe("HASH-01 Argon2id password primitives", () => {
  it("creates independently salted Argon2id hashes for the same password", async () => {
    const first = await hashPassword("Correct Horse Battery Staple 1!");
    const second = await hashPassword("Correct Horse Battery Staple 1!");

    expect(first).toMatch(/^\$argon2id\$/);
    expect(second).toMatch(/^\$argon2id\$/);
    expect(first).not.toBe(second);
  });

  it("verifies the correct password and rejects a different password", async () => {
    const hash = await hashPassword("Correct Horse Battery Staple 2!");

    await expect(verifyPassword(hash, "Correct Horse Battery Staple 2!")).resolves.toBe(true);
    await expect(verifyPassword(hash, "Correct Horse Battery Staple 3!")).resolves.toBe(false);
  });

  it("returns false instead of throwing for malformed password hashes", async () => {
    await expect(verifyPassword("not-an-argon2-hash", "anything")).resolves.toBe(false);
    await expect(verifyPassword("", "anything")).resolves.toBe(false);
  });

  it("preserves exact password characters without trimming or Unicode normalization", async () => {
    const spaced = await hashPassword("  exact password value  ");
    await expect(verifyPassword(spaced, "  exact password value  ")).resolves.toBe(true);
    await expect(verifyPassword(spaced, "exact password value")).resolves.toBe(false);

    const composed = "caf\u00e9 password value";
    const decomposed = "cafe\u0301 password value";
    const unicodeHash = await hashPassword(composed);
    await expect(verifyPassword(unicodeHash, composed)).resolves.toBe(true);
    await expect(verifyPassword(unicodeHash, decomposed)).resolves.toBe(false);
  });
});
