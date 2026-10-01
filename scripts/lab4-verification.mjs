import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ISSUE_TEST_IDS = new Map([
  [72, ["HAR-01", "HAR-02", "HAR-03"]],
  [73, ["MIG-01", "MIG-02", "MIG-03", "SEED-01"]],
  [74, ["UNIT-01", "API-01", "API-02", "API-03", "API-04", "API-05", "API-06", "RACE-01", "RACE-02", "RACE-03"]],
  [75, ["FLOW-01", "FLOW-02", "FLOW-03", "FLOW-04", "FLOW-05", "RACE-04", "RACE-05", "UI-03", "E2E-02"]],
  [76, ["UI-01", "UI-02", "UI-04", "E2E-01"]],
  [77, ["DASH-01", "DASH-02", "DASH-03", "DASH-04", "DASH-05", "PERF-01"]],
]);

function fail(message) {
  throw new Error(`LAB4 TRACE: ${message}`);
}

function uniqueIds(text, pattern, label) {
  const ids = [...text.matchAll(pattern)].map((match) => match[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`duplicate ${label} ${id}`);
    seen.add(id);
  }
  if (seen.size === 0) fail(`no ${label}s found`);
  return seen;
}

function splitTableRow(line) {
  return line.split("|").slice(1, -1).map((value) => value.trim());
}

