import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { assertLab4EvidenceRoot } from "./lab4-evidence-paths.mjs";

const root = process.cwd();
const label = (process.argv[2] || "candidate").trim().toLowerCase();
if (!/^[a-z0-9][a-z0-9._-]*$/.test(label)) throw new Error("Evidence label must contain only letters, numbers, dot, underscore, or dash");

const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
if (dirty) throw new Error("Lab 4 release evidence capture requires a clean working tree");
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const expectedSourceSha = process.env.EXPECTED_EVIDENCE_SHA?.trim();
if (expectedSourceSha && expectedSourceSha !== sourceSha) throw new Error(`Evidence checkout SHA mismatch: expected ${expectedSourceSha} but HEAD is ${sourceSha}`);

const relativeRoot = `artifacts/lab-04/screenshots/${label}-${sourceSha.slice(0, 7)}`;
const absoluteRoot = assertLab4EvidenceRoot(root, relativeRoot);

function list(directory, extension) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? list(full, extension) : (entry.name.endsWith(extension) ? [full] : []);
  });
}

const lab4Specs = list(resolve(root, "e2e/lab-04"), ".spec.ts");
if (lab4Specs.length === 0) throw new Error("No Lab 4 browser specs exist yet; release evidence capture cannot report an empty Pass");

rmSync(absoluteRoot, { recursive: true, force: true });
mkdirSync(absoluteRoot, { recursive: true });
const command = `npm run capture:evidence:lab4 -- ${label}`;
const runner = spawnSync(process.execPath, [
  "e2e/lab-02/support/run-playwright.mjs",
  ...lab4Specs.map((file) => relative(root, file).replaceAll("\\", "/")),
  "--project=chromium",
], {
  cwd: root,
  env: { ...process.env, LAB4_EVIDENCE_ROOT: relativeRoot, LAB4_EVIDENCE_COMMAND: command },
  stdio: "inherit",
});
if (runner.error) throw runner.error;
if (runner.status !== 0) process.exit(runner.status ?? 1);

const screenshots = list(absoluteRoot, ".png");
if (screenshots.length === 0) throw new Error("Lab 4 evidence specs ran but produced no screenshots");
const entries = screenshots.map((file) => {
  const metadataPath = `${file}.meta.json`;
  if (!existsSync(metadataPath)) throw new Error(`Missing evidence metadata for ${relative(root, file)}`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  for (const field of ["role", "route", "scenario", "testId", "rubricPart", "viewport"]) {
    if (!metadata[field]) throw new Error(`Evidence ${relative(root, file)} is missing ${field}`);
  }
  return {
    screenshot: relative(root, file).replaceAll("\\", "/"),
    ...metadata,
    command,
    sourceSha,
  };
});

const manifest = {
  label,
  sourceSha,
  expectedSourceSha: expectedSourceSha || null,
  generatedAtUtc: new Date().toISOString(),
  command,
  screenshotCount: entries.length,
  entries,
};
writeFileSync(resolve(absoluteRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`LAB4 RELEASE EVIDENCE PASS: ${entries.length} scenario-driven screenshots for ${sourceSha} at ${relativeRoot}`);
