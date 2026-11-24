import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080/Personal-Performance-System";

test.describe("Login Page E2E", () => {
  test("renders sign in form by default", async ({ page }) => {
    await page.goto(`${BASE}/#/login`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByPlaceholder("you@email.com").first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in to workspace/i })).toBeVisible();
  });

  test("switches to sign up tab", async ({ page }) => {
    await page.goto(`${BASE}/#/login`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /^sign up$/i }).click();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    await expect(page.getByPlaceholder(/repeat password/i)).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.goto(`${BASE}/#/login`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /^sign up$/i }).click();
    await page.getByPlaceholder(/min 8 chars/i).fill("Password123!");
    await page.getByPlaceholder(/repeat password/i).fill("Different456!");
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test("logs in as guest on demo profile click", async ({ page }) => {
    await page.goto(`${BASE}/#/login`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /^demo$/i }).click();
    await page.getByRole("button", { name: /alex/i }).first().click();
    await expect(page).toHaveURL(/.*#\/dashboard.*/, { timeout: 10000 });
  });
});
