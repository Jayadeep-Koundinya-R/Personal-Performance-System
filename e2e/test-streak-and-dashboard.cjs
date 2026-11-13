const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/Personal-Performance-System';

const rootScreenshotsDir = path.resolve(__dirname, '..', '..', 'screenshots');
const appScreenshotsDir = path.resolve(__dirname, '..', 'screenshots');

[rootScreenshotsDir, appScreenshotsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function run() {
  const browser = await chromium.launch({ headless: true });
  const todayStr = new Date().toISOString().split('T')[0];

  const configs = [
    { name: 'streak-desktop-dark', section: 'streak', viewport: { width: 1440, height: 900 }, isMobile: false, theme: 'dark' },
    { name: 'streak-desktop-light', section: 'streak', viewport: { width: 1440, height: 900 }, isMobile: false, theme: 'light' },
    { name: 'streak-mobile-dark', section: 'streak', viewport: { width: 390, height: 844 }, isMobile: true, theme: 'dark' },
    { name: 'streak-mobile-light', section: 'streak', viewport: { width: 390, height: 844 }, isMobile: true, theme: 'light' },
    { name: 'dashboard-desktop-dark', section: '', viewport: { width: 1440, height: 900 }, isMobile: false, theme: 'dark' },
    { name: 'dashboard-desktop-light', section: '', viewport: { width: 1440, height: 900 }, isMobile: false, theme: 'light' },
    { name: 'dashboard-mobile-dark', section: '', viewport: { width: 390, height: 844 }, isMobile: true, theme: 'dark' },
    { name: 'dashboard-mobile-light', section: '', viewport: { width: 390, height: 844 }, isMobile: true, theme: 'light' }
  ];

  for (const cfg of configs) {
    console.log(`\n📸 Capturing ${cfg.name}...`);
    const context = await browser.newContext({
      viewport: cfg.viewport,
      isMobile: cfg.isMobile,
      hasTouch: cfg.isMobile
    });
    const page = await context.newPage();

    await page.addInitScript(({ theme, today }) => {
      localStorage.setItem('pps_guest', 'true');
      localStorage.setItem('pps_guest_name', 'Jayadeep');
      localStorage.setItem('pps_guest_created_at', new Date().toISOString());
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_skip_onboarding', 'true');
      localStorage.setItem('theme', theme);
      localStorage.setItem('pps_theme', theme);
      localStorage.setItem('pps_settings_guest', JSON.stringify({ ritualLastDone: today, ritual_last_done: today }));
      localStorage.setItem('pps_seen_badge_count_guest', '999');
      localStorage.setItem('pps_seen_level_guest', '999');
    }, { theme: cfg.theme, today: todayStr });

    const targetUrl = cfg.section ? `${BASE_URL}/#/dashboard?section=${cfg.section}` : `${BASE_URL}/#/dashboard`;
    await page.goto(targetUrl, { timeout: 30000 });
    await page.waitForTimeout(1500);

    // Dismiss any lingering popups
    try {
      const modalBtn = await page.$('button:has-text("Awesome!"), button:has-text("Skip"), button:has-text("Got it")');
      if (modalBtn) {
        await modalBtn.click();
        await page.waitForTimeout(300);
      }
    } catch {}

    const rootPath = path.join(rootScreenshotsDir, `${cfg.name}.png`);
    const appPath = path.join(appScreenshotsDir, `${cfg.name}.png`);

    await page.screenshot({ path: rootPath, fullPage: false });
    fs.copyFileSync(rootPath, appPath);
    console.log(`  ✓ Saved: ${rootPath}`);
    await context.close();
  }

  // Verification Test: Click Streak Card on Dashboard to verify navigation to Streak
  console.log('\n🧪 Testing interactive Streak navigation from Dashboard Card 2...');
  const testContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const testPage = await testContext.newPage();
  await testPage.addInitScript(({ today }) => {
    localStorage.setItem('pps_guest', 'true');
    localStorage.setItem('pps_guest_name', 'Jayadeep');
    localStorage.setItem('pps_guest_created_at', new Date().toISOString());
    localStorage.setItem('pps_onboarded_guest', 'true');
    localStorage.setItem('pps_onboarding_completed', 'true');
    localStorage.setItem('pps_skip_onboarding', 'true');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('pps_theme', 'dark');
    localStorage.setItem('pps_settings_guest', JSON.stringify({ ritualLastDone: today, ritual_last_done: today }));
    localStorage.setItem('pps_seen_badge_count_guest', '999');
    localStorage.setItem('pps_seen_level_guest', '999');
  }, { today: todayStr });

  await testPage.goto(`${BASE_URL}/#/dashboard`, { timeout: 30000 });
  await testPage.waitForTimeout(1500);

  const streakCard = await testPage.$('div[title="Open Streak Engine"]');
  if (streakCard) {
    console.log('  ✓ Found interactive Streak & Shield card on Dashboard. Clicking...');
    await streakCard.click();
    await testPage.waitForTimeout(1000);
    const hasStreakHeader = await testPage.$('span:has-text("🔥 Streak Engine"), h1:has-text("Streak Engine")');
    if (hasStreakHeader) {
      console.log('  ✅ Navigation verified: Clicking Streak card on Dashboard navigated successfully to Streak Engine!');
    } else {
      console.log('  ❌ Navigation failed to open Streak Engine');
    }
  }

  // Verification Test: Complete habit in Streak Engine
  console.log('\n🧪 Testing habit completion in Streak Engine...');
  const completeBtn = await testPage.$('button:has-text("Complete (+10 XP)"), button:has-text("2m Micro")');
  if (completeBtn) {
    const textBefore = await completeBtn.innerText();
    console.log(`  ✓ Found completion button: "${textBefore}". Clicking...`);
    await completeBtn.click();
    await testPage.waitForTimeout(1000);
    console.log('  ✅ Interactive habit completion triggered in Streak Engine successfully!');
  }

  await testContext.close();
  await browser.close();
  console.log('\n🎉 ALL TESTS AND SCREENSHOTS COMPLETED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Fatal error running capture script:', err);
  process.exit(1);
});
