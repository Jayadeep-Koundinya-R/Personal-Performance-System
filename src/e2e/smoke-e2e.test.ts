import { test, expect } from "@playwright/test";

test.describe("Smoke E2E", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("http://localhost:8080/Personal-Performance-System/#/");
    const title = await page.title();
    expect(title).toBeTruthy();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
