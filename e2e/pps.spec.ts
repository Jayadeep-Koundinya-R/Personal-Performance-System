import { test, expect, Page } from "@playwright/test";

async function dismissOverlays(page: Page) {
  const dismissBtn = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')").first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
  }
}

test.describe("PPS Priority User Flows & Regression Guard E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    await page.evaluate(() => {
      localStorage.clear();
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(
        "pps_settings_guest",
        JSON.stringify({ onboardingCompleted: true, ritualLastDone: today, avatarInitialized: true })
      );
    });
  });

  test("Flow A: Guest Demo Entry -> Habit Manager -> Starter Habits Rendered", async ({ page }) => {
    await page.goto("./login");

    // Click Demo button
    await page.click("button:has-text('Try 7-Day Free Demo')");

    // Fill guest name input
    const nameInput = page.locator('input[placeholder="Enter your name (e.g. Alex)"]');
    await nameInput.waitFor({ state: "visible", timeout: 5000 });
    await nameInput.fill("E2E Tester");

    // Click Start 7-Day Demo Trial button inside modal
    await page.click("button:has-text('Start 7-Day Demo Trial')");

    // Expect redirection to dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    await dismissOverlays(page);

    // Navigate to Habit Manager section
    await page.click("li:has-text('Habit Manager')");
    await expect(page.locator("text=Habit Architect").first()).toBeVisible();
    await expect(page.locator("text=Hydrate & Drink Water").first()).toBeVisible();
  });

  test("Flow B: Pricing Page Location Modal & Regional Currency Persistence", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("pps_billing_region"));
    await page.goto("./pricing");

    // Quick select India from location modal
    const indiaBtn = page.locator("button:has-text('🇮🇳 India')").first();
    if (await indiaBtn.isVisible()) {
      await indiaBtn.click();
    }

    // Verify localized INR price
    await expect(page.locator("text=₹199").first()).toBeVisible();

    // Reload page and confirm persistent choice
    await page.reload();
    await expect(page.locator("text=₹199").first()).toBeVisible();
  });

  test("Flow C: Create a Reminder -> Confirm Displayed in Schedule List", async ({ page }) => {
    await page.goto("./login");

    await page.click("button:has-text('Try 7-Day Free Demo')");
    const nameInput = page.locator('input[placeholder="Enter your name (e.g. Alex)"]');
    await nameInput.waitFor({ state: "visible", timeout: 5000 });
    await nameInput.fill("Reminder Tester");
    await page.click("button:has-text('Start 7-Day Demo Trial')");

    await expect(page).toHaveURL(/.*dashboard/);

    await dismissOverlays(page);

    // Navigate to Reminders sidebar item
    await page.click("li:has-text('Reminders')");
    await expect(page.locator("text=Reminders & Alarm Studio")).toBeVisible();

    // Click Set New Alarm
    await page.click("button:has-text('Set New Alarm')");
    await page.fill('input[placeholder="e.g. Drink 500ml Water"]', "E2E Test Water Break");
    await page.fill('input[type="time"]', "10:30");
    await page.click("button:has-text('Save Alarm')");

    // Assert alarm item rendered in list
    await expect(page.locator("text=E2E Test Water Break")).toBeVisible();
  });

  test("Flow D: Sequential Navigation across main sidebar sections (Zero Crashes)", async ({ page }) => {
    await page.goto("./login");

    await page.click("button:has-text('Try 7-Day Free Demo')");
    const nameInput = page.locator('input[placeholder="Enter your name (e.g. Alex)"]');
    await nameInput.waitFor({ state: "visible", timeout: 5000 });
    await nameInput.fill("Nav Tester");
    await page.click("button:has-text('Start 7-Day Demo Trial')");

    await expect(page).toHaveURL(/.*dashboard/);

    await dismissOverlays(page);

    const navItems = ["Dashboard", "Focus Studio", "Analytics", "Streak Engine", "Achievements", "Reminders", "Settings"];

    for (const label of navItems) {
      await page.click(`li:has-text('${label}')`);
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });
});
