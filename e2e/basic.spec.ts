import { test, expect } from "@playwright/test";

test.describe("PPS Basic E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("./");
    await expect(page).toHaveTitle(/PPS/);
    await expect(page.locator("text=Build better habits")).toBeVisible();
  });

  test("navigation to pricing page works", async ({ page }) => {
    await page.goto("./");
    await page.click("a:has-text('Pricing')");
    await expect(page).toHaveURL(/.*pricing/);
  });

  test("navigation to login page works", async ({ page }) => {
    await page.goto("./");
    await page.click("a:has-text('Login')");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator("h2:has-text('Welcome back')")).toBeVisible();
  });

  test("sign up button navigates to signup", async ({ page }) => {
    await page.goto("./");
    await page.click("a:has-text('Sign Up Free')");
    await expect(page).toHaveURL(/.*login.*signup/);
  });
});
