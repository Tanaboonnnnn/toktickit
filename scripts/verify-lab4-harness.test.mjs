import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertEvidenceRelativeFile, assertLab4EvidenceRoot, retainedScreenshotSuffix } from "./lab4-evidence-paths.mjs";
import * as evidencePaths from "./lab4-evidence-paths.mjs";
import { verifyLab4TraceabilityFromDisk, verifyLab4Traceability } from "./lab4-verification.mjs";
import * as lab4Verification from "./lab4-verification.mjs";

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

test("HAR-02 managed current verification ignores inherited Lab 3 evidence routing", () => {
  const runner = read("e2e/lab-02/support/run-playwright.mjs");
  const evidencePathSource = read("scripts/lab4-evidence-paths.mjs");
  const releaseEvidence = read("e2e/lab-03/support/release-evidence.ts");
  const legacyCapture = read("scripts/capture-lab3-release-evidence.mjs");
  assert.match(runner, /managedEvidenceEnvironment/);
  assert.match(evidencePathSource, /LAB3_EVIDENCE_CAPTURE\s*===\s*"1"/);
  assert.match(evidencePathSource, /delete env\.LAB3_EVIDENCE_ROOT/);
  assert.match(evidencePathSource, /env\.LAB4_EVIDENCE_ROOT\s*=\s*env\.LAB4_EVIDENCE_ROOT\?\.trim\(\)\s*\|\|/);
  assert.match(releaseEvidence, /LAB3_EVIDENCE_CAPTURE\s*===\s*"1"/);
  assert.match(legacyCapture, /LAB3_EVIDENCE_CAPTURE:\s*"1"/);
});

test("HAR-02 managed evidence environment behavior is fail-safe and preserves only explicit legacy capture", () => {
  assert.equal(typeof evidencePaths.managedEvidenceEnvironment, "function");

  const ordinary = evidencePaths.managedEvidenceEnvironment({
    LAB3_EVIDENCE_ROOT: "artifacts/lab-03/screenshots/inherited",
  }, 1234);
  assert.equal(ordinary.LAB3_EVIDENCE_ROOT, undefined);
  assert.equal(ordinary.LAB3_EVIDENCE_CAPTURE, undefined);
  assert.equal(ordinary.LAB4_EVIDENCE_ROOT, "artifacts/lab-04/test-output/playwright-1234");

  const explicitLegacy = evidencePaths.managedEvidenceEnvironment({
    LAB3_EVIDENCE_CAPTURE: "1",
    LAB3_EVIDENCE_ROOT: "artifacts/lab-03/screenshots/issue-52/candidate-deadbee",
    LAB4_EVIDENCE_ROOT: "artifacts/lab-04/test-output/inherited",
  }, 1234);
  assert.equal(explicitLegacy.LAB3_EVIDENCE_ROOT, "artifacts/lab-03/screenshots/issue-52/candidate-deadbee");
  assert.equal(explicitLegacy.LAB4_EVIDENCE_ROOT, undefined);
});

test("HAR-03 planning trace accepts honest planned rows while release rejects them", () => {
  const planning = verifyLab4TraceabilityFromDisk({ root, mode: "planning" });
  assert.equal(planning.acCount, 28);
  assert.equal(planning.testCount, 57);
  assert.throws(() => verifyLab4TraceabilityFromDisk({ root, mode: "release" }), /not executed Pass evidence/i);
});

test("HAR-03 increment trace recognizes reviewed Issue #74-#79 ownership without claiming future Issue IDs", () => {
  const issue74 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 74 });
  assert.equal(issue74.issue, 74);
  assert.equal(issue74.testCount, 57);
  const issue75 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 75 });
  assert.equal(issue75.issue, 75);
  assert.equal(issue75.testCount, 57);
  const issue76 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 76 });
  assert.equal(issue76.issue, 76);
  assert.equal(issue76.testCount, 57);
  const issue77 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 77 });
  assert.equal(issue77.issue, 77);
  assert.equal(issue77.testCount, 57);
  const issue78 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 78 });
  assert.equal(issue78.issue, 78);
  assert.equal(issue78.testCount, 57);
  const issue79 = verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 79 });
  assert.equal(issue79.issue, 79);
  assert.equal(issue79.testCount, 57);
  assert.throws(
    () => verifyLab4TraceabilityFromDisk({ root, mode: "increment", issue: 80 }),
    /no reviewed ownership mapping for Issue #80/i,
  );
});

test("HAR-03 rejects missing evidence paths, duplicate Test IDs, unknown mapping and missing rubric destinations", () => {
  const specification = read("docs/lab-04/specification.md");
  const tests = read("docs/lab-04/tests.md");
  const missingPath = tests.replace("client/tests/lab-04/RequesterDashboard.test.tsx", "client/tests/lab-04/not-created.test.tsx");
  assert.throws(() => verifyLab4Traceability({ specification, tests: missingPath, root, mode: "planning" }), /references missing path/i);

  const duplicate = tests.replace("| HAR-02 | Harness |", `${tests.match(/^\| HAR-01 .*$/m)[0]}\n| HAR-02 | Harness |`);
  assert.throws(() => verifyLab4Traceability({ specification, tests: duplicate, root, mode: "planning" }), /duplicate Test ID HAR-01/i);

  const unknown = tests.replace("| AC-01 | MIG-01, API-01 |", "| AC-01 | MIG-01, API-99 |");
  assert.throws(() => verifyLab4Traceability({ specification, tests: unknown, root, mode: "planning" }), /unknown Test ID API-99/i);

  const noDestination = tests.replace(/(\| AC-01 \|[^|]+\|)[^|]+\|/, "$1  |");
  assert.throws(() => verifyLab4Traceability({ specification, tests: noDestination, root, mode: "planning" }), /no rubric\/Answer Part evidence destination/i);
});

test("HAR-03 release evidence identities are constrained by the reviewed Lab 4 registry", () => {
  const specification = read("docs/lab-04/specification.md");
  const tests = read("docs/lab-04/tests.md");
  const parsed = lab4Verification.parseLab4Documents({ specification, tests });

  assert.ok(parsed.evidenceScenarios instanceof Map);
  assert.equal(typeof lab4Verification.validateLab4EvidenceIdentity, "function");
  assert.doesNotThrow(() => lab4Verification.validateLab4EvidenceIdentity({
    scenarioId: "L4-STF-DASHBOARD",
    testId: "E2E-03",
    rubricPart: "P5",
  }, parsed));
  assert.throws(() => lab4Verification.validateLab4EvidenceIdentity({
    scenarioId: "L4-UNKNOWN",
    testId: "E2E-03",
    rubricPart: "P5",
  }, parsed), /unknown evidence scenario/i);
  assert.throws(() => lab4Verification.validateLab4EvidenceIdentity({
    scenarioId: "L4-STF-DASHBOARD",
    testId: "NOT-A-TEST",
    rubricPart: "P5",
  }, parsed), /unknown Test ID/i);
  assert.throws(() => lab4Verification.validateLab4EvidenceIdentity({
    scenarioId: "L4-STF-DASHBOARD",
    testId: "E2E-03",
    rubricPart: "P10",
  }, parsed), /rubric part/i);
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
