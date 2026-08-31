import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

const args = process.argv.slice(2);
const root = process.cwd();
const apiPort = 4311;
const clientPort = 4312;
const apiUrl = `http://127.0.0.1:${apiPort}`;
const env = { ...process.env };
let managedServer;
let managedClient;
let shuttingDown = false;

function portIsFree(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    });
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

async function assertPortsFree() {
  if (!(await portIsFree(apiPort))) throw new Error(`E2E API port ${apiPort} is already occupied; refusing to reuse an unowned process`);
  if (!(await portIsFree(clientPort))) throw new Error(`E2E client port ${clientPort} is already occupied; refusing to reuse an unowned process`);
}

function childExit(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) { resolve(child?.exitCode ?? 1); return; }
    child.once("error", () => resolve(1));
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function waitFor(url, child, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Managed process exited before ${url} became ready`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* condition-based readiness polling */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for managed endpoint ${url}`);
}

async function terminate(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    childExit(child),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (child.exitCode !== null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    await Promise.race([
      new Promise((resolve) => {
        killer.once("error", resolve);
        killer.once("close", resolve);
      }),
      new Promise((resolve) => setTimeout(resolve, 3_000)),
    ]);
  }
  await Promise.race([
    childExit(child),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
}

async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  await terminate(managedClient);
  await terminate(managedServer);
}

async function run() {
  await assertPortsFree();
  managedServer = spawn(process.execPath, ["e2e/lab-02/support/e2e-server.mjs"], {
    cwd: root,
    env: { ...env, E2E_PORT: String(apiPort) },
    stdio: "ignore",
  });
  const viteEntry = path.resolve(root, "client/node_modules/vite/bin/vite.js");
  managedClient = spawn(process.execPath, [viteEntry, "--host", "127.0.0.1", "--port", String(clientPort)], {
    cwd: path.resolve(root, "client"),
    env: { ...env, VITE_API_URL: apiUrl },
    stdio: "ignore",
  });
  await Promise.all([
    waitFor(`${apiUrl}/api/health`, managedServer),
    waitFor(`http://127.0.0.1:${clientPort}`, managedClient),
  ]);
  const runner = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...args], {
    cwd: root,
    env: { ...env, E2E_MANAGED: "1" },
    stdio: "inherit",
  });
  return childExit(runner);
}

process.once("SIGINT", () => { void cleanup().finally(() => process.exit(130)); });
process.once("SIGTERM", () => { void cleanup().finally(() => process.exit(143)); });

let exitCode = 1;
try {
  exitCode = await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  await cleanup();
}
process.exitCode = exitCode;
