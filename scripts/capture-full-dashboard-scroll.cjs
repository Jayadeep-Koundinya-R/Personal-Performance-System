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
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem("pps_settings_guest", JSON.stringify({
        theme: t,
        onboardingCompleted: true,
        ritualLastDone: today,
      }));
      localStorage.setItem("habits_guest", JSON.stringify([
        {
          id: "h1",
          name: "💻 2 LeetCode Mediums",
          category: "Productivity",
          priority: "High",
          period: "Daily",
          dueDate: today,
          completedDates: [],
          streak: 4,
          freezeCredits: 2,
        },
        {
          id: "h2",
          name: "💧 Sunlight & Hydration",
          category: "Health",
          priority: "Medium",
          period: "Daily",
          dueDate: today,
          completedDates: [],
          streak: 2,
          freezeCredits: 1,
        },
        {
          id: "h3",
          name: "📚 Core CS Concepts (OS / DBMS)",
          category: "Learning",
          priority: "Critical",
          period: "Daily",
          dueDate: today,
          completedDates: [today],
          streak: 7,
          freezeCredits: 3,
        }
      ]));
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

    try {
      const skipBtn = await page.$("button:has-text('Skip for Today')");
      if (skipBtn) await skipBtn.click();
    } catch {}

    await page.waitForTimeout(1000);

    // Scroll main element down 700px
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 700;
    });
    await page.waitForTimeout(1000);

    const outPath = path.join(process.cwd(), "screenshots", "browser-inspection", `dashboard-scrolled-${theme}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: dashboard-scrolled-${theme}.png`);

    await context.close();
  }

  await browser.close();
})();
