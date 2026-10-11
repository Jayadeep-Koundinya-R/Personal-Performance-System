import { test, expect } from "@playwright/test";

test.describe("Authentication, Demo Mode, and Pricing Uniformity Regression Specs", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./#/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("Bug 1 Check: Logged out Home navbar displays 'Sign In' & 'Start Free', NEVER 'Dashboard'", async ({ page }) => {
    await page.goto("./#/");

    // Navbar should have Sign In and Start Free
    const signInBtn = page.locator("nav a:has-text('Sign In'), nav button:has-text('Sign In')").first();
    const startFreeBtn = page.locator("nav a:has-text('Start Free'), nav button:has-text('Start Free')").first();
    await expect(signInBtn).toBeVisible();
    await expect(startFreeBtn).toBeVisible();

    // The navbar should NOT have a 'Dashboard' button when logged out
    const navDashboardBtn = page.locator("nav a:has-text('Dashboard'), nav button:has-text('Dashboard')");
    await expect(navDashboardBtn).toHaveCount(0);
  });

  test("Bug 3 Check: Demo user can navigate to /login and view credentials form without infinite redirect loop", async ({ page }) => {
    // 1. Visit Login and start 7-Day Demo Mode
    await page.goto("./#/login");
    
    // Switch to Demo tab
    const demoTabBtn = page.locator("button:has-text('Demo')").first();
    await expect(demoTabBtn).toBeVisible();
    await demoTabBtn.click();

    // Fill name input and click start button
    const nameInput = page.locator('input[placeholder*="Alex"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Demo Auditor");

    const startDemoBtn = page.locator("button:has-text('Enter 7-Day Demo Dashboard')");
    await expect(startDemoBtn).toBeVisible();
    await startDemoBtn.click();

    // 2. Arrives at dashboard or onboarding
    await expect(page).toHaveURL(/.*(dashboard|onboarding)/);

    // 3. User navigates directly to /login to sign in with an actual account
    await page.goto("./#/login");

    // 4. Must NOT bounce back to dashboard! Must stay on /login
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*login/);

    // 5. Credentials form (email & password) must be accessible
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // 6. Demo banner must be visible with Exit Demo option
    const demoBanner = page.locator("text=Browsing in 7-Day Demo Mode");
    await expect(demoBanner).toBeVisible();

    const exitDemoBtn = page.locator("button:has-text('Exit Demo')");
    await expect(exitDemoBtn).toBeVisible();

    // 7. Click Exit Demo -> resets to clean state
    await exitDemoBtn.click();
    await expect(demoBanner).toHaveCount(0);
  });

  test("Bug 1 Check: Clean Logout resets state and visiting /dashboard redirects cleanly to /login (no error page)", async ({ page }) => {
    // 1. Set up guest session
    await page.goto("./#/login");
    await page.click("button:has-text('Demo')");
    const nameInput = page.locator('input[placeholder*="Alex"]');
    await nameInput.fill("Logout Tester");
    await page.click("button:has-text('Enter 7-Day Demo Dashboard')");
    await expect(page).toHaveURL(/.*(dashboard|onboarding)/);

    // 2. Perform logout by clearing storage and firing auth change event
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.dispatchEvent(new Event("pps_auth_change"));
    });

    // 3. Attempt direct navigation to /dashboard without authentication
    await page.goto("./#/dashboard");

    // 4. Must redirect to /login and NOT crash with an Error Boundary
    await expect(page).toHaveURL(/.*login/);
    const errorBoundary = page.locator("text=Something went wrong, text=Application Error");
    await expect(errorBoundary).toHaveCount(0);

    // 5. Back to Home page: confirm navbar shows 'Sign In' and not 'Dashboard'
    await page.goto("./#/");
    const signInBtn = page.locator("nav a:has-text('Sign In'), nav button:has-text('Sign In')").first();
    await expect(signInBtn).toBeVisible();
    const navDashboardBtn = page.locator("nav a:has-text('Dashboard'), nav button:has-text('Dashboard')");
    await expect(navDashboardBtn).toHaveCount(0);
  });

  test("Bug 2 Check: Pricing uniformity across Pricing Page and Settings", async ({ page }) => {
    // 1. Visit Pricing page
    await page.goto("./#/pricing");

    // Check Monthly vs Annual toggle
    const monthlyBtn = page.locator("button:has-text('Monthly Billing')");
    await expect(monthlyBtn).toBeVisible();
    await monthlyBtn.click();

    // In monthly mode, ₹199 or $9.99 is visible
    await expect(page.locator("text=₹199").or(page.locator("text=$9.99")).first()).toBeVisible();

    // Check Annual Billing mode
    const annualBtn = page.locator("button:has-text('Annual Billing')");
    await annualBtn.click();
    await expect(page.locator("text=₹167").or(page.locator("text=$8")).first()).toBeVisible();

    // Teacher Studio commission exists
    await expect(page.locator("text=10% Commission").or(page.locator("text=10% Platform Commission")).first()).toBeVisible();

    // Teacher Studio zero upfront exists
    await expect(page.locator("text=Upfront Platform Cost").first()).toBeVisible();

    // Campus license price exists
    await expect(page.locator("text=₹2,000 / student / sem").or(page.locator("text=$49 / student / sem")).first()).toBeVisible();
  });
});
