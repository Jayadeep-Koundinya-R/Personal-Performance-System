import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080/Personal-Performance-System";

test.describe("Dashboard Page E2E", () => {
  test("redirects to onboarding when not authenticated", async ({ page }) => {
    await page.goto(`${BASE}/#/dashboard`);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/.*#\/(onboarding|login).*/, { timeout: 10000 });
  });

  test("renders dashboard shell when authenticated", async ({ page }) => {
    test.skip(true, "Requires authenticated session - E2E auth not configured");
  });
});
