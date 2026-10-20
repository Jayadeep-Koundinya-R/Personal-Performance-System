const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const phase1Dir = path.join(process.cwd(), 'screenshots', 'phase-1');
  if (!fs.existsSync(phase1Dir)) {
    fs.mkdirSync(phase1Dir, { recursive: true });
  }

  console.log('🚀 Launching Chromium for Phase 1: Agni 2.0 Hardening Visual Capture...');
  const browser = await chromium.launch({ headless: true });

  const BASE_URL = 'http://localhost:8080/Personal-Performance-System/#/dashboard';

  async function setupContextAndPage(width, height, isDark = true) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 2,
    });

    await context.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await context.route('https://fonts.gstatic.com/**', (r) => r.abort());

    const page = await context.newPage();

    const today = new Date().toISOString().split('T')[0];
    const habits = [
      {
        id: 'agni-anchor-1',
        name: '💻 25-min Deep Work Sprint',
        category: 'Productivity',
        priority: 'High',
        period: 'Daily',
        dueDate: new Date().toISOString(),
        completedDates: [],
        streak: 5,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: 'indigo',
        requires_focus_timer: true,
        focus_duration_minutes: 20,
        window_start: '08:00',
        window_end: '12:00',
      },
      {
        id: 'agni-health-2',
        name: '💧 Morning Sunlight & Hydration',
        category: 'Health',
        priority: 'High',
        period: 'Daily',
        dueDate: new Date().toISOString(),
        completedDates: [],
        streak: 3,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: 'sky',
        window_start: '06:30',
        window_end: '09:30',
      },
      {
        id: 'agni-mindset-3',
        name: '📚 Read 10 Pages of Growth',
        category: 'Mindset',
        priority: 'Medium',
        period: 'Daily',
        dueDate: new Date().toISOString(),
        completedDates: [],
        streak: 2,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: 'emerald',
        window_start: '19:00',
        window_end: '22:30',
      },
    ];

    await page.addInitScript(
      ({ habitsData, dark, date }) => {
        localStorage.clear();
        localStorage.setItem('pps_guest', 'true');
        localStorage.setItem('pps_guest_created_at', new Date().toISOString());
        localStorage.setItem('pps_theme', dark ? 'dark' : 'light');
        localStorage.setItem('pps_theme_mode', dark ? 'dark' : 'light');
        localStorage.setItem('pps_onboarded_guest', 'true');
        localStorage.setItem('pps_onboarding_completed', 'true');
        localStorage.setItem('pps_skip_onboarding', 'true');
        localStorage.setItem(
          'pps_settings_guest',
          JSON.stringify({
            theme: dark ? 'dark' : 'light',
            onboardingCompleted: true,
            ritualLastDone: date,
          })
        );
        localStorage.setItem('habits_guest', JSON.stringify(habitsData));
        localStorage.setItem('pps_dashboard_view_mode', 'priority');
        localStorage.setItem('pps_dashboard_density', 'comfortable');
        localStorage.setItem(
          'pps_user_profile',
          JSON.stringify({
            full_name: 'Alex Vance',
            primary_track: 'software_engineering',
            target_role: 'Senior Full Stack Architect',
            target_company: 'Top Tech',
          })
        );

        if (dark) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      },
      { habitsData: habits, dark: isDark, date: today }
    );

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // If Starter Stack button is visible, click it to install Agni 2.0 habits
    const starterBtn = page.locator("button:has-text('Install Starter Stack')").first();
    if (await starterBtn.isVisible()) {
      await starterBtn.click();
      await page.waitForTimeout(1000);
    }

    // Dismiss any modals if open
    const closeBtns = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')");
    const count = await closeBtns.count();
    for (let i = 0; i < count; i++) {
      const btn = closeBtns.nth(i);
      if (await btn.isVisible()) {
        await btn.click().catch(() => {});
      }
    }

    // Scroll main container so habits checklist with badges is prominently visible
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 520;
    });
    await page.waitForTimeout(600);

    return { context, page };
  }

  // ── 1. Desktop Dark: Main Dashboard with Agni 2.0 Proof-of-Focus & Circadian Badges ──
  console.log('📸 1/6 Capturing Desktop Dark Dashboard...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true);
    await page.screenshot({
      path: path.join(phase1Dir, 'desktop-dark-dashboard.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 2. Desktop Light: Dashboard in crisp light theme ──
  console.log('📸 2/6 Capturing Desktop Light Dashboard...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, false);
    await page.screenshot({
      path: path.join(phase1Dir, 'desktop-light-dashboard.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 3. Desktop Dark: Proof-of-Focus Anti-Cheat Modal ──
  console.log('📸 3/6 Capturing Desktop Proof-of-Focus Anti-Cheat Modal...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true);
    // Find the first checkbox corresponding to the timer-locked habit
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click();
      await page.waitForTimeout(700);
    }
    await page.screenshot({
      path: path.join(phase1Dir, 'desktop-timer-lock-modal.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 4. Desktop Dark: Circadian Window Warning Modal ──
  console.log('📸 4/6 Capturing Desktop Circadian Window Gating Modal...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true);
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count >= 2) {
      await checkboxes.nth(1).click();
      await page.waitForTimeout(700);
    }
    await page.screenshot({
      path: path.join(phase1Dir, 'desktop-circadian-modal.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 5. Mobile Dark: Responsive 390px Viewport ──
  console.log('📸 5/8 Capturing Mobile Dark Dashboard (Header)...');
  {
    const { context, page } = await setupContextAndPage(390, 844, true);
    await page.screenshot({
      path: path.join(phase1Dir, 'mobile-dark-dashboard.png'),
      fullPage: false,
    });
    console.log('📸 6/8 Capturing Mobile Dark Habits List...');
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 1400;
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(phase1Dir, 'mobile-dark-habits.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 6. Mobile Light: Responsive 390px Light Mode ──
  console.log('📸 7/8 Capturing Mobile Light Dashboard (Header)...');
  {
    const { context, page } = await setupContextAndPage(390, 844, false);
    await page.screenshot({
      path: path.join(phase1Dir, 'mobile-light-dashboard.png'),
      fullPage: false,
    });
    console.log('📸 8/8 Capturing Mobile Light Habits List...');
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollTop = 1400;
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(phase1Dir, 'mobile-light-habits.png'),
      fullPage: false,
    });
    await context.close();
  }

  await browser.close();
  console.log('🎉 All Phase 1 screenshots successfully saved and preserved in screenshots/phase-1/!');
})();
