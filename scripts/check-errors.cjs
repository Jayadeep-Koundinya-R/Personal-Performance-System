const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];
  page.on("pageerror", (err) => errors.push("PAGE_ERROR: " + err.message + "\n" + err.stack));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("CONSOLE_ERROR: " + msg.text());
    if (msg.type() === "warn") warnings.push("CONSOLE_WARN: " + msg.text());
  });

  await page.addInitScript(() => {
    localStorage.setItem("pps_guest", "true");
    localStorage.setItem("pps_guest_created_at", new Date().toISOString());
    localStorage.setItem("pps_onboarded_guest", "true");
    localStorage.setItem("pps_onboarding_completed", "true");
  });

  try {
    await page.goto("http://localhost:8080/Personal-Performance-System/#/dashboard", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
  } catch (e) {
    errors.push("GOTO_ERROR: " + e.message);
  }

  await page.waitForTimeout(3000);
  console.log("ERRORS_COUNT:", errors.length);
  errors.forEach((e) => console.log(e));
  console.log("WARNINGS_COUNT:", warnings.length);
  warnings.forEach((w) => console.log(w));

  // Also check without guest (fresh landing)
  const page2 = await context.newPage();
  const errors2 = [];
  page2.on("pageerror", (err) => errors2.push("LANDING_PAGE_ERROR: " + err.message + "\n" + err.stack));
  page2.on("console", (msg) => {
    if (msg.type() === "error") errors2.push("LANDING_CONSOLE_ERROR: " + msg.text());
  });
  try {
    await page2.goto("http://localhost:8080/Personal-Performance-System/#/", {
      waitUntil: "networkidle",
      timeout: 10000,
    });
  } catch (e) {
    errors2.push("LANDING_GOTO_ERROR: " + e.message);
  }
  await page2.waitForTimeout(2000);
  console.log("LANDING_ERRORS_COUNT:", errors2.length);
  errors2.forEach((e) => console.log(e));

  await browser.close();
})();

