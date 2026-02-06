/**
 * E2E: Destination page critical flow
 *
 * Prerequisites: App must be running at http://localhost:5000
 * Run: npm run dev   (then in another terminal: npx playwright test)
 */

import { test, expect } from "@playwright/test";

test.describe("Destination page", () => {
  test("Dubai destination page loads with title", async ({ page }) => {
    await page.goto("/destinations/dubai");
    // The page should contain the destination name
    await expect(page.locator("h1, h2, [class*='title']").first()).toContainText(/Dubai/i, {
      timeout: 10_000,
    });
  });

  test("attractions section exists", async ({ page }) => {
    await page.goto("/destinations/dubai");
    // Look for an attractions section, card grid, or related content area
    const attractions = page.locator(
      '[data-testid*="attraction"], [class*="attraction"], section:has-text("attraction"), [class*="card"]'
    );
    // At least one matching element should be present
    await expect(attractions.first()).toBeVisible({ timeout: 10_000 });
  });
});
