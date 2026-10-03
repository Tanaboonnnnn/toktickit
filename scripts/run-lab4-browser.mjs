import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const mode = process.argv[2];
const includeRetained = process.argv.includes("--include-retained");
if (!new Set(["e2e", "responsive"]).has(mode)) throw new Error("Usage: run-lab4-browser.mjs <e2e|responsive> [--include-retained]");

function specs(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) return specs(full);
    if (!entry.name.endsWith(".spec.ts")) return [];
    if (mode === "responsive" && !entry.name.startsWith("responsive-")) return [];
    return [relative(root, full).replaceAll("\\", "/")];
  });
}

const labs = includeRetained ? ["lab-02", "lab-03", "lab-04"] : ["lab-04"];
const selected = labs.flatMap((lab) => {
  const directory = resolve(root, "e2e", lab);
  try { return specs(directory); } catch { return []; }
});

if (selected.length === 0) {
  throw new Error(`No ${includeRetained ? "retained/Lab 4" : "Lab 4"} ${mode} specs exist yet; refusing a false green empty-suite run`);
}

const result = spawnSync(process.execPath, [
  "e2e/lab-02/support/run-playwright.mjs",
  ...selected,
  "--project=chromium",
], { cwd: root, stdio: "inherit", shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
