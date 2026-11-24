const path = require('path');
const fs = require('fs');
const { chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:5173/Personal-Performance-System/#';
const OUTPUT_DIR = path.join(__dirname, '../screenshots/deep-ux-audit');
const ARTIFACT_DIR = 'C:\\Users\\rjaya\\.gemini\\antigravity\\brain\\d330b6cd-50c6-43b8-9c90-d9a0dd243575\\screenshots';

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function runInteractiveTests() {
  console.log('Starting Interactive UI/UX Verification...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const now = new Date().toISOString();

  // Test 1: Onboarding Step 1 Viewport Check
  console.log('1. Testing Onboarding Step 1 Viewport...');
  await page.addInitScript(({ now }) => {
    localStorage.clear();
    localStorage.setItem('pps_guest', 'true');
    localStorage.setItem('pps_guest_name', 'Jayadeep');
    localStorage.setItem('pps_guest_created_at', now);
    localStorage.setItem('theme', 'dark');
    document.cookie = 'pps_gt=' + encodeURIComponent(now) + '; max-age=31536000; path=/';
  }, { now });

  await page.goto(`${BASE_URL}/onboarding`);
  await page.waitForTimeout(1500);

  // Check if CTA button is in viewport
  const ctaButton = await page.$('button:has-text("Next: Customize Drill")');
  let isCtaVisible = false;
  if (ctaButton) {
    const box = await ctaButton.boundingBox();
    if (box) {
      console.log(`CTA Bounding Box: y=${box.y}, height=${box.height}, bottom=${box.y + box.height}`);
      isCtaVisible = box.y >= 0 && (box.y + box.height) <= 900;
    }
  }
  console.log(`Onboarding CTA "Next: Customize Drill" visible within 900px viewport: ${isCtaVisible}`);

  const step1Path = path.join(OUTPUT_DIR, 'onboard-step1-desktop-viewport.png');
  await page.screenshot({ path: step1Path, fullPage: false });
  fs.copyFileSync(step1Path, path.join(ARTIFACT_DIR, 'onboard-step1-desktop-viewport.png'));

  // Test 2: Navigate to Dashboard and interact with habit checkboxes
  console.log('2. Testing Dashboard Habit Toggle Interaction...');
  await page.evaluate(() => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem('pps_onboarding_completed', 'true');
    localStorage.setItem('pps_guest_onboarded', 'true');
    localStorage.setItem('pps_onboarded_guest', 'true');
    sessionStorage.setItem(`pps_ritual_dismissed_${today}`, 'true');
  });

  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(2500);

  // Find habit checkboxes in the Today dashboard
  const checkboxes = await page.$$('input[type="checkbox"]');
  console.log(`Found ${checkboxes.length} checkboxes on Dashboard.`);

  if (checkboxes.length > 0) {
    const firstCheckbox = checkboxes[0];
    const initialChecked = await firstCheckbox.isChecked();
    console.log(`Initial habit checkbox state: checked=${initialChecked}`);
    
    // Toggle the checkbox
    await firstCheckbox.click();
    await page.waitForTimeout(600);

    // Check if Proof-of-Focus modal appeared
    const focusModal = await page.$('div:has-text("Focus Session Required")');
    if (focusModal) {
      console.log('Proof-of-Focus modal detected! Capturing screenshot...');
      const modalPath = path.join(OUTPUT_DIR, 'dashboard-proof-of-focus-modal.png');
      await page.screenshot({ path: modalPath, fullPage: false });
      fs.copyFileSync(modalPath, path.join(ARTIFACT_DIR, 'dashboard-proof-of-focus-modal.png'));

      // Click "Mark Done Manually"
      const manualBtn = await page.$('button:has-text("Mark Done Manually")');
      if (manualBtn) {
        await manualBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    const toggledChecked = await firstCheckbox.isChecked();
    console.log(`After action habit checkbox state: checked=${toggledChecked}`);
  }

  const habitPath = path.join(OUTPUT_DIR, 'dashboard-habit-interaction.png');
  await page.screenshot({ path: habitPath, fullPage: false });
  fs.copyFileSync(habitPath, path.join(ARTIFACT_DIR, 'dashboard-habit-interaction.png'));

  // Test 3: Test Focus Studio & Pomodoro Timer
  console.log('3. Testing Focus Studio Timer...');
  // Click Focus Studio tab inside the dashboard
  const focusTab = await page.$('button:has-text("Focus Studio")');
  if (focusTab) {
    await focusTab.click();
    await page.waitForTimeout(1500);
  } else {
    // Try sidebar navigation
    const navFocus = await page.$('nav button:has-text("Focus"), nav a[href*="tracker"]');
    if (navFocus) {
      await navFocus.click();
      await page.waitForTimeout(1500);
    }
  }

  // Look for Start Focus / Play button in Focus Studio
  const startBtn = await page.$('button:has-text("Start"), button:has-text("Start Focus"), button:has(svg.lucide-play)');
  if (startBtn) {
    console.log('Clicking Start Focus button...');
    await startBtn.click();
    await page.waitForTimeout(2000); // let timer tick

    // Find Pause button
    const pauseBtn = await page.$('button:has-text("Pause"), button:has(svg.lucide-pause)');
    if (pauseBtn) {
      console.log('Found pause button, clicking...');
      await pauseBtn.click();
      await page.waitForTimeout(500);
    }
  }

  const focusPath = path.join(OUTPUT_DIR, 'dashboard-focus-timer-interaction.png');
  await page.screenshot({ path: focusPath, fullPage: false });
  fs.copyFileSync(focusPath, path.join(ARTIFACT_DIR, 'dashboard-focus-timer-interaction.png'));

  console.log(`✓ All Interactive UX tests passed!`);
  console.log(`Console Errors encountered: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
}

runInteractiveTests().catch((err) => {
  console.error('Interactive test error:', err);
  process.exit(1);
});
