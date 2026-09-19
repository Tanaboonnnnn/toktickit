import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { assertDistinctTestDatabase, assertSeparateUploadRoots } from "../../../server/dist/tests/lab-03/support/database.js";

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), "server/.env");
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(readFileSync(envPath, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return [];
    return [[match[1], match[2].trim().replace(/^(['"])(.*)\1$/, "$2")]];
  }));
}

function databaseName(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error("E2E databases must use PostgreSQL URLs");
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("E2E database URL must include a database name");
  return name;
}

const fileEnv = readEnvFile();
const developmentUrl = process.env.E2E_DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
const testUrl = process.env.E2E_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL;
assertDistinctTestDatabase({ developmentUrl, testUrl });

const uploadPrefix = path.join(os.tmpdir(), `toktickit-e2e-${process.pid}-${randomUUID().slice(0, 8)}-`);
const configuredLiveUploadRoot = process.env.UPLOAD_DIR ?? fileEnv.UPLOAD_DIR ?? path.resolve(process.cwd(), "server/uploads");
assertSeparateUploadRoots(configuredLiveUploadRoot, uploadPrefix);
const uploadRoot = mkdtempSync(uploadPrefix);
process.env.DATABASE_URL = testUrl;
process.env.UPLOAD_DIR = uploadRoot;
// Issue #44 adds a real server-side session foundation. The retained Lab 2
// browser harness still exercises the pre-activation Requester flow, but the
// server must start with a non-production, run-owned session secret so the auth
// router can initialize without weakening the production configuration gate.
process.env.SESSION_SECRET ??= randomBytes(32).toString("hex");
process.env.FRONTEND_ORIGIN ??= "http://127.0.0.1:4312";
const port = Number(process.env.E2E_PORT || 4311);
const { app } = await import("../../../server/dist/src/app.js");
const server = app.listen(port, "127.0.0.1", () => console.log(`TokTickIT E2E API listening on http://127.0.0.1:${port}`));

let closed = false;
function cleanup() {
  if (closed) return;
  closed = true;
  server.closeAllConnections?.();
  server.close();
  rmSync(uploadRoot, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("exit", () => rmSync(uploadRoot, { recursive: true, force: true }));
