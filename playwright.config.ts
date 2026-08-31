import { defineConfig, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
mkdirSync(resolve(root, "artifacts/lab-02/screenshots/requester-selection"), { recursive: true });
mkdirSync(resolve(root, "artifacts/lab-02/screenshots/create-ticket"), { recursive: true });
mkdirSync(resolve(root, "artifacts/lab-02/screenshots/my-tickets"), { recursive: true });
mkdirSync(resolve(root, "artifacts/lab-02/screenshots/ticket-detail"), { recursive: true });

export default defineConfig({
  testDir: "./e2e/lab-02",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
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
