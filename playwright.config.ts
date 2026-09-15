import { defineConfig, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const evidenceRoot = resolve(root, "artifacts/lab-03/screenshots");
for (const area of ["requester-selection", "create-ticket", "my-tickets", "ticket-detail"]) {
  mkdirSync(resolve(evidenceRoot, area), { recursive: true });
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["lab-02/**/*.spec.ts", "lab-03/**/*.spec.ts"],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4312",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
