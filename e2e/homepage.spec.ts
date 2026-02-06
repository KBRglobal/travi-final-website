/**
 * E2E: Homepage critical flow
 *
 * Prerequisites: App must be running at http://localhost:5000
 * Run: npm run dev   (then in another terminal: npx playwright test)
 */

import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("page loads and title contains TRAVI", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/TRAVI/i);
  });

  test("hero section is visible", async ({ page }) => {
    await page.goto("/");
    // The hero section should be one of these common patterns
    const hero = page.locator('[data-testid="hero"], section.hero, [class*="hero"], [id*="hero"]');
    await expect(hero.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigation links exist", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav, header");
    await expect(nav.first()).toBeVisible();
    // At least one link in the navigation area
    const links = nav.first().locator("a");
    expect(await links.count()).toBeGreaterThan(0);
  });
});
