import { spawnSync } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const runnerPath = path.resolve(root, "e2e/lab-02/support/run-playwright.mjs");
const apiPort = 4311;
const clientPort = 4312;

function listening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

function invoke(extraArgs) {
  const result = spawnSync(process.execPath, [runnerPath, ...extraArgs], {
    cwd: root,
    env: { ...process.env },
    encoding: "utf8",
    timeout: 120_000,
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    error: result.error?.message ?? "",
  };
}

async function assertFree(label) {
  if (await listening(apiPort) || await listening(clientPort)) {
    throw new Error(`${label}: required ports must be free before the scenario`);
  }
}

async function cleanRun() {
  await assertFree("clean run");
  const result = invoke(["e2e/lab-02/my-tickets.spec.ts", "--project=chromium", "--list"]);
  if (result.status !== 0) throw new Error(`clean run: Playwright list exited ${result.status}\n${result.output}${result.error}`);
  if (await listening(apiPort) || await listening(clientPort)) throw new Error("clean run: managed listener remained after successful exit");
}

async function secondRun() {
  await assertFree("second run");
  const first = invoke(["e2e/lab-02/my-tickets.spec.ts", "--project=chromium", "--list"]);
  if (first.status !== 0) throw new Error(`second run #1 exited ${first.status}\n${first.output}${first.error}`);
  if (await listening(apiPort) || await listening(clientPort)) throw new Error("second run #1 left a listener");
  const second = invoke(["e2e/lab-02/my-tickets.spec.ts", "--project=chromium", "--list"]);
  if (second.status !== 0) throw new Error(`second run #2 exited ${second.status}\n${second.output}${second.error}`);
  if (await listening(apiPort) || await listening(clientPort)) throw new Error("second run #2 left a listener");
}

async function failureRun() {
  await assertFree("failure run");
  const result = invoke(["e2e/lab-02/my-tickets.spec.ts", "--project=chromium", "--grep=__harness_failure_probe__"]);
  if (result.status === 0) throw new Error("failure run: expected a non-zero Playwright exit");
  if (await listening(apiPort) || await listening(clientPort)) throw new Error("failure run: managed listener remained after failure");
}

async function preoccupiedPort() {
  await assertFree("preoccupied port");
  const dummy = http.createServer((_request, response) => response.end("test-owned dummy"));
  await new Promise((resolve) => dummy.listen(clientPort, "127.0.0.1", resolve));
  try {
    const result = invoke(["e2e/lab-02/my-tickets.spec.ts", "--project=chromium", "--list"]);
    if (result.status === 0) throw new Error("preoccupied port: runner silently accepted the dummy listener");
    if (!(await listening(clientPort))) throw new Error("preoccupied port: runner terminated the test-owned dummy listener");
  } finally {
    await new Promise((resolve) => dummy.close(resolve));
  }
}

const scenario = process.argv[2] ?? "clean";
try {
  if (scenario === "clean") await cleanRun();
  else if (scenario === "second") await secondRun();
  else if (scenario === "failure") await failureRun();
  else if (scenario === "preoccupied") await preoccupiedPort();
  else throw new Error(`Unknown scenario: ${scenario}`);
  console.log(`HARNESS_SCENARIO_PASS ${scenario}`);
} catch (error) {
  console.error(`HARNESS_SCENARIO_FAIL ${scenario}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
