const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const phase5Dir = path.join(process.cwd(), 'screenshots', 'phase-5');
  if (!fs.existsSync(phase5Dir)) {
    fs.mkdirSync(phase5Dir, { recursive: true });
  }

  console.log('🚀 Launching Chromium for Phase 5: Native Mobile Hardening & Viral Social Bridge...');
  const browser = await chromium.launch({ headless: true });

  const BASE_URL = 'http://localhost:8080/Personal-Performance-System/#/dashboard';
  const SOCIAL_URL = 'http://localhost:8080/Personal-Performance-System/#/social';

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
        streak: 7,
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
        completedDates: [],
        streak: 4,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: 'sky',
        window_start: '06:30',
        window_end: '09:30',
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
        localStorage.setItem('pps_seen_badges_guest', '99');
        localStorage.setItem('pps_seen_level_guest', '99');
        localStorage.setItem(
          'pps_user_profile',
          JSON.stringify({
            displayName: 'Alex Mercer',
            primary_track: 'placements',
            daily_focus_target_minutes: 180,
            track_5_challenge_active: true,
          })
        );
      },
      { habitsData: habits, dark: isDark, date: today }
    );

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const awesomeBtn = page.locator('button:has-text("Awesome!")');
    if (await awesomeBtn.isVisible().catch(() => false)) {
      await awesomeBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    return { context, page };
  }

  try {
    // 1. DESKTOP (1440px) DARK - Momentum Command Deck with Live Squad Radar
    console.log('📸 1/12 Capturing Desktop 1440px Dark Command Deck...');
    {
      const { context, page } = await setupContextAndPage(1440, 960, true, BASE_URL);
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-dark-command-deck.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 2. DESKTOP (1440px) DARK - Squad Radar Modal Open (Zero-Mock Honest Empty State & WhatsApp)
    console.log('📸 2/12 Capturing Desktop 1440px Dark Squad Radar Modal...');
    {
      const { context, page } = await setupContextAndPage(1440, 1050, true, BASE_URL);
      const radarBtn = page.locator('button:has-text("Squad Radar"), button:has-text("Sprinting")').first();
      if (await radarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await radarBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-dark-radar-modal.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 3. DESKTOP (1440px) DARK - Social Squads View with Live Presence Banner & WhatsApp
    console.log('📸 3/12 Capturing Desktop 1440px Dark Social Squad View...');
    {
      const { context, page } = await setupContextAndPage(1440, 960, true, SOCIAL_URL);
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-dark-social-squad.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 4. DESKTOP (1440px) LIGHT - Command Deck
    console.log('📸 4/12 Capturing Desktop 1440px Light Command Deck...');
    {
      const { context, page } = await setupContextAndPage(1440, 960, false, BASE_URL);
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-light-command-deck.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 5. DESKTOP (1440px) LIGHT - Squad Radar Modal
    console.log('📸 5/12 Capturing Desktop 1440px Light Squad Radar Modal...');
    {
      const { context, page } = await setupContextAndPage(1440, 1050, false, BASE_URL);
      const radarBtn = page.locator('button:has-text("Squad Radar"), button:has-text("Sprinting")').first();
      if (await radarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await radarBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-light-radar-modal.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 6. DESKTOP (1440px) LIGHT - Social Squads View
    console.log('📸 6/12 Capturing Desktop 1440px Light Social Squad View...');
    {
      const { context, page } = await setupContextAndPage(1440, 960, false, SOCIAL_URL);
      await page.screenshot({
        path: path.join(phase5Dir, 'desktop-1440-light-social-squad.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 7. MOBILE (390px) DARK - Mobile Command Deck with Insets
    console.log('📸 7/12 Capturing Mobile 390px Dark Command Deck...');
    {
      const { context, page } = await setupContextAndPage(390, 844, true, BASE_URL);
      const awesomeBtn = page.locator('button:has-text("Awesome!")').first();
      if (await awesomeBtn.isVisible().catch(() => false)) {
        await awesomeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-dark-command-deck.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 8. MOBILE (390px) DARK - Squad Radar Modal
    console.log('📸 8/12 Capturing Mobile 390px Dark Squad Radar Modal...');
    {
      const { context, page } = await setupContextAndPage(390, 950, true, BASE_URL);
      const awesomeBtn = page.locator('button:has-text("Awesome!")').first();
      if (await awesomeBtn.isVisible().catch(() => false)) {
        await awesomeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      const radarBtn = page.locator('button:has-text("Squad Radar"), button:has-text("Sprinting")').first();
      if (await radarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await radarBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-dark-radar-modal.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 9. MOBILE (390px) DARK - Social Squads View
    console.log('📸 9/12 Capturing Mobile 390px Dark Social Squad View...');
    {
      const { context, page } = await setupContextAndPage(390, 844, true, SOCIAL_URL);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-dark-social-squad.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 10. MOBILE (390px) LIGHT - Command Deck
    console.log('📸 10/12 Capturing Mobile 390px Light Command Deck...');
    {
      const { context, page } = await setupContextAndPage(390, 844, false, BASE_URL);
      const awesomeBtn = page.locator('button:has-text("Awesome!")').first();
      if (await awesomeBtn.isVisible().catch(() => false)) {
        await awesomeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-light-command-deck.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 11. MOBILE (390px) LIGHT - Squad Radar Modal
    console.log('📸 11/12 Capturing Mobile 390px Light Squad Radar Modal...');
    {
      const { context, page } = await setupContextAndPage(390, 950, false, BASE_URL);
      const awesomeBtn = page.locator('button:has-text("Awesome!")').first();
      if (await awesomeBtn.isVisible().catch(() => false)) {
        await awesomeBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }
      const radarBtn = page.locator('button:has-text("Squad Radar"), button:has-text("Sprinting")').first();
      if (await radarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await radarBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-light-radar-modal.png'),
        fullPage: false,
      });
      await context.close();
    }

    // 12. MOBILE (390px) LIGHT - Social Squads View
    console.log('📸 12/12 Capturing Mobile 390px Light Social Squad View...');
    {
      const { context, page } = await setupContextAndPage(390, 844, false, SOCIAL_URL);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(phase5Dir, 'mobile-390-light-social-squad.png'),
        fullPage: false,
      });
      await context.close();
    }

    console.log('✅ All 12 Phase 5 screenshots captured successfully to screenshots/phase-5/');
  } catch (err) {
    console.error('❌ Error during Phase 5 screenshot capture:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
