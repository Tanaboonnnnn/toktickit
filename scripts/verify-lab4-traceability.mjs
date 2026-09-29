import { verifyLab4TraceabilityFromDisk } from "./lab4-verification.mjs";

function option(name) {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const mode = option("mode") ?? "planning";
const issue = option("issue");
const result = verifyLab4TraceabilityFromDisk({ mode, issue });

console.log(
  `LAB4 TRACE PASS: mode=${result.mode}${result.issue ? ` issue=#${result.issue}` : ""}; `
  + `${result.frCount} FRs, ${result.brCount} BRs, ${result.acCount} ACs, ${result.testCount} Test IDs; mappings and evidence statuses are honest for this gate.`,
);
