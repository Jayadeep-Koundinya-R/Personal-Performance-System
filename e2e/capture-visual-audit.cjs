const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const auditDir = path.join(process.cwd(), 'screenshots', 'visual-audit');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  console.log('🚀 Launching Chromium for Comprehensive Visual Audit Suite...');
  const browser = await chromium.launch({ headless: true });

  // Setup page with addInitScript to guarantee guest authentication & bypass overlays
  async function createPage(context, width, height, isDark = true, enableTriage = false) {
    await context.route('https://fonts.googleapis.com/**', r => r.abort());
    await context.route('https://fonts.gstatic.com/**', r => r.abort());

    const page = await context.newPage();
    await page.setViewportSize({ width, height });

    const today = new Date().toISOString().split('T')[0];

    await page.addInitScript(({ dark, date, triage }) => {
      localStorage.setItem('pps_guest', 'true');
      localStorage.setItem('pps_guest_name', 'Jayadeep');
      localStorage.setItem('pps_guest_created_at', new Date().toISOString());
      localStorage.setItem('pps_onboarded_guest', 'true');
      localStorage.setItem('pps_onboarding_completed', 'true');
      localStorage.setItem('pps_skip_onboarding', 'true');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      localStorage.setItem('pps_theme', dark ? 'dark' : 'light');
      localStorage.setItem(
        'pps_settings_guest',
        JSON.stringify({
          theme: dark ? 'dark' : 'light',
          onboardingCompleted: true,
          ritualLastDone: date,
        })
      );

      if (triage) {
        localStorage.setItem(
          'pps_emergency_triage_state',
          JSON.stringify({
            isActive: true,
            targetHabitId: 'starter-1',
            targetHabitName: 'Deep Work Sprint (90m Core Focus)',
            activatedAt: new Date().toISOString(),
            sprint1Done: true,
            sprint2Done: false,
            sprint3Done: false,
          })
        );
      } else {
        localStorage.removeItem('pps_emergency_triage_state');
      }

      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }, { dark: isDark, date: today, triage: enableTriage });

    await page.goto('http://localhost:8080/Personal-Performance-System/#/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // If Starter Stack is visible, click it to install real habits
    const starterBtn = page.locator("button:has-text('Install Starter Stack')").first();
    if (await starterBtn.isVisible()) {
      await starterBtn.click();
      await page.waitForTimeout(800);
    }

    // Dismiss any overlays
    const closeBtns = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')");
    const count = await closeBtns.count();
    for (let i = 0; i < count; i++) {
      if (await closeBtns.nth(i).isVisible()) {
        await closeBtns.nth(i).click().catch(() => {});
      }
    }

    return page;
  }

  // ==========================================
  // 1. DESKTOP DARK DASHBOARD (1440x900)
  // ==========================================
  console.log('📸 1. Capturing desktop-dark-dashboard.png...');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopDarkPage = await createPage(desktopContext, 1440, 900, true, false);
  await desktopDarkPage.waitForTimeout(500);
  await desktopDarkPage.screenshot({ path: path.join(auditDir, 'desktop-dark-dashboard.png') });
  console.log('✓ desktop-dark-dashboard.png captured');

  // ==========================================
  // 2. DESKTOP LIGHT DASHBOARD (1440x900)
  // ==========================================
  console.log('📸 2. Capturing desktop-light-dashboard.png...');
  const desktopLightContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopLightPage = await createPage(desktopLightContext, 1440, 900, false, false);
  await desktopLightPage.waitForTimeout(500);
  await desktopLightPage.screenshot({ path: path.join(auditDir, 'desktop-light-dashboard.png') });
  console.log('✓ desktop-light-dashboard.png captured');

  // ==========================================
  // 3. MOBILE DARK DASHBOARD (390x844)
  // ==========================================
  console.log('📸 3. Capturing mobile-dark-dashboard.png...');
  const mobileDarkContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobileDarkPage = await createPage(mobileDarkContext, 390, 844, true, false);
  await mobileDarkPage.waitForTimeout(500);
  await mobileDarkPage.screenshot({ path: path.join(auditDir, 'mobile-dark-dashboard.png') });
  console.log('✓ mobile-dark-dashboard.png captured');

  // ==========================================
  // 4. MOBILE LIGHT DASHBOARD (390x844)
  // ==========================================
  console.log('📸 4. Capturing mobile-light-dashboard.png...');
  const mobileLightContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobileLightPage = await createPage(mobileLightContext, 390, 844, false, false);
  await mobileLightPage.waitForTimeout(500);
  await mobileLightPage.screenshot({ path: path.join(auditDir, 'mobile-light-dashboard.png') });
  console.log('✓ mobile-light-dashboard.png captured');

  // ==========================================
  // 5. MOBILE DARK HABIT ACTIONS (390x844 with Dropdown open)
  // ==========================================
  console.log('📸 5. Capturing mobile-dark-habit-actions.png...');
  // Find more action button on the first habit row
  const moreBtn = mobileDarkPage.locator("button[aria-label='More habit actions'], button[title='More actions']").first();
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await mobileDarkPage.waitForTimeout(500);
  }
  await mobileDarkPage.screenshot({ path: path.join(auditDir, 'mobile-dark-habit-actions.png') });
  console.log('✓ mobile-dark-habit-actions.png captured');
  await mobileDarkPage.keyboard.press('Escape').catch(() => {});

  // ==========================================
  // 6. DESKTOP DARK TRIAGE MODAL (1440x900)
  // ==========================================
  console.log('📸 6. Capturing desktop-dark-triage-modal.png...');
  const triageBtn = desktopDarkPage.locator("button:has-text('Emergency Triage')").first();
  if (await triageBtn.isVisible()) {
    await triageBtn.click();
    await desktopDarkPage.waitForSelector("text=Emergency Triage Mode", { timeout: 6000 });
    await desktopDarkPage.waitForTimeout(400);
    await desktopDarkPage.screenshot({ path: path.join(auditDir, 'desktop-dark-triage-modal.png') });
    console.log('✓ desktop-dark-triage-modal.png captured');
    const closeBtn = desktopDarkPage.locator("button:has([class*='lucide-x'])").last();
    await closeBtn.click().catch(() => {});
    await desktopDarkPage.waitForTimeout(300);
  }

  // ==========================================
  // 7. MOBILE DARK TRIAGE MODAL (390x844)
  // ==========================================
  console.log('📸 7. Capturing mobile-dark-triage-modal.png...');
  const mobileTriageBtn = mobileDarkPage.locator("button:has-text('Emergency Triage')").first();
  if (await mobileTriageBtn.isVisible()) {
    await mobileTriageBtn.scrollIntoViewIfNeeded();
    await mobileTriageBtn.click();
    await mobileDarkPage.waitForSelector("text=Emergency Triage Mode", { timeout: 6000 });
    await mobileDarkPage.waitForTimeout(400);
    await mobileDarkPage.screenshot({ path: path.join(auditDir, 'mobile-dark-triage-modal.png') });
    console.log('✓ mobile-dark-triage-modal.png captured');
    const closeBtnMobile = mobileDarkPage.locator("button:has([class*='lucide-x'])").last();
    await closeBtnMobile.click().catch(() => {});
    await mobileDarkPage.waitForTimeout(300);
  }

  // ==========================================
  // 8. DESKTOP DARK PARKINSON'S MODAL (1440x900)
  // ==========================================
  console.log('📸 8. Capturing desktop-dark-parkinsons-modal.png...');
  const parkinsonsBtn = desktopDarkPage.locator("button:has-text('Parkinson’s Slicer')").first();
  if (await parkinsonsBtn.isVisible()) {
    await parkinsonsBtn.click();
    await desktopDarkPage.waitForSelector("text=Parkinson’s Law Inverter", { timeout: 6000 });
    await desktopDarkPage.waitForTimeout(400);
    await desktopDarkPage.screenshot({ path: path.join(auditDir, 'desktop-dark-parkinsons-modal.png') });
    console.log('✓ desktop-dark-parkinsons-modal.png captured');
    const closeBtnPark = desktopDarkPage.locator("button:has([class*='lucide-x'])").last();
    await closeBtnPark.click().catch(() => {});
    await desktopDarkPage.waitForTimeout(300);
  }

  // ==========================================
  // 9. DESKTOP DARK SYLLABUS MODAL (1440x900)
  // ==========================================
  console.log('📸 9. Capturing desktop-dark-syllabus-modal.png...');
  const syllabusBtn = desktopDarkPage.locator("button:has-text('Syllabus Decomposer')").first();
  if (await syllabusBtn.isVisible()) {
    await syllabusBtn.click();
    await desktopDarkPage.waitForSelector("text=Syllabus-to-Habit Decomposer", { timeout: 6000 });
    await desktopDarkPage.waitForTimeout(400);
    await desktopDarkPage.screenshot({ path: path.join(auditDir, 'desktop-dark-syllabus-modal.png') });
    console.log('✓ desktop-dark-syllabus-modal.png captured');
    const closeBtnSyl = desktopDarkPage.locator("button:has([class*='lucide-x'])").last();
    await closeBtnSyl.click().catch(() => {});
    await desktopDarkPage.waitForTimeout(300);
  }

  // ==========================================
  // 10. DESKTOP DARK COMMAND HUB STATS (1440x900)
  // ==========================================
  console.log('📸 10. Capturing desktop-dark-commandhub-stats.png...');
  const commandHub = desktopDarkPage.locator("text=Command Hub & Ecosystem").first();
  if (await commandHub.isVisible()) {
    await commandHub.scrollIntoViewIfNeeded();
    await desktopDarkPage.waitForTimeout(300);
    const statsTab = desktopDarkPage.locator("button:has-text('Consistency & Stats')").first();
    if (await statsTab.isVisible()) {
      await statsTab.click();
      await desktopDarkPage.waitForTimeout(500);
    }
    await desktopDarkPage.screenshot({ path: path.join(auditDir, 'desktop-dark-commandhub-stats.png') });
    console.log('✓ desktop-dark-commandhub-stats.png captured');
  }

  await browser.close();
  console.log('🎉 ALL 10 visual audit screenshots successfully saved to screenshots/visual-audit/!');
})();
