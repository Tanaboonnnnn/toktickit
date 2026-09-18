import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative, join } from "node:path";

const root = process.cwd();
const label = (process.argv[2] || "candidate").trim().toLowerCase();
if (!/^[a-z0-9][a-z0-9._-]*$/.test(label)) {
  throw new Error("Evidence label must contain only letters, numbers, dot, underscore, or dash");
}

const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim();
if (dirty) {
  throw new Error("Release evidence capture requires a clean working tree so the manifest SHA identifies the tested source exactly");
}

const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const shortSha = sourceSha.slice(0, 7);
const relativeRoot = `artifacts/lab-03/screenshots/issue-52/${label}-${shortSha}`;
const absoluteRoot = resolve(root, relativeRoot);
rmSync(absoluteRoot, { recursive: true, force: true });
mkdirSync(absoluteRoot, { recursive: true });

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const build = spawnSync(npm, ["--prefix", "server", "run", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
if (build.status !== 0) process.exit(build.status ?? 1);

const runner = spawnSync(process.execPath, [
  "e2e/lab-02/support/run-playwright.mjs",
  "e2e/lab-03/authentication.spec.ts",
  "e2e/lab-03/requester-regression.spec.ts",
  "e2e/lab-03/communication-privacy.spec.ts",
  "e2e/lab-03/staff-queue.spec.ts",
  "e2e/lab-03/staff-ticket-flow.spec.ts",
  "e2e/lab-03/user-administration.spec.ts",
  "e2e/lab-03/responsive-desktop.spec.ts",
  "e2e/lab-03/responsive-tablet.spec.ts",
  "e2e/lab-03/responsive-mobile.spec.ts",
  "--project=chromium",
], {
  cwd: root,
  env: { ...process.env, LAB3_EVIDENCE_ROOT: relativeRoot },
  stdio: "inherit",
});
if (runner.status !== 0) process.exit(runner.status ?? 1);

function listPngs(directory) {
  return readdirSync(directory).flatMap((name) => {
    const full = join(directory, name);
    return statSync(full).isDirectory() ? listPngs(full) : (name.toLowerCase().endsWith(".png") ? [full] : []);
  });
}

const screenshots = listPngs(absoluteRoot)
  .map((file) => relative(root, file).replaceAll("\\", "/"))
  .sort();

if (screenshots.length !== 40) {
  throw new Error(`Expected 40 release screenshots (27 major responsive + 13 required state evidence) but found ${screenshots.length}`);
}

const entries = screenshots.map((screenshot) => {
  const metadataPath = resolve(root, `${screenshot}.meta.json`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  return { screenshot, ...metadata, sourceSha };
});

const majorCount = entries.filter((entry) => entry.screenshot.includes("/major/")).length;
const stateCount = entries.filter((entry) => entry.screenshot.includes("/states/")).length;
if (majorCount !== 27 || stateCount !== 13) {
  throw new Error(`Expected 27 major and 13 state screenshots but found ${majorCount} major and ${stateCount} state`);
}

const manifest = {
  label,
  sourceSha,
  generatedAtUtc: new Date().toISOString(),
  command: `npm run capture:evidence:lab3 -- ${label}`,
  viewports: {
    desktop: "1440x900",
    tablet: "834x1112",
    mobile: "390x844",
  },
  expectedMajorScreensPerViewport: 9,
  screenshotCount: screenshots.length,
  majorScreenshotCount: majorCount,
  stateScreenshotCount: stateCount,
  entries,
};

writeFileSync(resolve(absoluteRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`LAB3 RELEASE EVIDENCE PASS: ${screenshots.length} screenshots (${majorCount} major + ${stateCount} states) for ${sourceSha} at ${relativeRoot}`);
