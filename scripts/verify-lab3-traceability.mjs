import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const testsPath = resolve(root, "docs/lab-03/tests.md");
const specificationPath = resolve(root, "docs/lab-03/specification.md");
const tests = readFileSync(testsPath, "utf8");
const specification = readFileSync(specificationPath, "utf8");

function fail(message) {
  throw new Error(`TRACE-01: ${message}`);
}

const plannedSection = tests.split("## 2. Planned Tests")[1]?.split("## 3.")[0];
if (!plannedSection) fail("unable to locate the planned-test table");
const testRows = plannedSection.split(/\r?\n/).filter((line) => /^\| [A-Z][A-Z0-9-]+ \|/.test(line));
const testIds = new Map();
for (const line of testRows) {
  const columns = line.split("|").slice(1, -1).map((value) => value.trim());
  if (columns.length !== 7) fail(`malformed planned-test row: ${line}`);
  const [id, , , , , automatedFile, final] = columns;
  if (testIds.has(id)) fail(`duplicate Test ID ${id}`);
  const paths = [...automatedFile.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  if (paths.length === 0) fail(`${id} does not name executable/document evidence`);
  for (const path of paths) {
    if (!existsSync(resolve(root, path))) fail(`${id} references missing path ${path}`);
  }
  testIds.set(id, { final, paths });
}

const specAcs = [...specification.matchAll(/\*\*(AC-\d{2})\b/g)].map((match) => match[1]);
const uniqueSpecAcs = [...new Set(specAcs)];
if (uniqueSpecAcs.length === 0) fail("no Acceptance Criteria found in specification.md");

const mappingSection = tests.split("## 3.")[1]?.split("## 4.")[0];
if (!mappingSection) fail("unable to locate AC-to-Test mapping");
const mappedAcs = new Map();
for (const line of mappingSection.split(/\r?\n/).filter((candidate) => /^\| AC-\d{2} \|/.test(candidate))) {
  const columns = line.split("|").slice(1, -1).map((value) => value.trim());
  const ac = columns[0];
  const ids = columns[1].match(/[A-Z][A-Z0-9]*-\d{2}/g) ?? [];
  if (mappedAcs.has(ac)) fail(`duplicate mapping for ${ac}`);
  if (ids.length === 0) fail(`${ac} has no mapped Test ID`);
  for (const id of ids) if (!testIds.has(id)) fail(`${ac} maps unknown Test ID ${id}`);
  mappedAcs.set(ac, ids);
}

for (const ac of uniqueSpecAcs) {
  if (!mappedAcs.has(ac)) fail(`${ac} from specification.md has no Test DD mapping`);
}
for (const ac of mappedAcs.keys()) {
  if (!uniqueSpecAcs.includes(ac)) fail(`${ac} appears in Test DD but not specification.md`);
}

const issue51Owned = ["SAFE-01", "STYLE-01", "A11Y-01", "SEC-01", "RESP-01", "RESP-02", "RESP-03", "TRACE-01"];
for (const id of issue51Owned) {
  const row = testIds.get(id);
  if (!row) fail(`required Issue #51 Test ID ${id} is missing`);
  if (/Planned\s*\/\s*Not run/i.test(row.final)) fail(`${id} is still marked Planned / Not run`);
}

if (!mappedAcs.has("AC-32") || !mappedAcs.get("AC-32").includes("TRACE-01")) {
  fail("AC-32 final-main release gate must remain mapped to TRACE-01");
}

console.log(`TRACE-01 PASS: ${testIds.size} unique Test IDs, ${uniqueSpecAcs.length} ACs, all mapped paths exist; AC-32 remains a documented final-main release gate.`);
