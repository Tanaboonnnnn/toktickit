import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
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

function safeStorageName(storedName: string): string {
  if (!/^[0-9a-f-]{36}\.[a-z]+$/i.test(storedName)) throw new Error("invalid generated storage name");
  return storedName;
}

export class LocalAttachmentStorage implements AttachmentStorage {
  root: string;
  constructor(root = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads")) { this.root = path.resolve(root); }
  configure(root: string): void { this.root = path.resolve(root); }
  async stage(bytes: Buffer) {
    await mkdir(this.root, { recursive: true });
    const directory = await mkdtemp(path.join(this.root, ".staging-"));
    const tempPath = path.join(directory, "payload");
    await writeFile(tempPath, bytes, { flag: "wx" });
    return { tempPath };
  }
  async finalize(tempPath: string, storedName: string) {
    const safe = safeStorageName(storedName);
    const destination = path.join(this.root, safe);
    await rename(tempPath, destination);
    await rm(path.dirname(tempPath), { recursive: true, force: true });
    return destination;
  }
  async remove(storedName: string) {
    await rm(path.join(this.root, safeStorageName(storedName)), { force: true });
  }
  async read(storedName: string) { return readFile(path.join(this.root, safeStorageName(storedName))); }
  async size(storedName: string) { return (await stat(path.join(this.root, safeStorageName(storedName)))).size; }
}

export const attachmentStorage = new LocalAttachmentStorage();
export function generatedStoredName(extension: string): string { return `${randomUUID()}${extension}`; }
