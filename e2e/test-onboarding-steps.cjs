const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const n = new Date().toISOString();
  await page.addInitScript(({ now }) => {
    localStorage.clear();
    localStorage.setItem('pps_guest', 'true');
    localStorage.setItem('pps_guest_name', 'Jayadeep');
    localStorage.setItem('pps_guest_created_at', now);
    localStorage.setItem('theme', 'dark');
    document.cookie = 'pps_gt=' + encodeURIComponent(now) + '; max-age=31536000; path=/';
  }, { now: n });

  await page.goto('http://localhost:5173/Personal-Performance-System/#/onboarding');
  await page.waitForTimeout(1000);

  const outDir = path.resolve(__dirname, '..', 'screenshots', 'deep-ux-audit');

  // Step 1
  await page.screenshot({ path: path.join(outDir, 'onboard-step1-desktop.png'), fullPage: false });
  await page.screenshot({ path: path.join(outDir, 'onboard-step1-fullpage.png'), fullPage: true });

  // Click Next
  const nextBtn1 = await page.$('button:has-text("Next")');
  if (nextBtn1) {
    await nextBtn1.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'onboard-step2-desktop.png'), fullPage: false });
    await page.screenshot({ path: path.join(outDir, 'onboard-step2-fullpage.png'), fullPage: true });
  }

  // Click Next to Step 3
  const nextBtn2 = await page.$('button:has-text("Next")');
  if (nextBtn2) {
    await nextBtn2.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'onboard-step3-desktop.png'), fullPage: false });
    await page.screenshot({ path: path.join(outDir, 'onboard-step3-fullpage.png'), fullPage: true });
  }

  // Click Next to Step 4
  const nextBtn3 = await page.$('button:has-text("Next")');
  if (nextBtn3) {
    await nextBtn3.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'onboard-step4-desktop.png'), fullPage: false });
    await page.screenshot({ path: path.join(outDir, 'onboard-step4-fullpage.png'), fullPage: true });
  }

  console.log('✓ Successfully captured all onboarding step screens!');
  await browser.close();
})();
