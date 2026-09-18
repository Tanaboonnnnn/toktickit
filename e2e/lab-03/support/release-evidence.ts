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