function referencedPaths(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

export function parseLab4Documents({ specification, tests }) {
  const frIds = uniqueIds(specification, /\*\*(FR-\d{2})\b/g, "FR ID");
  const brIds = uniqueIds(specification, /\*\*(BR-\d{2})\b/g, "BR ID");
  const acIds = uniqueIds(specification, /\*\*(AC-\d{2})\b/g, "AC ID");

  const plannedSection = tests.split("## 2. Planned Test Registry")[1]?.split("## 3.")[0];
  if (!plannedSection) fail("unable to locate Planned Test Registry");

  const testRows = plannedSection.split(/\r?\n/).filter((line) => /^\| [A-Z][A-Z0-9-]+ \|/.test(line));
  const testIds = new Map();
  for (const line of testRows) {
    const columns = splitTableRow(line);
    if (columns.length !== 7) fail(`malformed planned-test row: ${line}`);
    const [id, type, requirements, behavior, expected, pathCell, final] = columns;
    if (testIds.has(id)) fail(`duplicate Test ID ${id}`);
    const paths = referencedPaths(pathCell);
    if (paths.length === 0) fail(`${id} does not name executable/document evidence`);
    testIds.set(id, { id, type, requirements, behavior, expected, paths, final });
  }
  if (testIds.size === 0) fail("no Test IDs found");

  const mappingSection = tests.split("## 3. Acceptance-Criterion Traceability")[1]?.split("## 4.")[0];
  if (!mappingSection) fail("unable to locate Acceptance-Criterion Traceability");
  const mappings = new Map();
  for (const line of mappingSection.split(/\r?\n/).filter((candidate) => /^\| AC-\d{2} \|/.test(candidate))) {
    const columns = splitTableRow(line);
    if (columns.length !== 3) fail(`malformed AC mapping row: ${line}`);
    const [ac, testCell, destination] = columns;
    if (mappings.has(ac)) fail(`duplicate mapping for ${ac}`);
    const ids = testCell.match(/[A-Z][A-Z0-9]*-\d{2}/g) ?? [];
    if (ids.length === 0) fail(`${ac} has no mapped Test ID`);
    if (!destination || !/\bP[1-9]\b/.test(destination)) fail(`${ac} has no rubric/Answer Part evidence destination`);
    for (const id of ids) if (!testIds.has(id)) fail(`${ac} maps unknown Test ID ${id}`);
    mappings.set(ac, { ids, destination });
  }

  for (const ac of acIds) if (!mappings.has(ac)) fail(`${ac} from specification.md has no Test DD mapping`);
  for (const ac of mappings.keys()) if (!acIds.has(ac)) fail(`${ac} appears in Test DD but not specification.md`);

  const mappedTests = new Set([...mappings.values()].flatMap(({ ids }) => ids));
  for (const id of testIds.keys()) if (!mappedTests.has(id)) fail(`${id} is not mapped from any Acceptance Criterion`);

  const scenarioSection = tests.split("### 8.1 Reviewed evidence scenario registry")[1]?.split("## 9.")[0];
  if (!scenarioSection) fail("unable to locate reviewed evidence scenario registry");
  const evidenceScenarios = new Map();
  for (const line of scenarioSection.split(/\r?\n/).filter((candidate) => /^\| L4-[A-Z0-9-]+ \|/.test(candidate))) {
    const columns = splitTableRow(line);
    if (columns.length !== 4) fail(`malformed evidence scenario row: ${line}`);
    const [id, description, testCell, rubricCell] = columns;
    if (evidenceScenarios.has(id)) fail(`duplicate evidence scenario ${id}`);
    const allowedTestIds = testCell.match(/[A-Z][A-Z0-9]*-\d{2}/g) ?? [];
    const rubricParts = rubricCell.match(/\bP[1-9]\b/g) ?? [];
    if (allowedTestIds.length === 0) fail(`${id} has no allowed Test ID`);
    if (rubricParts.length === 0) fail(`${id} has no allowed rubric part`);
    for (const testId of allowedTestIds) {
      if (!testIds.has(testId)) fail(`${id} references unknown Test ID ${testId}`);
    }
    evidenceScenarios.set(id, {
      id,
      description,
      testIds: new Set(allowedTestIds),
      rubricParts: new Set(rubricParts),
    });
  }
  if (evidenceScenarios.size === 0) fail("no reviewed evidence scenarios found");

  return { frIds, brIds, acIds, testIds, mappings, evidenceScenarios };
}

export function validateLab4EvidenceIdentity(metadata, parsed) {
  const scenarioId = String(metadata?.scenarioId ?? "").trim();
  const testId = String(metadata?.testId ?? "").trim();
  const rubricPart = String(metadata?.rubricPart ?? "").trim();
  const scenario = parsed.evidenceScenarios.get(scenarioId);

  if (!scenario) fail(`unknown evidence scenario ${scenarioId || "<missing>"}`);
  if (!parsed.testIds.has(testId)) fail(`unknown Test ID ${testId || "<missing>"}`);
  if (!scenario.testIds.has(testId)) fail(`${scenarioId} does not allow Test ID ${testId}`);
  if (!/^P[1-9]$/.test(rubricPart)) fail(`invalid rubric part ${rubricPart || "<missing>"}; expected P1-P9`);
  if (!scenario.rubricParts.has(rubricPart)) fail(`${scenarioId} does not allow rubric part ${rubricPart}`);
}

function isPlanned(final) {
  return /Planned\s*\/\s*Not run/i.test(final);
}

function isPass(final) {
  return /^(?:\*\*)?Pass\b/i.test(final.trim());
}

function requireExistingPaths(root, row) {
  for (const path of row.paths) {
    if (!existsSync(resolve(root, path))) fail(`${row.id} references missing path ${path}`);
  }
}

export function verifyLab4Traceability({ specification, tests, root, mode = "planning", issue }) {
  const parsed = parseLab4Documents({ specification, tests });

  for (const row of parsed.testIds.values()) {
    if (isPass(row.final)) requireExistingPaths(root, row);
    if (!isPlanned(row.final) && !isPass(row.final)) {
      fail(`${row.id} has unsupported Final status: ${row.final}`);
    }
  }

  if (mode === "increment") {
    const issueNumber = Number(issue);
    const owned = ISSUE_TEST_IDS.get(issueNumber);
    if (!owned) fail(`increment mode has no reviewed ownership mapping for Issue #${issue}`);
    for (const id of owned) {
      const row = parsed.testIds.get(id);
      if (!row) fail(`Issue #${issueNumber} requires missing Test ID ${id}`);
      if (!isPass(row.final)) fail(`${id} must record executed Pass evidence for Issue #${issueNumber}`);
      requireExistingPaths(root, row);
    }
  } else if (mode === "release") {
    for (const row of parsed.testIds.values()) {
      if (!isPass(row.final)) fail(`${row.id} is not executed Pass evidence in release mode`);
      requireExistingPaths(root, row);
    }
  } else if (mode !== "planning") {
    fail(`unsupported mode ${mode}`);
  }

  return {
    mode,
    issue: issue ? Number(issue) : null,
    frCount: parsed.frIds.size,
    brCount: parsed.brIds.size,
    acCount: parsed.acIds.size,
    testCount: parsed.testIds.size,
  };
}

export function verifyLab4TraceabilityFromDisk({ root = process.cwd(), mode = "planning", issue }) {
  const specification = readFileSync(resolve(root, "docs/lab-04/specification.md"), "utf8");
  const tests = readFileSync(resolve(root, "docs/lab-04/tests.md"), "utf8");
  return verifyLab4Traceability({ specification, tests, root, mode, issue });
}
