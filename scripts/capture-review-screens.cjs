const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = "C:\\Users\\rjaya\\.gemini\\antigravity\\brain\\edee13a3-6cb9-4f08-9a0b-2004b4ea6de5";
const OUT_DIR = path.join(ARTIFACT_DIR, "screenshots");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Screen 1: Auth Truth Login Screen ──
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto("http://localhost:8080/Personal-Performance-System/#/login", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    await page.waitForTimeout(1000);

    const outPath = path.join(OUT_DIR, "v05-v06-login-auth-truth.png");
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved: ${outPath}`);
    await context.close();
  }

  // ── Screen 2: Authentic Empty State for New Account ──
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Authenticated user session with 0 habits in database
      const user = { email: "alex@example.com", isGuest: false, id: "usr_alex_real_uuid" };
      localStorage.setItem("pps_local_session", JSON.stringify(user));
      localStorage.setItem("pps_onboarding_completed", "true");
      localStorage.setItem("pps_theme", "dark");
      localStorage.setItem("pps_settings_alex@example.com", JSON.stringify({
        theme: "dark",
        onboardingCompleted: true,
        ritualLastDone: new Date().toISOString().split("T")[0],
      }));
    });

    await page.goto("http://localhost:8080/Personal-Performance-System/#/dashboard", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    await page.waitForTimeout(1500);

    const outPath = path.join(OUT_DIR, "v06-authentic-empty-state.png");
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${outPath}`);
    await context.close();
  }

  // ── Screen 3: Populated Dashboard with Notification Bar & Reason Engine ──
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();
    const today = new Date().toISOString().split("T")[0];
    await page.addInitScript(({ tDate }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("pps_guest", "true");
      localStorage.setItem("pps_guest_created_at", new Date().toISOString());
      localStorage.setItem("pps_theme", "dark");
      localStorage.setItem("pps_onboarded_guest", "true");
      localStorage.setItem("pps_onboarding_completed", "true");
      localStorage.setItem("pps_settings_guest", JSON.stringify({
        theme: "dark",
        onboardingCompleted: true,
        ritualLastDone: tDate,
      }));
    }, { tDate: today });

    await page.goto("http://localhost:8080/Personal-Performance-System/#/dashboard", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    // Dismiss any lingering overlay if present
    try {
      const skipBtn = await page.$("button:has-text('Skip for Today')");
      if (skipBtn) await skipBtn.click();
    } catch {}

    await page.waitForTimeout(1000);

    const outPath = path.join(OUT_DIR, "v06-dashboard-with-notification-bar.png");
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${outPath}`);
    await context.close();
  }

  // ── Screen 4: Mobile Viewport (390 x 844 iPhone 14 / modern Android) ──
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    const page = await context.newPage();
    const today = new Date().toISOString().split("T")[0];
    await page.addInitScript(({ tDate }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("pps_guest", "true");
      localStorage.setItem("pps_guest_created_at", new Date().toISOString());
      localStorage.setItem("pps_theme", "dark");
      localStorage.setItem("pps_onboarded_guest", "true");
      localStorage.setItem("pps_onboarding_completed", "true");
      localStorage.setItem("pps_settings_guest", JSON.stringify({
        theme: "dark",
        onboardingCompleted: true,
        ritualLastDone: tDate,
      }));
    }, { tDate: today });

    await page.goto("http://localhost:8080/Personal-Performance-System/#/dashboard", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    try {
      const skipBtn = await page.$("button:has-text('Skip for Today')");
      if (skipBtn) await skipBtn.click();
    } catch {}

    await page.waitForTimeout(1000);

    const outPath = path.join(OUT_DIR, "v06-dashboard-mobile-390px.png");
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${outPath}`);
    await context.close();
  }

  await browser.close();
  console.log("All review screenshots successfully captured!");
})();
