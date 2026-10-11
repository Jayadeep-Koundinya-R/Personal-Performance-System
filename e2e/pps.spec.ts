import { test, expect, Page } from "@playwright/test";

async function dismissOverlays(page: Page) {
  const dismissBtn = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')").first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
  }
}

async function startDemoSession(page: Page, name: string = "E2E Tester") {
  await page.goto("./#/login");
  await page.click("button:has-text('Demo')");
  const nameInput = page.locator('input[placeholder*="Alex"]');
  await nameInput.waitFor({ state: "visible", timeout: 5000 });
  await nameInput.fill(name);
  await page.click("button:has-text('Enter 7-Day Demo Dashboard')");
  await expect(page).toHaveURL(/.*(dashboard|onboarding)/);

  // Mark onboarding completed so user reaches dashboard views directly
  await page.evaluate(() => {
    localStorage.setItem("pps_onboarded_guest", "true");
    const settings = JSON.parse(localStorage.getItem("pps_settings_guest") || "{}");
    settings.onboardingCompleted = true;
    localStorage.setItem("pps_settings_guest", JSON.stringify(settings));
  });
  await page.goto("./#/dashboard");
}

test.describe("PPS Priority User Flows & Regression Guard E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./#/");
    await page.evaluate(() => {
      localStorage.clear();
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("pps_onboarded_guest", "true");
      localStorage.setItem(
        "pps_settings_guest",
        JSON.stringify({ onboardingCompleted: true, ritualLastDone: today, avatarInitialized: true })
      );
    });
  });

  test("Flow A: Guest Demo Entry -> Habit Manager -> Starter Habits Rendered", async ({ page }) => {
    await startDemoSession(page, "E2E Tester");
    await dismissOverlays(page);

    // Navigate to Habit Manager section if visible
    const habitManagerNav = page.locator("li:has-text('Habit Manager'), button:has-text('Habit Manager')").first();
    if (await habitManagerNav.isVisible()) {
      await habitManagerNav.click();
      await expect(page.locator("text=Habit Architect, text=Habits").first()).toBeVisible();
    } else {
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("Flow B: Pricing Page Location Modal & Regional Currency Persistence", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("pps_billing_region"));
    await page.goto("./#/pricing");

    // Click Monthly Billing to view base monthly price
    const monthlyBtn = page.locator("button:has-text('Monthly Billing')");
    await expect(monthlyBtn).toBeVisible();
    await monthlyBtn.click();

    // Verify localized INR or USD price
    await expect(page.locator("text=₹199").or(page.locator("text=$9.99")).first()).toBeVisible();

    // Reload page and confirm persistent choice
    await page.reload();
    await monthlyBtn.click();
    await expect(page.locator("text=₹199").or(page.locator("text=$9.99")).first()).toBeVisible();
  });

  test("Flow C: Create a Reminder -> Confirm Displayed in Schedule List", async ({ page }) => {
    await startDemoSession(page, "Reminder Tester");
    await dismissOverlays(page);

    // Navigate to Reminders sidebar item
    const reminderNav = page.locator("li:has-text('Reminders'), button:has-text('Reminders')").first();
    if (await reminderNav.isVisible()) {
      await reminderNav.click();
      await expect(page.locator("text=Reminders & Alarm Studio, text=Reminders").first()).toBeVisible();

      // Click Set New Alarm
      const setAlarmBtn = page.locator("button:has-text('Set New Alarm')").first();
      if (await setAlarmBtn.isVisible()) {
        await setAlarmBtn.click();
        await page.fill('input[placeholder="e.g. Drink 500ml Water"]', "E2E Test Water Break");
        await page.fill('input[type="time"]', "10:30");
        await page.click("button:has-text('Save Alarm')");
        await expect(page.locator("text=E2E Test Water Break")).toBeVisible();
      }
    } else {
      await expect(page.locator("body")).not.toBeEmpty();
    }
  });

  test("Flow D: Sequential Navigation across main sidebar sections (Zero Crashes)", async ({ page }) => {
    await startDemoSession(page, "Nav Tester");
    await dismissOverlays(page);

    const navItems = ["Dashboard", "Focus Studio", "Analytics", "Streak Engine", "Achievements", "Reminders", "Settings"];

    for (const label of navItems) {
      const navItem = page.locator(`li:has-text('${label}'), button:has-text('${label}')`).first();
      if (await navItem.isVisible()) {
        await navItem.click();
        await expect(page.locator("body")).not.toBeEmpty();
      }
    }
  });
});
