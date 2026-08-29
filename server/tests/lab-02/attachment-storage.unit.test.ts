import { mkdtemp, readFile, readdir, rm, stat, writeFile, mkdir, mkdtemp as makeTemp, rename } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalAttachmentStorage, type StorageFs } from "../../src/attachment-storage.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function createRoot() { const root = await mkdtemp(path.join(os.tmpdir(), "toktickit-storage-")); roots.push(root); return root; }
const realFs: StorageFs = { mkdir, mkdtemp: makeTemp, writeFile, rename, rm, readFile, stat };

describe("Attachment storage lifecycle", () => {
  it("cleans a staging directory when the payload write fails", async () => {
    const root = await createRoot();
    const failingFs: StorageFs = { ...realFs, writeFile: async () => { throw new Error("disk full"); } };
    const storage = new LocalAttachmentStorage(root, failingFs);
    await expect(storage.stage(Buffer.from("payload"))).rejects.toThrow("disk full");
    expect(await readdir(root)).toEqual([]);
  });

  it("treats rename as successful when staging-directory cleanup fails", async () => {
    const root = await createRoot();
    const staging = await makeTemp(path.join(root, ".staging-"));
    const tempPath = path.join(staging, "payload");
    await writeFile(tempPath, Buffer.from("valid bytes"));
    let failCleanup = true;
    const seam: StorageFs = { ...realFs, rm: async (target, options) => { if (failCleanup && String(target).includes(".staging-")) throw new Error("cleanup unavailable"); return realFs.rm(target, options); } };
    const storage = new LocalAttachmentStorage(root, seam);
    const destination = await storage.finalize(tempPath, "123e4567-e89b-12d3-a456-426614174000.png");
    expect(destination).toContain("123e4567-e89b-12d3-a456-426614174000.png");
    expect(await readFile(destination)).toEqual(Buffer.from("valid bytes"));
    failCleanup = false;
  });
});
