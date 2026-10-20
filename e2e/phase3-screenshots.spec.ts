import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function setupSession(page: Page, theme: 'dark' | 'light' = 'dark') {
  await page.goto('./#/');
  await page.evaluate((themeMode) => {
    localStorage.clear();
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pps_guest', 'true');
    localStorage.setItem('pps_guest_name', 'Phase 3 Tester');
    localStorage.setItem('pps_guest_created_at', new Date().toISOString());
    localStorage.setItem('pps_onboarded_guest', 'true');
    localStorage.setItem(
      'pps_settings_guest',
      JSON.stringify({
        onboardingCompleted: true,
        ritualLastDone: today,
        avatarInitialized: true,
        theme: themeMode,
      })
    );
    localStorage.setItem('pps_theme', themeMode);
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    document.documentElement.classList.toggle('light', themeMode === 'light');

    const dummyHabits = [
      {
        id: 'habit-1',
        name: 'Operating Systems Kernel Design',
        category: 'Deep Work',
        frequency: 'daily',
        period: 'morning',
        priority: 'high',
        streakCount: 5,
        longestStreak: 12,
        completionHistory: [],
        completedToday: false,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        order: 0,
        user_id: 'guest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'habit-2',
        name: 'Algorithms & Data Structures Drill',
        category: 'Deep Work',
        frequency: 'daily',
        period: 'afternoon',
        priority: 'high',
        streakCount: 8,
        longestStreak: 15,
        completionHistory: [],
        completedToday: false,
        order: 1,
        user_id: 'guest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem('habits_guest', JSON.stringify(dummyHabits));
  }, theme);

  await page.goto('./#/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // Dismiss any overlay toasts or alerts
  const dismissBtn = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')").first();
  if (await dismissBtn.isVisible()) {
    await dismissBtn.click().catch(() => {});
  }
}

test.describe('Phase 3 Screenshot Capture & Verification Suite', () => {
  test.beforeAll(async () => {
    const dir = path.join(process.cwd(), 'screenshots', 'phase-3');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  test('1. Desktop (1440px) - Dark Theme - Dashboard & Phase 3 Modals', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupSession(page, 'dark');

    // 1.1 Dashboard with Command Ribbon & Active Banner
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/phase-3/desktop-dark-01-dashboard.png', fullPage: false });

    // 1.2 Open Parkinson's Law Inverter Modal
    const slicerBtn = page.locator("button:has-text('Parkinson’s Slicer')").first();
    if (await slicerBtn.isVisible()) {
      await slicerBtn.click();
      await page.waitForSelector("text=Parkinson’s Law Inverter", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-dark-02-parkinsons-modal.png' });
      // Close modal
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 1.3 Open Emergency Triage Modal
    const triageBtn = page.locator("button:has-text('Emergency Triage')").first();
    if (await triageBtn.isVisible()) {
      await triageBtn.click();
      await page.waitForSelector("text=Emergency Triage Mode", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-dark-03-triage-modal.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 1.4 Open Syllabus Decomposer Modal
    const syllabusBtn = page.locator("button:has-text('Syllabus Decomposer')").first();
    if (await syllabusBtn.isVisible()) {
      await syllabusBtn.click();
      await page.waitForSelector("text=Syllabus-to-Habit Decomposer", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-dark-04-syllabus-modal.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 1.5 Settings Section - Coach Persona Selector Cards
    await page.goto('./#/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector("text=AI Coaching Persona", { state: 'visible', timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/phase-3/desktop-dark-05-settings-personas.png' });
  });

  test('2. Desktop (1440px) - Light Theme - Dashboard & Phase 3 Modals', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupSession(page, 'light');

    // 2.1 Dashboard Light
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/phase-3/desktop-light-01-dashboard.png', fullPage: false });

    // 2.2 Parkinson's Law Inverter Modal Light
    const slicerBtn = page.locator("button:has-text('Parkinson’s Slicer')").first();
    if (await slicerBtn.isVisible()) {
      await slicerBtn.click();
      await page.waitForSelector("text=Parkinson’s Law Inverter", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-light-02-parkinsons-modal.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 2.3 Emergency Triage Modal Light
    const triageBtn = page.locator("button:has-text('Emergency Triage')").first();
    if (await triageBtn.isVisible()) {
      await triageBtn.click();
      await page.waitForSelector("text=Emergency Triage Mode", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-light-03-triage-modal.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 2.4 Syllabus Decomposer Modal Light
    const syllabusBtn = page.locator("button:has-text('Syllabus Decomposer')").first();
    if (await syllabusBtn.isVisible()) {
      await syllabusBtn.click();
      await page.waitForSelector("text=Syllabus-to-Habit Decomposer", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/desktop-light-04-syllabus-modal.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }
  });

  test('3. Mobile (390px) - Dark & Light Viewports', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 3.1 Mobile Dark
    await setupSession(page, 'dark');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/phase-3/mobile-dark-01-dashboard.png' });

    // Open Triage on Mobile Dark
    const triageBtn = page.locator("button:has-text('Emergency Triage')").first();
    if (await triageBtn.isVisible()) {
      await triageBtn.click();
      await page.waitForSelector("text=Emergency Triage Mode", { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/phase-3/mobile-dark-02-triage.png' });
      const closeBtn = page.locator("button:has([class*='lucide-x'])").last();
      await closeBtn.click().catch(() => {});
    }

    // 3.2 Mobile Light
    await setupSession(page, 'light');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/phase-3/mobile-light-01-dashboard.png' });
  });
});
