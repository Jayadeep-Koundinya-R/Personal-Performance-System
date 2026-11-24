import { test, expect } from "@playwright/test";

const BASE = "http://localhost:8080/Personal-Performance-System";

test.describe("Home Page E2E", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("renders hero headline and nav", async ({ page }) => {
    await page.goto(`${BASE}/#/`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('[aria-label="Toggle theme"]')).toBeVisible();
    await expect(page.getByRole("link", { name: /start free/i }).first()).toBeVisible();
  });

  test("scrolls to section when nav button clicked", async ({ page }) => {
    await page.goto(`${BASE}/#/`);
    await page.waitForLoadState("networkidle");

    await page.locator("nav").getByRole("button", { name: /^showcase$/i }).click();
    await expect(page.locator("#showcase")).toBeInViewport();
  });

  test("toggles theme on theme button click", async ({ page }) => {
    await page.goto(`${BASE}/#/`);
    await page.waitForLoadState("networkidle");

    const html = page.locator("html");
    const beforeClass = await html.getAttribute("class");

    await page.locator('[aria-label="Toggle theme"]').click();

    const afterClass = await html.getAttribute("class");
    expect(afterClass).not.toBe(beforeClass);
  });

  test("opens mobile menu on hamburger click", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/#/`);
    await page.waitForLoadState("networkidle");

    await page.locator('[aria-label="Toggle mobile menu"]').click();
    await expect(page.getByRole("button", { name: /product showcase/i })).toBeVisible();
  });

  test("navigates to login from start free link", async ({ page }) => {
    await page.goto(`${BASE}/#/`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /^start free$/i }).first().click();
    await expect(page).toHaveURL(/.*#\/login.*/);
  });
});
