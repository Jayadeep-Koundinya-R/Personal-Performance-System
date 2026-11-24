const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
  };
}

function getContrast(rgb1, rgb2) {
  if (!rgb1 || !rgb2) return null;
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = {
    pages: [],
    invisibleTextCount: 0,
    lowContrastCount: 0,
    consoleErrorsCount: 0,
    mobileOverflowCount: 0,
    contrastSamples: [],
    errors: [],
  };

  const pages = [
    { name: 'Landing', path: '#/' },
    { name: 'Dashboard', path: '#/dashboard' },
    { name: 'Pricing', path: '#/pricing' },
    { name: 'Login', path: '#/login' },
  ];

  for (const p of pages) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      page.on('pageerror', err => {
        results.consoleErrorsCount++;
        results.errors.push(`${p.name} (${theme}): ${err.message}`);
      });
      page.on('console', msg => {
        if (msg.type() === 'error') {
          results.consoleErrorsCount++;
          results.errors.push(`${p.name} (${theme}): ${msg.text()}`);
        }
      });

      await page.addInitScript(({ t }) => {
        localStorage.clear();
        localStorage.setItem('pps_guest', 'true');
        localStorage.setItem('pps_guest_created_at', new Date().toISOString());
        localStorage.setItem('pps_theme', t);
        localStorage.setItem('pps_theme_mode', t);
        localStorage.setItem('pps_onboarded_guest', 'true');
        localStorage.setItem('pps_onboarding_completed', 'true');
        localStorage.setItem('pps_skip_onboarding', 'true');
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem('pps_settings_guest', JSON.stringify({
          theme: t,
          onboardingCompleted: true,
          ritualLastDone: today,
        }));
      }, { t: theme });

      await page.goto(`http://localhost:8080/Personal-Performance-System/${p.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      await page.evaluate(({ t }) => {
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }, { t: theme });

      await page.waitForTimeout(1000);

      const pageStats = await page.evaluate(() => {
        let invisible = 0;
        let low = 0;
        const samples = [];
        const elements = document.querySelectorAll('*');

        for (const el of elements) {
          if (el.children.length === 0 && el.innerText && el.innerText.trim().length > 0) {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
              samples.push({
                text: el.innerText.slice(0, 30).trim(),
                color: style.color,
                bgColor: style.backgroundColor,
              });
            }
          }
        }

        return {
          samples: samples.slice(0, 80),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });

      if (pageStats.overflow) results.mobileOverflowCount++;

      for (const item of pageStats.samples) {
        const fg = parseRgb(item.color);
        const bg = parseRgb(item.bgColor);
        if (fg && bg && bg.a > 0.8) {
          const ratio = getContrast(fg, bg);
          if (ratio) {
            if (ratio < 1.05) {
              results.invisibleTextCount++;
              results.contrastSamples.push({ type: 'INVISIBLE', text: item.text, ratio: ratio.toFixed(2), theme, page: p.name });
            } else if (ratio < 4.5) {
              results.lowContrastCount++;
              if (results.contrastSamples.length < 15) {
                results.contrastSamples.push({ type: 'LOW', text: item.text, ratio: ratio.toFixed(2), theme, page: p.name });
              }
            }
          }
        }
      }

      results.pages.push({ page: p.name, theme });
      await context.close();
    }
  }

  await browser.close();

  console.log('=== AUDIT RESULTS ===');
  console.log('Pages tested:', results.pages.length);
  console.log('Console errors:', results.consoleErrorsCount);
  console.log('Invisible text instances (1:1 ratio):', results.invisibleTextCount);
  console.log('Low contrast warnings (< 4.5:1):', results.lowContrastCount);
  console.log('Mobile overflow count:', results.mobileOverflowCount);
  console.log('Sample warnings:', JSON.stringify(results.contrastSamples, null, 2));
  if (results.errors.length) {
    console.log('Errors:', results.errors);
  }
})();

