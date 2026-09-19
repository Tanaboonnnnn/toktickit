import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Page } from "@playwright/test";
import { assertNoHorizontalOverflow } from "../../lab-02/support/ui.js";

export interface ReleaseEvidenceMeta {
  file: string;
  role: "Unauthenticated" | "Requester" | "IT Staff" | "Administrator";
  route: string;
  scenario: string;
  mapping: string[];
  viewport?: string;
}

export async function captureReleaseEvidence(page: Page, meta: ReleaseEvidenceMeta): Promise<void> {
  const evidenceRoot = process.env.LAB3_EVIDENCE_ROOT?.trim();
  if (!evidenceRoot) return;

  await assertNoHorizontalOverflow(page);
  const visibleText = await page.locator("body").innerText();
  const enteredValues = await page.locator("input, textarea").evaluateAll((elements) =>
    elements.map((element) => (element as HTMLInputElement | HTMLTextAreaElement).value).filter(Boolean).join("\n"),
  );
  const evidenceSurface = `${visibleText}\n${enteredValues}`;
  const leakedFixtureToken = evidenceSurface.match(/\b(?:issue\s*\d+\s+(?:requester|staff|administrator|admin)|issue\d+-[a-z0-9-]+|e2e-(?:auth|communication|staff-queue|staff-flow|user-admin)-[a-z0-9-]+)/i);
  if (leakedFixtureToken) {
    throw new Error(`Release evidence contains technical fixture text: ${leakedFixtureToken[0]}`);
  }
  const viewport = page.viewportSize();
  const relativePng = `${evidenceRoot}/${meta.file}`;
  const absolutePng = resolve(process.cwd(), relativePng);
  mkdirSync(dirname(absolutePng), { recursive: true });
  await page.screenshot({ path: absolutePng, fullPage: true });

  writeFileSync(`${absolutePng}.meta.json`, JSON.stringify({
    ...meta,
    viewport: meta.viewport ?? (viewport ? `${viewport.width}x${viewport.height}` : "unknown"),
  }, null, 2) + "\n", "utf8");
}
