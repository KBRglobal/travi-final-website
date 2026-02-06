import { defineConfig } from "@playwright/test";

/**
 * Playwright E2E Configuration
 *
 * IMPORTANT: These tests run against a locally running TRAVI instance.
 * Start the dev server before running: npm run dev
 * Then run tests with: npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
