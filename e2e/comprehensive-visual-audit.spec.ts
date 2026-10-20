import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Comprehensive Visual Audit & UI/UX Layout Remediation', () => {
  const auditDir = path.join(process.cwd(), 'screenshots', 'visual-audit');

  test.beforeAll(() => {
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
  });

  async function setupGuestSession(page: any, isDark = true) {
    await page.goto('http://localhost:8080/Personal-Performance-System/#/login');
    await page.waitForLoadState('domcontentloaded');

    const today = new Date().toISOString().split('T')[0];
    await page.evaluate(({ dark, date }: { dark: boolean; date: string }) => {
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
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }, { dark: isDark, date: today });

    await page.goto('http://localhost:8080/Personal-Performance-System/#/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const starterBtn = page.locator("button:has-text('Install Starter Stack')").first();
    if (await starterBtn.isVisible()) {
      await starterBtn.click();
      await page.waitForTimeout(600);
    }

    const closeBtns = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')");
    const count = await closeBtns.count();
    for (let i = 0; i < count; i++) {
      if (await closeBtns.nth(i).isVisible()) {
        await closeBtns.nth(i).click().catch(() => {});
      }
    }
  }

  test('Capture Desktop & Mobile Visual Audit Screenshots', async ({ page }) => {
    // 1. Desktop Dark
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupGuestSession(page, true);
    await page.screenshot({ path: path.join(auditDir, 'desktop-dark-dashboard.png') });

    // 2. Desktop Light
    await setupGuestSession(page, false);
    await page.screenshot({ path: path.join(auditDir, 'desktop-light-dashboard.png') });

    // 3. Modals on Desktop Dark
    await setupGuestSession(page, true);

    // Emergency Triage Modal
    const triageBtn = page.locator("button:has-text('Emergency Triage')").first();
    if (await triageBtn.isVisible()) {
      await triageBtn.click();
      await page.waitForSelector("text=Emergency Triage Mode", { timeout: 6000 });
      await page.screenshot({ path: path.join(auditDir, 'desktop-dark-triage-modal.png') });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Parkinson's Slicer Modal
    const parkinsonsBtn = page.locator("button:has-text('Parkinson’s Slicer')").first();
    if (await parkinsonsBtn.isVisible()) {
      await parkinsonsBtn.click();
      await page.waitForSelector("text=Parkinson’s Law Inverter", { timeout: 6000 });
      await page.screenshot({ path: path.join(auditDir, 'desktop-dark-parkinsons-modal.png') });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Syllabus Decomposer Modal
    const syllabusBtn = page.locator("button:has-text('Syllabus Decomposer')").first();
    if (await syllabusBtn.isVisible()) {
      await syllabusBtn.click();
      await page.waitForSelector("text=Syllabus-to-Habit Decomposer", { timeout: 6000 });
      await page.screenshot({ path: path.join(auditDir, 'desktop-dark-syllabus-modal.png') });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Command Hub Stats Tab
    const commandHub = page.locator("text=Command Hub & Ecosystem").first();
    if (await commandHub.isVisible()) {
      await commandHub.scrollIntoViewIfNeeded();
      const statsTab = page.locator("button:has-text('Consistency & Stats')").first();
      if (await statsTab.isVisible()) {
        await statsTab.click();
        await page.waitForTimeout(400);
      }
      await page.screenshot({ path: path.join(auditDir, 'desktop-dark-commandhub-stats.png') });
    }

    // 4. Mobile Dark & Light
    await page.setViewportSize({ width: 390, height: 844 });
    await setupGuestSession(page, true);
    await page.screenshot({ path: path.join(auditDir, 'mobile-dark-dashboard.png') });

    // Mobile Habit Actions Dropdown
    const moreBtn = page.locator("button[aria-label='More habit actions'], button[title='More actions'], button:has-text('···')").first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: path.join(auditDir, 'mobile-dark-habit-actions.png') });
    await page.keyboard.press('Escape').catch(() => {});

    // Mobile Triage Modal
    if (await triageBtn.isVisible()) {
      await triageBtn.click();
      await page.waitForSelector("text=Emergency Triage Mode", { timeout: 6000 });
      await page.screenshot({ path: path.join(auditDir, 'mobile-dark-triage-modal.png') });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Mobile Light
    await setupGuestSession(page, false);
    await page.screenshot({ path: path.join(auditDir, 'mobile-light-dashboard.png') });
  });
});
