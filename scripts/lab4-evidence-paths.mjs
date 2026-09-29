import { resolve, relative, isAbsolute, sep } from "node:path";

function normalized(path) {
  return resolve(path).replace(/[\\/]+$/, "").toLowerCase();
}

function isWithin(parent, candidate) {
  const rel = relative(parent, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function managedEvidenceEnvironment(baseEnv, pid = process.pid) {
  const env = { ...baseEnv };
  const legacyLab3Capture = env.LAB3_EVIDENCE_CAPTURE === "1";
  if (legacyLab3Capture) {
    const legacyRoot = env.LAB3_EVIDENCE_ROOT?.trim().replaceAll("\\", "/");
    if (!legacyRoot || !/^artifacts\/lab-03\/screenshots\/issue-52\/[a-z0-9][a-z0-9._-]*-[0-9a-f]{7}$/i.test(legacyRoot)) {
      throw new Error("Explicit Lab 3 evidence capture requires the managed issue-52 SHA-labelled root");
    }
    env.LAB3_EVIDENCE_ROOT = legacyRoot;
    delete env.LAB4_EVIDENCE_ROOT;
    return env;
  }

  delete env.LAB3_EVIDENCE_ROOT;
  delete env.LAB3_EVIDENCE_CAPTURE;
  env.LAB4_EVIDENCE_ROOT = env.LAB4_EVIDENCE_ROOT?.trim() || `artifacts/lab-04/test-output/playwright-${pid}`;
  return env;
}

export function assertLab4EvidenceRoot(root, candidate) {
  if (!candidate?.trim()) throw new Error("Lab 4 evidence root is required");
  const repo = resolve(root);
  const allowed = resolve(repo, "artifacts/lab-04");
  const resolved = resolve(repo, candidate);
  const frozenLab2 = resolve(repo, "artifacts/lab-02");
  const frozenLab3 = resolve(repo, "artifacts/lab-03");
  if (isWithin(frozenLab2, resolved) || isWithin(frozenLab3, resolved)) {
    throw new Error("Lab 4 evidence must not target frozen Lab 2/3 artifact roots");
  }
  if (!isWithin(allowed, resolved) || normalized(resolved) === normalized(allowed)) {
    throw new Error("Lab 4 evidence root must be a child of artifacts/lab-04");
  }
  return resolved;
}

export function assertEvidenceRelativeFile(file) {
  if (!file?.trim()) throw new Error("Evidence file path is required");
  const portable = file.replaceAll("\\", "/");
  if (portable.startsWith("/") || /^[A-Za-z]:\//.test(portable)) throw new Error("Evidence file path must be relative");
  const parts = portable.split("/");
  if (parts.some((part) => part === ".." || part === "")) throw new Error("Evidence file path must not traverse directories");
  return parts.join(sep);
}

export function resolveLab4EvidenceFile(root, evidenceRoot, file) {
  const safeRoot = assertLab4EvidenceRoot(root, evidenceRoot);
  const relativeFile = assertEvidenceRelativeFile(file);
  const resolved = resolve(safeRoot, relativeFile);
  if (!isWithin(safeRoot, resolved)) throw new Error("Evidence file escaped the configured Lab 4 evidence root");
  return resolved;
}

export function retainedScreenshotSuffix(relativePath) {
  const portable = relativePath.replaceAll("\\", "/");
  const match = portable.match(/^artifacts\/lab-(?:02|03)\/screenshots\/(.+)$/i);
  return match?.[1] ?? portable.replace(/^artifacts\/lab-04\/screenshots\//i, "");
}
