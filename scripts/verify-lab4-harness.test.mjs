import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertEvidenceRelativeFile, assertLab4EvidenceRoot, retainedScreenshotSuffix } from "./lab4-evidence-paths.mjs";
import { verifyLab4TraceabilityFromDisk, verifyLab4Traceability } from "./lab4-verification.mjs";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("HAR-01 discovers retained + future Lab 4 browser suites without config-time historical writes", () => {
  const config = read("playwright.config.ts");
  assert.match(config, /lab-02\/\*\*\/\*\.spec\.ts/);
  assert.match(config, /lab-03\/\*\*\/\*\.spec\.ts/);
  assert.match(config, /lab-04\/\*\*\/\*\.spec\.ts/);
  assert.doesNotMatch(config, /mkdirSync|artifacts\/lab-03/);
  const packageJson = JSON.parse(read("package.json"));
  for (const command of ["test:trace:lab4", "test:e2e:lab4", "test:responsive:lab4", "capture:evidence:lab4"]) {
    assert.equal(typeof packageJson.scripts[command], "string", `${command} must exist`);
  }
  assert.match(packageJson.scripts["test:responsive"], /--include-retained/);
});

test("HAR-02 evidence routing fails closed for frozen roots and traversal", () => {
  assert.throws(() => assertLab4EvidenceRoot(root, "artifacts/lab-03/screenshots/current"), /frozen Lab 2\/3/i);
  assert.throws(() => assertLab4EvidenceRoot(root, "artifacts/lab-02/screenshots/current"), /frozen Lab 2\/3/i);
  assert.throws(() => assertLab4EvidenceRoot(root, "artifacts/lab-04"), /child of artifacts\/lab-04/i);
  assert.doesNotThrow(() => assertLab4EvidenceRoot(root, "artifacts/lab-04/test-output/harness"));
  assert.throws(() => assertEvidenceRelativeFile("../escape.png"), /traverse/i);
  assert.equal(retainedScreenshotSuffix("artifacts/lab-03/screenshots/login/login.png").replaceAll("\\", "/"), "login/login.png");
});

test("HAR-03 planning trace accepts honest planned rows while release rejects them", () => {
  const planning = verifyLab4TraceabilityFromDisk({ root, mode: "planning" });
  assert.equal(planning.acCount, 28);
  assert.equal(planning.testCount, 57);
  assert.throws(() => verifyLab4TraceabilityFromDisk({ root, mode: "release" }), /not executed Pass evidence/i);
});

test("HAR-03 rejects fake Pass, duplicate Test IDs, unknown mapping and missing rubric destinations", () => {
  const specification = read("docs/lab-04/specification.md");
  const tests = read("docs/lab-04/tests.md");
  const fakePass = tests.replace(/(^\| MIG-01 .*\|) Planned \/ Not run \|$/m, "$1 Pass |");
  assert.throws(() => verifyLab4Traceability({ specification, tests: fakePass, root, mode: "planning" }), /references missing path/i);

  const duplicate = tests.replace("| HAR-02 | Harness |", `${tests.match(/^\| HAR-01 .*$/m)[0]}\n| HAR-02 | Harness |`);
  assert.throws(() => verifyLab4Traceability({ specification, tests: duplicate, root, mode: "planning" }), /duplicate Test ID HAR-01/i);

  const unknown = tests.replace("| AC-01 | MIG-01, API-01 |", "| AC-01 | MIG-01, API-99 |");
  assert.throws(() => verifyLab4Traceability({ specification, tests: unknown, root, mode: "planning" }), /unknown Test ID API-99/i);

  const noDestination = tests.replace(/(\| AC-01 \|[^|]+\|)[^|]+\|/, "$1  |");
  assert.throws(() => verifyLab4Traceability({ specification, tests: noDestination, root, mode: "planning" }), /no rubric\/Answer Part evidence destination/i);
});

test("HAR-03 current workflow targets Lab 4 branches and canonical test database", () => {
  const workflow = read(".github/workflows/lab4-ci.yml");
  assert.match(workflow, /name:\s*Lab 4 CI/);
  assert.match(workflow, /- lab4-staging/);
  assert.match(workflow, /- main/);
  assert.match(workflow, /CREATE DATABASE toktickit_test/);
  assert.doesNotMatch(workflow, /CREATE DATABASE tock.+it_test/);
  assert.match(workflow, /node-version:\s*22/);
  for (const lockfile of ["package-lock.json", "server/package-lock.json", "client/package-lock.json"]) assert.match(workflow, new RegExp(lockfile.replace(".", "\\.")));
});
