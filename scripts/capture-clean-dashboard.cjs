const { chromium } = require("@playwright/test");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
    });
    const page = await context.newPage();

    await page.addInitScript(({ t }) => {
      localStorage.clear();
      localStorage.setItem("pps_guest", "true");
      localStorage.setItem("pps_guest_created_at", new Date().toISOString());
      localStorage.setItem("pps_theme", t);
      localStorage.setItem("pps_theme_mode", t);
      localStorage.setItem("pps_onboarded_guest", "true");
      localStorage.setItem("pps_onboarding_completed", "true");
      localStorage.setItem("pps_skip_onboarding", "true");
      // Mark ritual done so modal doesn't pop up
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("pps_settings_guest", JSON.stringify({
        theme: t,
        onboardingCompleted: true,
        ritualLastDone: today,
      }));
    }, { t: theme });

    await page.goto("http://localhost:8080/Personal-Performance-System/#/dashboard", {
      waitUntil: "networkidle",
      timeout: 10000,
    });

    await page.evaluate(({ t }) => {
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    }, { t: theme });

    await page.waitForTimeout(2000);

    // If modal is still present, click skip
    try {
      const skipBtn = await page.$("button:has-text('Skip for Today')");
      if (skipBtn) await skipBtn.click();
    } catch {}

    await page.waitForTimeout(1000);

    const outPath = path.join(process.cwd(), "screenshots", "browser-inspection", `clean-dashboard-${theme}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log(`Saved: clean-dashboard-${theme}.png`);

    await context.close();
  }

  await browser.close();
})();

