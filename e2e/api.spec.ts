/**
 * E2E: API health checks
 *
 * Prerequisites: App must be running at http://localhost:5000
 * Run: npm run dev   (then in another terminal: npx playwright test)
 */

import { test, expect } from "@playwright/test";

test.describe("Public API health", () => {
  test("GET /api/public/destinations returns 200 with JSON array", async ({ request }) => {
    const res = await request.get("/api/public/destinations");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/public/contents returns 200", async ({ request }) => {
    const res = await request.get("/api/public/contents");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("GET /api/public/homepage-sections returns 200", async ({ request }) => {
    const res = await request.get("/api/public/homepage-sections");
    expect(res.status()).toBe(200);
  });
});
