const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const screenshotDir = path.join(process.cwd(), 'screenshots', 'phase-3');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log('🚀 Launching Chromium to capture Phase 3 real browser screenshots...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // 1. Log in via 1-click Demo Profile
  console.log('Navigating to login page...');
  await page.goto('http://localhost:8080/Personal-Performance-System/#/login');
  await page.waitForLoadState('domcontentloaded');

  const demoTab = page.locator("button:has-text('Demo')").first();
  await demoTab.waitFor({ state: 'visible', timeout: 8000 });
  await demoTab.click();
  await page.waitForTimeout(500);

  const nameInput = page.locator('input[placeholder*="Alex"]').first();
  await nameInput.fill('Alex Morgan');
  const enterBtn = page.locator("button:has-text('Enter 7-Day Demo Dashboard')").first();
  await enterBtn.click();

  console.log('Waiting for Dashboard...');
  await page.waitForURL(/.*(dashboard|onboarding)/, { timeout: 10000 });

  // If redirected to onboarding, mark completed and go directly to dashboard
  await page.evaluate(() => {
    localStorage.setItem('pps_onboarded_guest', 'true');
    localStorage.setItem('pps_onboarding_completed', 'true');
    localStorage.setItem('pps_skip_onboarding', 'true');
    const settings = JSON.parse(localStorage.getItem('pps_settings_guest') || '{}');
    settings.onboardingCompleted = true;
    localStorage.setItem('pps_settings_guest', JSON.stringify(settings));
  });
  await page.goto('http://localhost:8080/Personal-Performance-System/#/dashboard');
  await page.waitForTimeout(2000);

  // Dismiss any overlays
  const dismissBtn = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')").first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
  }

  // --- DESKTOP DARK THEME ---
  console.log('Capturing Desktop Dark screenshots...');
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('pps_theme', 'dark');
  });
  await page.waitForTimeout(600);

  // 1. Dashboard Dark
  await page.screenshot({ path: path.join(screenshotDir, 'desktop-dark-01-dashboard.png') });
  console.log('✓ Captured desktop-dark-01-dashboard.png');

  // 2. Parkinson's Law Inverter Modal Dark
  const slicerBtn = page.locator("button:has-text('Parkinson’s Slicer')").first();
  if (await slicerBtn.isVisible()) {
    await slicerBtn.click();
    await page.waitForSelector("text=Parkinson’s Law Inverter", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop-dark-02-parkinsons-modal.png') });
    console.log('✓ Captured desktop-dark-02-parkinsons-modal.png');
    // Close modal
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 3. Emergency Triage Modal Dark
  const triageBtn = page.locator("button:has-text('Emergency Triage')").first();
  if (await triageBtn.isVisible()) {
    await triageBtn.click();
    await page.waitForSelector("text=Emergency Triage Mode", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop-dark-03-triage-modal.png') });
    console.log('✓ Captured desktop-dark-03-triage-modal.png');
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 4. Syllabus Decomposer Modal Dark
  const syllabusBtn = page.locator("button:has-text('Syllabus Decomposer')").first();
  if (await syllabusBtn.isVisible()) {
    await syllabusBtn.click();
    await page.waitForSelector("text=Syllabus-to-Habit Decomposer", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop-dark-04-syllabus-modal.png') });
    console.log('✓ Captured desktop-dark-04-syllabus-modal.png');
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 5. Settings Persona Selection Dark
  console.log('Navigating to Settings Section...');
  await page.goto('http://localhost:8080/Personal-Performance-System/#/settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'desktop-dark-05-settings-personas.png') });
  console.log('✓ Captured desktop-dark-05-settings-personas.png');

  // --- DESKTOP LIGHT THEME ---
  console.log('Capturing Desktop Light screenshots...');
  await page.goto('http://localhost:8080/Personal-Performance-System/#/dashboard');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('pps_theme', 'light');
  });
  await page.waitForTimeout(600);

  // 6. Dashboard Light
  await page.screenshot({ path: path.join(screenshotDir, 'desktop-light-01-dashboard.png') });
  console.log('✓ Captured desktop-light-01-dashboard.png');

  // 7. Parkinson's Law Inverter Modal Light
  if (await slicerBtn.isVisible()) {
    await slicerBtn.click();
    await page.waitForSelector("text=Parkinson’s Law Inverter", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop-light-02-parkinsons-modal.png') });
    console.log('✓ Captured desktop-light-02-parkinsons-modal.png');
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 8. Emergency Triage Modal Light
  if (await triageBtn.isVisible()) {
    await triageBtn.click();
    await page.waitForSelector("text=Emergency Triage Mode", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'desktop-light-03-triage-modal.png') });
    console.log('✓ Captured desktop-light-03-triage-modal.png');
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // --- MOBILE (390px) ---
  console.log('Capturing Mobile screenshots (390px viewport)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
    localStorage.setItem('pps_theme', 'dark');
  });
  await page.waitForTimeout(600);

  // 9. Mobile Dark Dashboard
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-dark-01-dashboard.png') });
  console.log('✓ Captured mobile-dark-01-dashboard.png');

  // 10. Mobile Dark Triage Modal
  if (await triageBtn.isVisible()) {
    await triageBtn.click();
    await page.waitForSelector("text=Emergency Triage Mode", { timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, 'mobile-dark-02-triage.png') });
    console.log('✓ Captured mobile-dark-02-triage.png');
    const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // 11. Mobile Light Dashboard
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    localStorage.setItem('pps_theme', 'light');
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(screenshotDir, 'mobile-light-01-dashboard.png') });
  console.log('✓ Captured mobile-light-01-dashboard.png');

  await browser.close();
  console.log('🎉 All Phase 3 screenshots captured successfully!');
})();
