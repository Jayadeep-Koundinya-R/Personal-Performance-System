const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const phase4Dir = path.join(process.cwd(), 'screenshots', 'phase-4');
  if (!fs.existsSync(phase4Dir)) {
    fs.mkdirSync(phase4Dir, { recursive: true });
  }

  console.log('🚀 Launching Chromium for Phase 4: Dashboard V2 Deep Polish & Analytics Studio...');
  const browser = await chromium.launch({ headless: true });

  const BASE_URL = 'http://localhost:8080/Personal-Performance-System/#/dashboard';
  const ANALYTICS_URL = 'http://localhost:8080/Personal-Performance-System/#/analytics';

  async function setupContextAndPage(width, height, isDark = true, targetUrl = BASE_URL) {
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
        completedDates: [today],
        streak: 5,
        lastCompletedDate: today,
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
        completedDates: [today],
        streak: 3,
        lastCompletedDate: today,
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
        localStorage.setItem('pps_active_track', 'placements');
        localStorage.setItem('pps_daily_focus_hours', '3');
        localStorage.setItem(
          'pps_user_profile',
          JSON.stringify({
            full_name: 'Alex Vance',
            displayName: 'Alex Vance',
            primary_track: 'placements',
            target_role: 'Senior Full Stack Architect',
            daily_focus_target_minutes: 180,
          })
        );
        localStorage.setItem('pps_unlocked_badges', JSON.stringify(['streak_3', 'streak_5', 'first_habit']));
        localStorage.setItem('pps_last_active_date', date);

        // Seed some historical focus minutes for the 7-day curve
        const baseDate = new Date();
        for (let i = 0; i < 7; i++) {
          const d = new Date(baseDate);
          d.setDate(d.getDate() - i);
          const ds = d.toISOString().split('T')[0];
          localStorage.setItem(`pps_focus_minutes_${ds}`, String(90 + (i % 3) * 35));
        }

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

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    // Dismiss any modal overlays if open
    const closeBtns = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it'), button:has-text('Awesome!'), button:has-text('Close')");
    const count = await closeBtns.count();
    for (let i = 0; i < count; i++) {
      const btn = closeBtns.nth(i);
      if (await btn.isVisible()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    return { context, page };
  }

  // ── 1. Desktop Dark: Unified Momentum Command Deck (Hero Header) ──
  console.log('📸 1/8 Capturing Desktop Dark Dashboard with Momentum Command Deck...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true);
    await page.screenshot({
      path: path.join(phase4Dir, 'desktop-dark-dashboard.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 2. Desktop Light: Dashboard in crisp light mode ──
  console.log('📸 2/8 Capturing Desktop Light Dashboard...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, false);
    await page.screenshot({
      path: path.join(phase4Dir, 'desktop-light-dashboard.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 3. Desktop Dark: Documented Vitality Formula Drawer / Tooltip ──
  console.log('📸 3/8 Capturing Desktop Vitality Formula Drawer...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true);
    // Click the info button next to the vitality score
    const infoBtn = page.locator("button[title*='Vitality Score Formula']").first();
    if (await infoBtn.isVisible()) {
      await infoBtn.click();
      await page.waitForTimeout(600);
    }
    await page.screenshot({
      path: path.join(phase4Dir, 'desktop-vitality-modal.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 4. Desktop Dark: Analytics Studio (/analytics) ──
  console.log('📸 4/8 Capturing Desktop Dark Analytics Studio (/analytics)...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, true, ANALYTICS_URL);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(phase4Dir, 'desktop-dark-analytics.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 5. Desktop Light: Analytics Studio in Light Mode ──
  console.log('📸 5/8 Capturing Desktop Light Analytics Studio (/analytics)...');
  {
    const { context, page } = await setupContextAndPage(1440, 900, false, ANALYTICS_URL);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(phase4Dir, 'desktop-light-analytics.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 6. Mobile Dark Dashboard (390px) ──
  console.log('📸 6/8 Capturing Mobile Dark Dashboard...');
  {
    const { context, page } = await setupContextAndPage(390, 844, true);
    await page.screenshot({
      path: path.join(phase4Dir, 'mobile-dark-dashboard.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 7. Mobile Dark Analytics Studio (390px) ──
  console.log('📸 7/8 Capturing Mobile Dark Analytics Studio...');
  {
    const { context, page } = await setupContextAndPage(390, 844, true, ANALYTICS_URL);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(phase4Dir, 'mobile-dark-analytics.png'),
      fullPage: false,
    });
    await context.close();
  }

  // ── 8. Mobile Light Analytics Studio (390px) ──
  console.log('📸 8/8 Capturing Mobile Light Analytics Studio...');
  {
    const { context, page } = await setupContextAndPage(390, 844, false, ANALYTICS_URL);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(phase4Dir, 'mobile-light-analytics.png'),
      fullPage: false,
    });
    await context.close();
  }

  await browser.close();
  console.log('🎉 All Phase 4 screenshots successfully captured and preserved in screenshots/phase-4/!');
})();
