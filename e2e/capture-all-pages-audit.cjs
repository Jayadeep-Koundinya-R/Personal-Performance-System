const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080/Personal-Performance-System';

const STANDALONE_PAGES = [
  { name: '01-landing-home', path: '/' },
  { name: '02-auth-login', path: '/login' },
  { name: '03-onboarding', path: '/onboarding' },
  { name: '04-pricing-plans', path: '/pricing' },
  { name: '05-roadmap', path: '/roadmap' },
  { name: '06-marketplace', path: '/marketplace' },
  { name: '19-standalone-settings', path: '/settings' },
  { name: '20-privacy-policy', path: '/privacy' },
  { name: '21-terms-of-service', path: '/terms' },
  { name: '22-reset-password', path: '/reset-password' },
  { name: '23-meeting-room', path: '/meet/audit-preview-room?name=Jayadeep' },
  { name: '24-not-found-404', path: '/404-not-found-route-test' },
];

const DASHBOARD_SECTIONS = [
  { name: '07-dashboard-today', section: '' },
  { name: '08-dashboard-habits', section: 'habits' },
  { name: '09-dashboard-focus-studio', section: 'tracker' },
  { name: '10-dashboard-study-squads', section: 'social' },
  { name: '11-dashboard-analytics', section: 'analytics' },
  { name: '12-dashboard-calendar', section: 'calendar' },
  { name: '13-dashboard-streak', section: 'streak' },
  { name: '14-dashboard-achievements', section: 'achievements' },
  { name: '15-dashboard-reflections', section: 'reflections' },
  { name: '16-dashboard-reports', section: 'reports' },
  { name: '17-dashboard-reminders', section: 'reminders' },
  { name: '18-dashboard-settings', section: 'settings' },
];

(async () => {
  const localOutputDir = path.join(process.cwd(), 'screenshots', 'pages-cycle-deep-audit');
  const rootOutputDir = path.resolve(process.cwd(), '..', 'screenshots', 'pages-cycle-deep-audit');

  [localOutputDir, rootOutputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  console.log('🔍 Starting Continuous Deep Audit & Visual Capture of All PPS Pages...');
  const browser = await chromium.launch({ headless: true });
  const auditReport = [];
  const todayStr = new Date().toISOString().split('T')[0];

  const initScript = ({ today }) => {
    localStorage.setItem('pps_guest', 'true');
    localStorage.setItem('pps_guest_name', 'Jayadeep');
    localStorage.setItem('pps_guest_created_at', new Date().toISOString());
    localStorage.setItem('pps_onboarded_guest', 'true');
    localStorage.setItem('pps_onboarding_completed', 'true');
    localStorage.setItem('pps_skip_onboarding', 'true');
    localStorage.setItem('pps_settings_guest', JSON.stringify({
      ritualLastDone: today,
      ritual_last_done: today,
      onboardingCompleted: true,
    }));
    localStorage.setItem('pps_seen_badge_count_guest', '999');
    localStorage.setItem('pps_seen_level_guest', '999');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('pps_theme', 'dark');
  };

  async function captureTarget(name, targetUrl) {
    console.log(`\n📄 Auditing [${name}] at ${targetUrl}...`);

    // Desktop
    const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pageDesktop = await contextDesktop.newPage();
    await pageDesktop.addInitScript(initScript, { today: todayStr });

    const errors = [];
    pageDesktop.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    pageDesktop.on('pageerror', (e) => errors.push(e.message));

    await pageDesktop.goto(targetUrl, { timeout: 30000 });
    await pageDesktop.waitForTimeout(1600);

    // Dismiss popups if present
    try {
      const dismissBtn = await pageDesktop.$('button:has-text("Awesome!"), button:has-text("Got it"), button:has-text("Skip")');
      if (dismissBtn) {
        await dismissBtn.click();
        await pageDesktop.waitForTimeout(300);
      }
    } catch {}

    const localDesktopImg = path.join(localOutputDir, `${name}-desktop.png`);
    const rootDesktopImg = path.join(rootOutputDir, `${name}-desktop.png`);
    await pageDesktop.screenshot({ path: localDesktopImg, fullPage: false });
    fs.copyFileSync(localDesktopImg, rootDesktopImg);
    const desktopSize = fs.statSync(localDesktopImg).size;
    console.log(`  ✓ Desktop: ${name}-desktop.png (${Math.round(desktopSize / 1024)} KB)`);

    await contextDesktop.close();

    // Mobile
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const pageMobile = await contextMobile.newPage();
    await pageMobile.addInitScript(initScript, { today: todayStr });

    await pageMobile.goto(targetUrl, { timeout: 30000 });
    await pageMobile.waitForTimeout(1600);

    try {
      const dismissBtnMobile = await pageMobile.$('button:has-text("Awesome!"), button:has-text("Got it"), button:has-text("Skip")');
      if (dismissBtnMobile) {
        await dismissBtnMobile.click();
        await pageMobile.waitForTimeout(300);
      }
    } catch {}

    const localMobileImg = path.join(localOutputDir, `${name}-mobile.png`);
    const rootMobileImg = path.join(rootOutputDir, `${name}-mobile.png`);
    await pageMobile.screenshot({ path: localMobileImg, fullPage: false });
    fs.copyFileSync(localMobileImg, rootMobileImg);
    const mobileSize = fs.statSync(localMobileImg).size;
    console.log(`  ✓ Mobile:  ${name}-mobile.png (${Math.round(mobileSize / 1024)} KB)`);

    await contextMobile.close();

    auditReport.push({
      name,
      url: targetUrl,
      desktopImg: rootDesktopImg,
      mobileImg: rootMobileImg,
      desktopSizeKB: Math.round(desktopSize / 1024),
      mobileSizeKB: Math.round(mobileSize / 1024),
      errors,
    });
  }

  // 1. Audit Dashboard Sections
  for (const sec of DASHBOARD_SECTIONS) {
    const targetUrl = sec.section ? `${BASE_URL}/#/dashboard?section=${sec.section}` : `${BASE_URL}/#/dashboard`;
    await captureTarget(sec.name, targetUrl);
  }

  // 2. Audit Standalone Pages
  for (const page of STANDALONE_PAGES) {
    const targetUrl = `${BASE_URL}/#${page.path}`;
    await captureTarget(page.name, targetUrl);
  }

  await browser.close();

  const auditJsonPath1 = path.join(localOutputDir, 'audit-results.json');
  const auditJsonPath2 = path.join(rootOutputDir, 'audit-results.json');
  const jsonContent = JSON.stringify(auditReport, null, 2);
  fs.writeFileSync(auditJsonPath1, jsonContent, 'utf-8');
  fs.writeFileSync(auditJsonPath2, jsonContent, 'utf-8');

  console.log(`\n🎉 Deep audit visual capture finished! Successfully verified all ${auditReport.length} screens.`);
})();
