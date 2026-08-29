import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface AttachmentStorage {
  readonly root: string;
  stage(bytes: Buffer): Promise<{ tempPath: string }>;
  finalize(tempPath: string, storedName: string): Promise<string>;
  remove(storedName: string): Promise<void>;
  read(storedName: string): Promise<Buffer>;
  size(storedName: string): Promise<number>;
}

export type StorageFs = Pick<typeof fs, "mkdir" | "mkdtemp" | "writeFile" | "rename" | "rm" | "readFile" | "stat">;

function safeStorageName(storedName: string): string {
  if (!/^[0-9a-f-]{36}\.[a-z]+$/i.test(storedName)) throw new Error("invalid generated storage name");
  return storedName;
}

export class LocalAttachmentStorage implements AttachmentStorage {
  root: string;
  private readonly fsOps: StorageFs;
  constructor(root = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads"), fsOps: StorageFs = fs) { this.root = path.resolve(root); this.fsOps = fsOps; }
  configure(root: string): void { this.root = path.resolve(root); }
  async stage(bytes: Buffer) {
    await this.fsOps.mkdir(this.root, { recursive: true });
    let directory: string | null = null;
    try {
      directory = await this.fsOps.mkdtemp(path.join(this.root, ".staging-"));
      const tempPath = path.join(directory, "payload");
      await this.fsOps.writeFile(tempPath, bytes, { flag: "wx" });
      return { tempPath };
    } catch (error) {
      if (directory) {
        try { await this.fsOps.rm(directory, { recursive: true, force: true }); } catch { /* preserve primary storage failure */ }
      }
      throw error;
    }
  }
  async finalize(tempPath: string, storedName: string) {
    const safe = safeStorageName(storedName);
    const destination = path.join(this.root, safe);
    await this.fsOps.rename(tempPath, destination);
    try { await this.fsOps.rm(path.dirname(tempPath), { recursive: true, force: true }); } catch { /* finalization succeeded; cleanup is best effort */ }
    return destination;
  }
  async remove(storedName: string) {
    await this.fsOps.rm(path.join(this.root, safeStorageName(storedName)), { force: true });
  }
  async read(storedName: string) { return this.fsOps.readFile(path.join(this.root, safeStorageName(storedName))); }
  async size(storedName: string) { return (await this.fsOps.stat(path.join(this.root, safeStorageName(storedName)))).size; }
}

export const attachmentStorage = new LocalAttachmentStorage();
export function generatedStoredName(extension: string): string { return `${randomUUID()}${extension}`; }
