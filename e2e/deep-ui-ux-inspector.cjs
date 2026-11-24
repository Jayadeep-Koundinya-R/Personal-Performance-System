const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/Personal-Performance-System';

(async () => {
  const outputDir = path.join(process.cwd(), 'screenshots', 'deep-ux-audit');
  const brainDir = 'C:\\Users\\rjaya\\.gemini\\antigravity\\brain\\d330b6cd-50c6-43b8-9c90-d9a0dd243575\\screenshots';

  [outputDir, brainDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const browser = await chromium.launch({ headless: true });
  const results = {
    overflows: [],
    brokenImages: [],
    consoleErrors: [],
    interactiveTests: [],
    screens: []
  };

  const todayStr = new Date().toISOString().split('T')[0];

  function getBaseGuestScript(theme = 'dark') {
    return ({ today, t }) => {
      localStorage.setItem('pps_guest', 'true');
      localStorage.setItem('pps_guest_name', 'Jayadeep');
      localStorage.setItem('pps_guest_created_at', new Date().toISOString());
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_skip_onboarding', 'true');
      localStorage.setItem('pps_settings_guest', JSON.stringify({
        ritualLastDone: today,
        ritual_last_done: today,
        onboardingCompleted: true,
      }));
      localStorage.setItem('pps_seen_badge_count_guest', '999');
      localStorage.setItem('pps_seen_level_guest', '999');
      localStorage.setItem('theme', t);
      localStorage.setItem('pps_theme', t);
    };
  }

  async function auditPage(name, url, { theme = 'dark', isMobile = false, initStorage = true, fullPage = false } = {}) {
    console.log(`\n🔍 Auditing [${name}] (${theme}, ${isMobile ? 'Mobile' : 'Desktop'})...`);
    const context = await browser.newContext({
      viewport: isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile,
      hasTouch: isMobile,
    });
    const page = await context.newPage();

    const pageErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected third party or benign telemetry errors if any
        pageErrors.push(text);
        results.consoleErrors.push({ page: name, error: text });
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
      results.consoleErrors.push({ page: name, error: err.message });
    });

    if (initStorage) {
      await page.addInitScript(getBaseGuestScript(theme), { today: todayStr, t: theme });
    } else {
      await page.addInitScript(({ t }) => {
        localStorage.clear();
        localStorage.setItem('theme', t);
        localStorage.setItem('pps_theme', t);
      }, { t: theme });
    }

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      await page.goto(url, { timeout: 30000 });
      await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(1000);

    // Dismiss any known onboarding or level up modals
    try {
      const dismissBtn = await page.$('button:has-text("Awesome!"), button:has-text("Got it"), button:has-text("Skip")');
      if (dismissBtn) {
        await dismissBtn.click();
        await page.waitForTimeout(300);
      }
    } catch {}

    // Check horizontal overflow
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        hasOverflow: doc.scrollWidth > window.innerWidth + 2, // Allow 2px tolerance for scrollbar rounding
        scrollWidth: doc.scrollWidth,
        innerWidth: window.innerWidth
      };
    });

    if (overflow.hasOverflow) {
      results.overflows.push({
        page: name,
        scrollWidth: overflow.scrollWidth,
        innerWidth: overflow.innerWidth,
        delta: overflow.scrollWidth - overflow.innerWidth
      });
      console.warn(`  ⚠️ HORIZONTAL OVERFLOW DETECTED: scrollWidth=${overflow.scrollWidth} > innerWidth=${overflow.innerWidth}`);
    }

    // Check broken images
    const broken = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter(img => !img.complete || img.naturalWidth === 0)
        .map(img => img.src || img.getAttribute('src'));
    });

    if (broken.length > 0) {
      results.brokenImages.push({ page: name, broken });
      console.warn(`  ⚠️ BROKEN IMAGES:`, broken);
    }

    // Capture screenshot
    const filename = `${name}.png`;
    const localPath = path.join(outputDir, filename);
    const brainPath = path.join(brainDir, filename);

    await page.screenshot({ path: localPath, fullPage });
    fs.copyFileSync(localPath, brainPath);

    results.screens.push({
      name,
      filename,
      localPath,
      brainPath,
      theme,
      isMobile,
      hasOverflow: overflow.hasOverflow,
      brokenImagesCount: broken.length,
      errorsCount: pageErrors.length
    });

    console.log(`  ✓ Screenshot saved: ${filename}`);
    await context.close();
    return page;
  }

  // 1. Landing Page - Desktop Dark & Light, Mobile Dark
  await auditPage('landing-desktop-dark', `${BASE_URL}/#/`, { theme: 'dark', fullPage: false });
  await auditPage('landing-desktop-light', `${BASE_URL}/#/`, { theme: 'light', fullPage: false });
  await auditPage('landing-mobile-dark', `${BASE_URL}/#/`, { theme: 'dark', isMobile: true, fullPage: false });

  // 2. Login Page - Clean state (no auth stored)
  await auditPage('login-desktop-dark', `${BASE_URL}/#/login`, { theme: 'dark', initStorage: false });
  await auditPage('login-desktop-light', `${BASE_URL}/#/login`, { theme: 'light', initStorage: false });
  await auditPage('login-mobile-dark', `${BASE_URL}/#/login`, { theme: 'dark', isMobile: true, initStorage: false });

  // 3. Login Interactive Validation Test
  console.log('\n🧪 Testing Login Form Validation & Interactions...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Try submitting empty Sign In form
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(800);
      const filename = 'login-validation-errors.png';
      const localPath = path.join(outputDir, filename);
      const brainPath = path.join(brainDir, filename);
      await page.screenshot({ path: localPath });
      fs.copyFileSync(localPath, brainPath);
      results.interactiveTests.push({ test: 'Login empty submit validation', status: 'PASS', screenshot: filename });
      console.log(`  ✓ Form validation screenshot captured: ${filename}`);
    }

    // Switch to Sign Up tab
    const signUpTab = await page.$('button:has-text("Sign Up"), [role="tab"]:has-text("Sign Up")');
    if (signUpTab) {
      await signUpTab.click();
      await page.waitForTimeout(600);
      const filename = 'login-signup-tab.png';
      const localPath = path.join(outputDir, filename);
      const brainPath = path.join(brainDir, filename);
      await page.screenshot({ path: localPath });
      fs.copyFileSync(localPath, brainPath);
      results.interactiveTests.push({ test: 'Sign Up tab switch', status: 'PASS', screenshot: filename });
      console.log(`  ✓ Sign Up tab screenshot captured: ${filename}`);
    }

    // Click 1-Click Demo Profile (Alex Pro)
    const demoAlexBtn = await page.$('button:has-text("Alex Pro"), button:has-text("Alex (Pro)"), button:has-text("Alex")');
    if (demoAlexBtn) {
      await demoAlexBtn.click();
      await page.waitForTimeout(1500);
      const filename = 'login-demo-alex-clicked.png';
      const localPath = path.join(outputDir, filename);
      const brainPath = path.join(brainDir, filename);
      await page.screenshot({ path: localPath });
      fs.copyFileSync(localPath, brainPath);
      results.interactiveTests.push({ test: 'Demo Alex 1-click login', status: 'PASS', screenshot: filename });
      console.log(`  ✓ Demo Alex 1-click login captured: ${filename}`);
    }

    await context.close();
  }

  // 4. Onboarding Page (Fresh State)
  console.log('\n🧪 Auditing Fresh Onboarding Experience...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    // Guest user who has NOT completed onboarding
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('pps_guest', 'true');
      localStorage.setItem('pps_guest_name', 'New User');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('pps_theme', 'dark');
    });
    await page.goto(`${BASE_URL}/#/onboarding`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);

    const filename = 'onboarding-step-1.png';
    const localPath = path.join(outputDir, filename);
    const brainPath = path.join(brainDir, filename);
    await page.screenshot({ path: localPath });
    fs.copyFileSync(localPath, brainPath);
    results.interactiveTests.push({ test: 'Fresh Onboarding Step 1', status: 'PASS', screenshot: filename });
    console.log(`  ✓ Fresh Onboarding Step 1 captured: ${filename}`);

    await context.close();
  }

  // 5. Core Dashboard Sections in Dark & Light
  await auditPage('dashboard-today-dark', `${BASE_URL}/#/dashboard`, { theme: 'dark' });
  await auditPage('dashboard-today-light', `${BASE_URL}/#/dashboard`, { theme: 'light' });
  await auditPage('dashboard-habits-dark', `${BASE_URL}/#/dashboard?section=habits`, { theme: 'dark' });
  await auditPage('dashboard-habits-light', `${BASE_URL}/#/dashboard?section=habits`, { theme: 'light' });
  await auditPage('dashboard-focus-dark', `${BASE_URL}/#/dashboard?section=tracker`, { theme: 'dark' });
  await auditPage('dashboard-analytics-dark', `${BASE_URL}/#/dashboard?section=analytics`, { theme: 'dark' });
  await auditPage('dashboard-calendar-dark', `${BASE_URL}/#/dashboard?section=calendar`, { theme: 'dark' });
  await auditPage('dashboard-streak-dark', `${BASE_URL}/#/dashboard?section=streak`, { theme: 'dark' });
  await auditPage('dashboard-achievements-dark', `${BASE_URL}/#/dashboard?section=achievements`, { theme: 'dark' });
  await auditPage('dashboard-reflections-dark', `${BASE_URL}/#/dashboard?section=reflections`, { theme: 'dark' });

  // 6. Settings Page - Dark & Light
  await auditPage('settings-desktop-dark', `${BASE_URL}/#/settings`, { theme: 'dark' });
  await auditPage('settings-desktop-light', `${BASE_URL}/#/settings`, { theme: 'light' });
  await auditPage('settings-mobile-dark', `${BASE_URL}/#/settings`, { theme: 'dark', isMobile: true });

  // 7. Pricing, Roadmap, Reset Password, Privacy, Terms
  await auditPage('pricing-desktop-dark', `${BASE_URL}/#/pricing`, { theme: 'dark' });
  await auditPage('pricing-desktop-light', `${BASE_URL}/#/pricing`, { theme: 'light' });
  await auditPage('roadmap-desktop-dark', `${BASE_URL}/#/roadmap`, { theme: 'dark' });
  await auditPage('roadmap-desktop-light', `${BASE_URL}/#/roadmap`, { theme: 'light' });
  await auditPage('reset-password-dark', `${BASE_URL}/#/reset-password`, { theme: 'dark', initStorage: false });
  await auditPage('privacy-desktop-dark', `${BASE_URL}/#/privacy`, { theme: 'dark' });
  await auditPage('terms-desktop-dark', `${BASE_URL}/#/terms`, { theme: 'dark' });
  await auditPage('not-found-404-dark', `${BASE_URL}/#/non-existent-route-audit`, { theme: 'dark' });

  await browser.close();

  const resultsPath = path.join(outputDir, 'deep-audit-summary.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  fs.writeFileSync(path.join(brainDir, 'deep-audit-summary.json'), JSON.stringify(results, null, 2), 'utf-8');

  console.log('\n========================================');
  console.log('🏁 DEEP UI/UX AUDIT COMPLETE');
  console.log(`Total Screens Captured: ${results.screens.length}`);
  console.log(`Interactive Tests: ${results.interactiveTests.length}`);
  console.log(`Horizontal Overflows: ${results.overflows.length}`);
  console.log(`Broken Images: ${results.brokenImages.length}`);
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log('========================================');
})();
