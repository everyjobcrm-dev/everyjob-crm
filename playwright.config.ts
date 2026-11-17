import { defineConfig, devices } from "@playwright/test";

// Smoke tests for the critical flows. Run against a local dev server (default) or any URL:
//   npm run test:e2e                          -> starts `next dev` on :3100 and runs the tests
//   E2E_BASE_URL=https://<domain> npm run test:e2e
// Signed-in tests need E2E_PASSWORD and the role emails (see e2e/README.md); without them they are skipped.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL, locale: "he-IL", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /employee|public/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npx next dev -p 3100", url: baseURL, reuseExistingServer: true, timeout: 180_000 },
});
