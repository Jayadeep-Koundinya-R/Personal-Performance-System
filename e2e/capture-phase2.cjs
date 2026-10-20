const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const phase2Dir = path.join(process.cwd(), 'screenshots', 'phase-2');
  if (!fs.existsSync(phase2Dir)) {
    fs.mkdirSync(phase2Dir, { recursive: true });
  }

  console.log('🚀 Launching Chromium for Phase 2: Vayu 1.0 Living Flow Visual Capture...');
  const browser = await chromium.launch({ headless: true });

  async function createPage(context, width, height, isDark = true, enableDelayAlert = false) {
    await context.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await context.route('https://fonts.gstatic.com/**', (r) => r.abort());

    const page = await context.newPage();
    await page.setViewportSize({ width, height });

    const today = new Date().toISOString().split('T')[0];

    const habits = [
      {
        id: 'vayu-h1',
        name: 'DSA Mastery: Dynamic Programming & Trees',
        category: 'Productivity',
        priority: 'high',
        frequency: 'daily',
        period: 'morning',
        streak: 5,
        completed: false,
        completedDates: [],
        dueDate: new Date().toISOString(),
      },
      {
        id: 'vayu-h2',
        name: 'Core System Design & Distributed Systems',
        category: 'Learning',
        priority: 'medium',
        frequency: 'daily',
        period: 'afternoon',
        streak: 3,
        completed: false,
        completedDates: [],
        dueDate: new Date().toISOString(),
      },
      {
        id: 'vayu-h3',
        name: 'Calisthenics & Aerobic Recovery',
        category: 'Health',
        priority: 'medium',
        frequency: 'daily',
        period: 'evening',
        streak: 8,
        completed: false,
        completedDates: [],
        dueDate: new Date().toISOString(),
      },
    ];

    const plan = {
      id: `vayu_plan_${today}_live`,
      userId: 'guest',
      date: today,
      totalTargetMinutes: 300,
      completedMinutes: 45,
      overallCompletionRate: 25,
      aiStrategySummary: 'Circadian 45/15 Ultradian flow tailored to placements. Morning Prime focused on high-cognitive DSA.',
      currentVitalFocus: 'DSA Mastery: Dynamic Programming & Trees',
      lastRecalibratedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      needsRebalance: enableDelayAlert,
      minutesPushedForward: enableDelayAlert ? 30 : 0,
      rebalanceExplanation: enableDelayAlert
        ? 'Schedule slipped >20m behind local time. Fluid rebalance ready with zero guilt.'
        : undefined,
      blocks: [
        {
          id: 'v_b1',
          title: 'DSA Mastery: Dynamic Programming & Trees',
          description: 'Prime cognitive sprint on core algorithms and complex recurrence relations.',
          category: 'Deep Work',
          habitId: 'vayu-h1',
          linkedHabitId: 'vayu-h1',
          habitName: 'DSA Mastery: Dynamic Programming & Trees',
          startTime: '08:00',
          endTime: '08:45',
          durationMinutes: 45,
          status: 'completed',
          energyLevel: 'peak',
          completionPercentage: 100,
          xpAwarded: 15,
          autoManaged: true,
        },
        {
          id: 'v_b2',
          title: 'Vayu Prana: Mindful Recharge & Hydration',
          description: 'Hydrate, step away from screens, restore mental bandwidth.',
          category: 'Rest',
          startTime: '08:45',
          endTime: '09:00',
          durationMinutes: 15,
          status: 'completed',
          energyLevel: 'recharge',
          completionPercentage: 100,
          xpAwarded: 0,
          autoManaged: true,
        },
        {
          id: 'v_b3',
          title: 'Core System Design & Distributed Systems',
          description: 'Tactical drills on database sharding and caching patterns.',
          category: 'Deep Work',
          habitId: 'vayu-h2',
          linkedHabitId: 'vayu-h2',
          habitName: 'Core System Design & Distributed Systems',
          startTime: '09:00',
          endTime: '09:45',
          durationMinutes: 45,
          status: 'pending',
          energyLevel: 'peak',
          completionPercentage: 0,
          xpAwarded: 0,
          autoManaged: true,
        },
        {
          id: 'v_b4',
          title: 'Ultradian Reset: Posture & Deep Breathing',
          description: 'Physical decompression, gentle walking, screen rest.',
          category: 'Rest',
          startTime: '09:45',
          endTime: '10:00',
          durationMinutes: 15,
          status: 'pending',
          energyLevel: 'recharge',
          completionPercentage: 0,
          xpAwarded: 0,
          autoManaged: true,
        },
        {
          id: 'v_b5',
          title: 'Technical Problem Solving & System Drills',
          description: 'Medium cognitive practice question banks and fast recall.',
          category: 'Learning',
          startTime: '13:00',
          endTime: '13:45',
          durationMinutes: 45,
          status: 'pending',
          energyLevel: 'medium',
          completionPercentage: 0,
          xpAwarded: 0,
          autoManaged: true,
        },
        {
          id: 'v_b6',
          title: 'Calisthenics & Aerobic Movement',
          description: 'Physical vitality, calisthenics or aerobic movement.',
          category: 'Health',
          habitId: 'vayu-h3',
          linkedHabitId: 'vayu-h3',
          habitName: 'Calisthenics & Aerobic Recovery',
          startTime: '17:00',
          endTime: '17:45',
          durationMinutes: 45,
          status: 'pending',
          energyLevel: 'medium',
          completionPercentage: 0,
          xpAwarded: 0,
          autoManaged: true,
        },
        {
          id: 'v_b7',
          title: 'Agni Curfew: Screen Cutoff & Journaling',
          description: 'Digital wind-down, sleep environment preparation, zero blue light.',
          category: 'Mindset',
          startTime: '21:30',
          endTime: '22:00',
          durationMinutes: 30,
          status: 'pending',
          energyLevel: 'recharge',
          completionPercentage: 0,
          xpAwarded: 0,
          autoManaged: true,
        },
      ],
    };

    await page.addInitScript(
      ({ dark, date, planData, habitData }) => {
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
        localStorage.setItem('habits_guest', JSON.stringify(habitData));
        localStorage.setItem(`pps_vayu_daily_plan_guest_${date}`, JSON.stringify(planData));

        if (dark) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      },
      { dark: isDark, date: today, planData: plan, habitData: habits }
    );

    await page.goto('http://localhost:8080/Personal-Performance-System/#/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // If Starter Stack is visible, click it to install habits and reveal Vayu Banner
    const starterBtn = page.locator("button:has-text('Install Starter Stack')").first();
    if (await starterBtn.isVisible()) {
      await starterBtn.click();
      await page.waitForTimeout(1000);
    }

    // Dismiss any modal/toast overlays
    const closeBtns = page.locator("button:has-text('Dismiss'), button:has-text('Skip'), button:has-text('Got it')");
    const count = await closeBtns.count();
    for (let i = 0; i < count; i++) {
      const btn = closeBtns.nth(i);
      if (await btn.isVisible()) {
        await btn.click().catch(() => {});
      }
    }
    await page.waitForTimeout(300);

    return page;
  }

  // 1. Desktop Dark: Vayu Pulse Banner & Flow Studio
  console.log('📸 Capturing Desktop Dark (1440x900)...');
  const contextDesktopDark = await browser.newContext();
  const pageDD = await createPage(contextDesktopDark, 1440, 900, true, false);
  
  // Scroll main container to reveal Vayu Pulse Banner and habit checklist
  await pageDD.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 550;
  });
  await pageDD.waitForTimeout(600);
  await pageDD.screenshot({ path: path.join(phase2Dir, 'desktop-dark-vayu-banner.png') });
  console.log('✓ Saved desktop-dark-vayu-banner.png');

  // Open Vayu Flow Studio Modal on Desktop Dark
  const studioBtnDD = pageDD.locator("button:has-text('Flow Studio'), button[title='Open Flow Studio']").first();
  if (await studioBtnDD.isVisible()) {
    await studioBtnDD.click();
    await pageDD.waitForSelector("text=Vayu Flow Studio", { timeout: 6000 });
    await pageDD.waitForTimeout(500);
    await pageDD.screenshot({ path: path.join(phase2Dir, 'desktop-dark-vayu-studio-modal.png') });
    console.log('✓ Saved desktop-dark-vayu-studio-modal.png');
  }
  await contextDesktopDark.close();

  // 2. Desktop Light: Vayu Pulse Banner & Flow Studio
  console.log('📸 Capturing Desktop Light (1440x900)...');
  const contextDesktopLight = await browser.newContext();
  const pageDL = await createPage(contextDesktopLight, 1440, 900, false, false);
  
  await pageDL.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 550;
  });
  await pageDL.waitForTimeout(600);
  await pageDL.screenshot({ path: path.join(phase2Dir, 'desktop-light-vayu-banner.png') });
  console.log('✓ Saved desktop-light-vayu-banner.png');

  const studioBtnDL = pageDL.locator("button:has-text('Flow Studio'), button[title='Open Flow Studio']").first();
  if (await studioBtnDL.isVisible()) {
    await studioBtnDL.click();
    await pageDL.waitForSelector("text=Vayu Flow Studio", { timeout: 6000 });
    await pageDL.waitForTimeout(500);
    await pageDL.screenshot({ path: path.join(phase2Dir, 'desktop-light-vayu-studio-modal.png') });
    console.log('✓ Saved desktop-light-vayu-studio-modal.png');
  }
  await contextDesktopLight.close();

  // 3. Mobile Dark: Vayu Pulse Banner & Flow Studio on 390px
  console.log('📸 Capturing Mobile Dark (390x844)...');
  const contextMobileDark = await browser.newContext();
  const pageMD = await createPage(contextMobileDark, 390, 844, true, false);
  
  const vayuBannerMD = pageMD.locator("text=Vayu Circadian Flow").first();
  if (await vayuBannerMD.isVisible()) {
    await vayuBannerMD.scrollIntoViewIfNeeded();
    await pageMD.waitForTimeout(400);
  }
  await pageMD.screenshot({ path: path.join(phase2Dir, 'mobile-dark-vayu-banner.png') });
  console.log('✓ Saved mobile-dark-vayu-banner.png');

  const studioBtnMD = pageMD.locator("button[title='Open Flow Studio']").first();
  if (await studioBtnMD.isVisible()) {
    await studioBtnMD.click();
    await pageMD.waitForSelector("text=Vayu Flow Studio", { timeout: 6000 });
    await pageMD.waitForTimeout(500);
    await pageMD.screenshot({ path: path.join(phase2Dir, 'mobile-dark-vayu-studio-modal.png') });
    console.log('✓ Saved mobile-dark-vayu-studio-modal.png');
  }
  await contextMobileDark.close();

  // 4. Mobile Light: Vayu Pulse Banner on 390px
  console.log('📸 Capturing Mobile Light (390x844)...');
  const contextMobileLight = await browser.newContext();
  const pageML = await createPage(contextMobileLight, 390, 844, false, false);
  
  const vayuBannerML = pageML.locator("text=Vayu Circadian Flow").first();
  if (await vayuBannerML.isVisible()) {
    await vayuBannerML.scrollIntoViewIfNeeded();
    await pageML.waitForTimeout(400);
  }
  await pageML.screenshot({ path: path.join(phase2Dir, 'mobile-light-vayu-banner.png') });
  console.log('✓ Saved mobile-light-vayu-banner.png');
  await contextMobileLight.close();

  // 5. Desktop Dark with Delay Alert Banner Active
  console.log('📸 Capturing Desktop Dark with Delay Alert (1440x900)...');
  const contextDelay = await browser.newContext();
  const pageDelay = await createPage(contextDelay, 1440, 900, true, true);
  
  await pageDelay.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 550;
  });
  await pageDelay.waitForTimeout(600);
  await pageDelay.screenshot({ path: path.join(phase2Dir, 'desktop-dark-vayu-rebalance-alert.png') });
  console.log('✓ Saved desktop-dark-vayu-rebalance-alert.png');
  await contextDelay.close();

  await browser.close();
  console.log('🎉 Phase 2 Visual Capture completed successfully! All screenshots preserved in screenshots/phase-2/');
})();
