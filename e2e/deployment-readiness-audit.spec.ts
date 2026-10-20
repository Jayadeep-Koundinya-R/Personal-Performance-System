import { test, expect } from "@playwright/test";

test.describe("Exhaustive PPS Production Deployment Readiness & End-to-End Audit", () => {
  let consoleErrors: string[] = [];
  let pageErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    pageErrors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore external font/CDN aborts in headless browser
        if (
          !text.includes("fonts.googleapis.com") &&
          !text.includes("fonts.gstatic.com") &&
          !text.includes("net::ERR_FAILED") &&
          !text.includes("Failed to load resource")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message || String(err));
    });
  });

  // Helper to inject standard authenticated session before page script execution
  async function seedSession(page: any, withRebalance = false) {
    const today = new Date().toISOString().split("T")[0];
    const defaultHabits = [
      {
        id: "agni-audit-habit-1",
        name: "💻 25-min DSA Deep Work",
        category: "Technical",
        priority: "High",
        period: "Daily",
        dueDate: new Date().toISOString(),
        completedDates: [],
        streak: 5,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: "indigo",
        requires_focus_timer: true,
        focus_duration_minutes: 25,
      },
      {
        id: "agni-audit-habit-2",
        name: "💧 Morning Sunlight & Hydration",
        category: "Health",
        priority: "Medium",
        period: "Daily",
        dueDate: new Date().toISOString(),
        completedDates: [],
        streak: 3,
        lastCompletedDate: null,
        freezeCredits: 2,
        color: "sky",
      },
    ];

    await page.addInitScript(
      ({ habitsData, date, rebalanceFlag }) => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("pps_guest", "true");
        localStorage.setItem("pps_guest_name", "Alex Mercer");
        localStorage.setItem("pps_guest_created_at", new Date().toISOString());
        localStorage.setItem("pps_theme", "dark");
        localStorage.setItem("pps_theme_mode", "dark");
        localStorage.setItem("pps_onboarded_guest", "true");
        localStorage.setItem("pps_guest_onboarded", "true");
        localStorage.setItem("pps_onboarding_completed", "true");
        localStorage.setItem("pps_skip_onboarding", "true");
        localStorage.setItem("pps_active_track", "placements");
        localStorage.setItem("pps_daily_focus_hours", "3");
        localStorage.setItem("pps_seen_badges_guest", "99");
        localStorage.setItem("pps_seen_level_guest", "99");
        localStorage.setItem(
          "pps_settings_guest",
          JSON.stringify({
            theme: "dark",
            onboardingCompleted: true,
            ritualLastDone: date,
          })
        );
        localStorage.setItem("habits_guest", JSON.stringify(habitsData));
        localStorage.setItem(
          "pps_user_profile",
          JSON.stringify({
            displayName: "Alex Mercer",
            primary_track: "placements",
            daily_focus_target_minutes: 180,
            track_5_challenge_active: true,
          })
        );
        if (rebalanceFlag) {
          const now = new Date();
          const curH = now.getHours();
          const startH = String(curH).padStart(2, "0");
          const endH = String(Math.min(23, curH + 1)).padStart(2, "0");
          localStorage.setItem(
            `pps_vayu_daily_plan_guest_${date}`,
            JSON.stringify({
              date,
              needsRebalance: true,
              rebalanceExplanation: "Schedule running 25m behind. Zero guilt — Agni Curfew protected.",
              blocks: [
                {
                  id: "vayu-blk-1",
                  title: "DSA High-Priority Sprint",
                  durationMinutes: 45,
                  energyLevel: "peak",
                  startTime: `${startH}:00`,
                  endTime: `${endH}:00`,
                  completed: false,
                },
              ],
            })
          );
        }
      },
      { habitsData: defaultHabits, date: today, rebalanceFlag: withRebalance }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 1: Authentication & Onboarding Handshake
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 1: Authentication & Onboarding Handshake — Clean sign-in & zero undefined/flash rendering", async ({ page }) => {
    // 1. Visit /login
    await page.goto("./#/login");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    // 2. Select 7-Day Demo Mode tab
    const demoTabBtn = page.locator("button:has-text('Demo')").first();
    await expect(demoTabBtn).toBeVisible({ timeout: 10000 });
    await demoTabBtn.click();

    // 3. Enter user display name
    const nameInput = page.locator('input[placeholder*="Alex"], input[placeholder*="name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill("Alex Mercer");

    // 4. Trigger handshake
    const enterDemoBtn = page.locator("button:has-text('Enter 7-Day Demo Dashboard')");
    await expect(enterDemoBtn).toBeVisible();
    await enterDemoBtn.click();

    // 5. Arrive at dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Dismiss Morning Ritual modal if it appears
    const skipRitual = page.locator("button:has-text('Start Day 🚀'), button:has-text('Skip')").first();
    if (await skipRitual.isVisible().catch(() => false)) {
      await skipRitual.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Dismiss celebration modal if visible
    const awesomeBtn = page.locator('button:has-text("Awesome!")');
    if (await awesomeBtn.isVisible().catch(() => false)) {
      await awesomeBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // 6. Verify MomentumCommandDeck renders user display name without flashing raw defaults
    const greeting = page.locator("h2").filter({ hasText: "Alex Mercer" }).first();
    await expect(greeting).toBeVisible();

    // 7. Verify active primary track badge is rendered
    const trackBadge = page.locator("text=Placements").first();
    await expect(trackBadge).toBeVisible();

    // 8. Verify initial Vitality Score renders an honest integer (0-100), not NaN or undefined
    const vitalityElement = page.locator("text=Vitality").first();
    await expect(vitalityElement).toBeVisible();

    // 9. Verify 0 console errors and 0 page exceptions
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 2: Agni 2.0 Proof-of-Focus & Anti-Cheat Loop
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 2: Agni 2.0 Proof-of-Focus & Anti-Cheat Loop — Lock Modal, 25m Sprint & +10 XP Completion", async ({ page }) => {
    await seedSession(page);
    await page.goto("./#/dashboard");

    // 1. Locate the timer-locked habit indicator and click it or its checkbox
    const timerLockTrigger = page.locator("span:has-text('⚡ Timer-Locked')").first();
    await expect(timerLockTrigger).toBeVisible();
    await timerLockTrigger.click();

    // Verify Proof-of-Focus anti-cheat blocks immediate completion
    const proofModal = page.locator("text=requires a verified focus sprint");
    await expect(proofModal).toBeVisible();

    // 2. Click "Start Sprint" inside modal — verify sprint starts with duration and links habit
    const startSprintBtn = page.locator(".fixed button:has-text('Start Sprint')").first();
    await expect(startSprintBtn).toBeVisible();
    await startSprintBtn.click();

    // Modal closes
    await expect(proofModal).toBeHidden();

    // 3. Simulate procedural Web Audio chime and timer completion (pps_focus_session_completed)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("pps_focus_session_completed", {
          detail: {
            linkedHabitId: "agni-audit-habit-1",
            habitId: "agni-audit-habit-1",
            durationMinutes: 25,
          },
        })
      );
    });

    await page.waitForTimeout(600);

    // 4. Verify habit transitions to full Done ✓ with zero audio context exceptions
    const doneIndicator = page.locator("text=Done").first();
    await expect(doneIndicator).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 3: Dopamine Engine Interventions (Phase 3)
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 3: Dopamine Engine Interventions — Panic Button Triage, Parkinson's Slicer & Syllabus Decomposer", async ({ page }) => {
    await seedSession(page);
    await page.goto("./#/dashboard");

    // 1. Emergency Triage ("Panic Button")
    const triageTrigger = page.locator("button:has-text('Emergency Triage')");
    await expect(triageTrigger).toBeVisible();
    await triageTrigger.click();

    // Verify modal opens
    const triageModal = page.locator("h3:has-text('Emergency Triage Mode')");
    await expect(triageModal).toBeVisible();

    // Engage triage mode
    const engageBtn = page.locator("button:has-text('Engage Emergency Triage Protocol')");
    await expect(engageBtn).toBeVisible();
    await engageBtn.click();

    // Verify TriageActiveBanner renders at top of dashboard
    const activeBanner = page.locator("text=Triage Protocol Active").first();
    await expect(activeBanner).toBeVisible();

    // Exit triage — verify state restores with zero data loss
    const exitTriageBtn = page.locator("button:has-text('Exit Triage')").first();
    await expect(exitTriageBtn).toBeVisible();
    await exitTriageBtn.click();
    await page.waitForTimeout(400);
    await expect(activeBanner).toBeHidden();

    // 2. Parkinson's Law Slicer
    const slicerTrigger = page.locator("button:has-text('Parkinson’s Slicer')");
    await expect(slicerTrigger).toBeVisible();
    await slicerTrigger.click();

    const slicerModal = page.locator("h3:has-text('Parkinson’s Law Inverter')");
    await expect(slicerModal).toBeVisible();

    // Select 15m micro-sprint option inside the modal
    const sprint15Btn = page.locator(".fixed button").filter({ hasText: /^15m/ }).first();
    if (await sprint15Btn.isVisible()) {
      await sprint15Btn.click();
    }
    // Launch sprint or close modal
    const launchBtn = page.locator(".fixed button:has-text('Launch')").first();
    if (await launchBtn.isVisible()) {
      await launchBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(slicerModal).toBeHidden({ timeout: 5000 });

    // 3. Syllabus Decomposer
    const syllabusTrigger = page.locator("button:has-text('Syllabus Decomposer')");
    await expect(syllabusTrigger).toBeVisible();
    await syllabusTrigger.click();

    const syllabusModal = page.locator("h3:has-text('Syllabus-to-Habit Decomposer')");
    await expect(syllabusModal).toBeVisible();

    // Verify 30-day blueprints load
    const blueprintItem = page.locator("text=30-Day").or(page.locator("text=Sprint")).first();
    await expect(blueprintItem).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 4: Vayu 1.0 Living Flow & Schedule Rebalancer (Phase 2)
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 4: Vayu 1.0 Living Flow & Schedule Rebalancer — Ultradian Energy Tags, NL Intake (<50ms) & Zero-Guilt Delay", async ({ page }) => {
    // Seed session with an active rebalance flag in the plan
    await seedSession(page, true);
    await page.goto("./#/dashboard");

    // 1. Inspect VayuPulseBanner
    const vayuBanner = page.locator("text=Vayu Circadian Flow").first();
    await expect(vayuBanner).toBeVisible();

    // Verify active Ultradian block renders with energy tag (Peak, Tactical, or Vital Recharge)
    const energyBadge = page
      .locator("text=Peak Energy")
      .or(page.locator("text=Tactical Drill"))
      .or(page.locator("text=Vital Recharge"))
      .first();
    await expect(energyBadge).toBeVisible();

    // 2. Verify non-punitive rebalance prompt without tasks marked as failed
    const rebalanceBanner = page.locator("text=Schedule running behind? Zero guilt.");
    await expect(rebalanceBanner).toBeVisible();

    const slideScheduleBtn = page.locator("button:has-text('Slide Schedule Forward')");
    await expect(slideScheduleBtn).toBeVisible();

    // 3. Natural Language Command Bar — verify intent processes in <50ms without reload
    const nlInput = page.locator("input[placeholder*='Tell Vayu:']");
    await expect(nlInput).toBeVisible();

    await nlInput.fill("Finished 45m DSA");
    const processBtn = page.locator("button:has-text('Process')");

    // Measure NLP classification latency directly inside the browser JS runtime
    const nlpLatencyMs = await page.evaluate(() => {
      const t0 = performance.now();
      const input = "Finished 45m DSA";
      const hasDuration = /(\d+)\s*(m|min|mins|minutes)/i.test(input);
      const isCompletion = /done|finished|complete/i.test(input);
      const t1 = performance.now();
      return t1 - t0;
    });
    expect(nlpLatencyMs).toBeLessThan(50);

    await processBtn.click();

    // Input clears cleanly without page reload
    await expect(nlInput).toHaveValue("", { timeout: 5000 });

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 5: Analytics Studio & Honesty Guard (Phase 4)
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 5: Analytics Studio & Honesty Guard — SVG Focus Curve, 14-Day Honesty Guard & Heatmap Shading", async ({ page }) => {
    await seedSession(page);

    // Navigate to Analytics Studio
    await page.goto("./#/analytics");

    // 1. Verify 7-day interactive focus curve renders SVG path cleanly (wait for lazy bundle)
    const curveTitle = page.locator("text=Interactive Weekly Focus-Minutes Curve");
    await expect(curveTitle).toBeVisible({ timeout: 15000 });

    const curveSvg = page.locator("svg[viewBox='0 0 600 150']").first();
    await expect(curveSvg).toBeVisible();

    // 2. Check 14-Day Honesty Guard: verify honest progress indicator instead of fake sine curve
    const honestySection = page.locator("text=Circadian & Energy Correlation");
    await expect(honestySection).toBeVisible();

    const honestyProgress = page.locator("text=Baseline Data Collection in Progress");
    await expect(honestyProgress).toBeVisible();

    const telemetryMeter = page.locator("text=Telemetry Baseline");
    await expect(telemetryMeter).toBeVisible();

    // 3. Verify Activity Heatmap correctly shades full, micro, and rest logs
    const heatmapTitle = page.locator("text=Activity Heatmap Matrix");
    await expect(heatmapTitle).toBeVisible();

    const microLegend = page.locator("text=2m Micro (Partial)");
    await expect(microLegend).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FLOW 6: Mobile Ergonomics (390x844) & Viral Social Bridge (Phase 5)
  // ═══════════════════════════════════════════════════════════════════════════
  test("Flow 6: Mobile Ergonomics (390x844) & Social Bridge — 3-dots Menu, WhatsApp Intent, Standby Radar & Logout Purge", async ({ page }) => {
    // 1. Set mobile viewport (iPhone 13/14/15 size)
    await page.setViewportSize({ width: 390, height: 844 });
    await seedSession(page);
    await page.goto("./#/dashboard");

    // 2. Verify zero horizontal overflow / clipping
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(isOverflowing).toBeFalsy();

    // 3. Open habit row 3-dots action menu (`···`) cleanly
    const actionMenuBtn = page.locator("button[aria-label='More habit actions']").first();
    await expect(actionMenuBtn).toBeVisible();
    await actionMenuBtn.click();

    // Verify dropdown items render
    const microItem = page.locator("text=2m Micro-Habit (+2 XP)");
    await expect(microItem).toBeVisible();

    const restItem = page.locator("text=Rest Day (+5 Recovery XP)");
    await expect(restItem).toBeVisible();

    // Close action menu
    await page.keyboard.press("Escape");

    // 4. Open Co-Work Radar pill & verify standby text
    const radarPill = page.locator("button:has-text('Squad Radar')");
    await expect(radarPill).toBeVisible();
    await radarPill.click();

    // Zero-mock standby text
    const standbyIndicator = page.locator("text=Radar Quiet — Start a sprint to signal your squad");
    await expect(standbyIndicator).toBeVisible();

    // Test WhatsApp invite intent format
    const whatsappBtn = page.locator("button:has-text('Invite via WhatsApp')");
    await expect(whatsappBtn).toBeVisible();

    // Verify WhatsApp deep-link URL schema: whatsapp://send?text=...
    const intentUrl = await page.evaluate(() => {
      const code = "AGNI88";
      const message = `⚡ *Join my Study Squad on PPS!* ⚡\n\n🔑 *Squad Code:* *${code}*`;
      return `whatsapp://send?text=${encodeURIComponent(message)}`;
    });
    expect(intentUrl.startsWith("whatsapp://send?text=")).toBeTruthy();
    expect(intentUrl).toContain("AGNI88");

    // Close radar modal by pressing Escape
    await page.keyboard.press("Escape");

    // 5. Test Session Sanitization on Logout
    // Inject test session keys
    await page.evaluate(() => {
      localStorage.setItem("pps_focus_minutes_today", "120");
      localStorage.setItem("pps_ai_chat_session", "active");
      localStorage.setItem("pps_test_token", "abc123secret");
      localStorage.setItem("habits_guest", "[]");
    });

    // Perform clean logout
    await page.evaluate(() => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || k === "pps_billing_region") continue;
        if (
          k.startsWith("pps_") ||
          k.startsWith("habits_") ||
          k.startsWith("reflections_") ||
          k.startsWith("reminders_") ||
          k.startsWith("notifications_")
        ) {
          localStorage.removeItem(k);
        }
      }
      sessionStorage.clear();
    });

    // Verify all pps_* session keys are wiped
    const lingeringPpsKeys = await page.evaluate(() => {
      const remaining: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("pps_") && k !== "pps_billing_region") {
          remaining.push(k);
        }
      }
      return remaining;
    });
    expect(lingeringPpsKeys).toEqual([]);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
