import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { assertNoHorizontalOverflow } from "../../lab-02/support/ui.js";
import { resolveLab4EvidenceFile } from "../../../scripts/lab4-evidence-paths.mjs";

export interface ReleaseEvidenceMeta {
  file: string;
  role: "Unauthenticated" | "Requester" | "IT Staff" | "Administrator";
  route: string;
  scenario: string;
  scenarioId?: string;
  mapping: string[];
  testId?: string;
  rubricPart?: string;
  viewport?: string;
}

export async function captureReleaseEvidence(page: Page, meta: ReleaseEvidenceMeta): Promise<void> {
  const lab4EvidenceRoot = process.env.LAB4_EVIDENCE_ROOT?.trim();
  const legacyLab3Capture = process.env.LAB3_EVIDENCE_CAPTURE === "1";
  const evidenceRoot = legacyLab3Capture ? process.env.LAB3_EVIDENCE_ROOT?.trim() : undefined;
  if (!lab4EvidenceRoot && !evidenceRoot) return;

  await assertNoHorizontalOverflow(page);
  const visibleText = await page.locator("body").evaluate((body) => {
    const text: string[] = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim()) continue;
      if (parent.closest("script, style, [hidden], [aria-hidden='true']")) continue;

      const option = parent.closest("option") as HTMLOptionElement | null;
      if (option) {
        const select = option.closest("select");
        if (!select || select.selectedOptions[0] !== option) continue;
        text.push(node.textContent);
        continue;
      }

      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden" || parent.getClientRects().length === 0) continue;
      text.push(node.textContent);
    }
    return text.join("\n");
  });
  const enteredValues = await page.locator("input, textarea").evaluateAll((elements) =>
    elements.map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value).filter(Boolean).join("\n"),
  );
  const evidenceSurface = `${visibleText}\n${enteredValues}`;
  const leakedFixtureToken = evidenceSurface.match(/\b(?:issue\s*\d+\s+(?:requester|staff|administrator|admin)|issue\d+-[a-z0-9-]+|e2e-(?:auth|communication|staff-queue|staff-flow|user-admin)-[a-z0-9-]+)/i);
  if (leakedFixtureToken) {
    throw new Error(`Release evidence contains technical fixture text: ${leakedFixtureToken[0]}`);
  }
  const viewport = page.viewportSize();
  const absolutePng = lab4EvidenceRoot
    ? resolveLab4EvidenceFile(process.cwd(), lab4EvidenceRoot, meta.file)
    : resolve(process.cwd(), `${evidenceRoot}/${meta.file}`);
  mkdirSync(dirname(absolutePng), { recursive: true });
  await page.screenshot({ path: absolutePng, fullPage: true });

  writeFileSync(`${absolutePng}.meta.json`, JSON.stringify({
    ...meta,
    viewport: meta.viewport ?? (viewport ? `${viewport.width}x${viewport.height}` : "unknown"),
  }, null, 2) + "\n", "utf8");
}
