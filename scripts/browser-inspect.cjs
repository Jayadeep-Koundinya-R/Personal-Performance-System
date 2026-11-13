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
  const outDir = path.join(process.cwd(), 'screenshots', 'browser-inspection');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const report = {
    pagesAudited: [],
    contrastWarnings: [],
    hardcodedClassesRendered: {},
    consoleErrors: [],
    lightDarkInconsistencies: [],
    mobileOverflows: [],
  };

  const pagesToTest = [
    { name: 'Landing', path: '#/' },
    { name: 'Dashboard', path: '#/dashboard' },
    { name: 'Pricing', path: '#/pricing' },
    { name: 'Login', path: '#/login' },
  ];

  for (const p of pagesToTest) {
    for (const theme of ['dark', 'light']) {
      for (const viewport of [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'mobile', width: 390, height: 844 },
      ]) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1.5,
        });

        const page = await context.newPage();

        page.on('console', msg => {
          if (msg.type() === 'error') {
            report.consoleErrors.push({
              page: p.name,
              theme,
              viewport: viewport.name,
              text: msg.text(),
            });
          }
        });

        // Seed demo guest state for dashboard
        await page.addInitScript(({ themeName }) => {
          localStorage.clear();
          localStorage.setItem('pps_guest', 'true');
          localStorage.setItem('pps_guest_created_at', new Date().toISOString());
          localStorage.setItem('pps_theme', themeName);
          localStorage.setItem('pps_theme_mode', themeName);
          localStorage.setItem('pps_onboarded_guest', 'true');
          localStorage.setItem('pps_onboarding_completed', 'true');
          localStorage.setItem('pps_skip_onboarding', 'true');
          localStorage.setItem('pps_active_track', 'placements');
          localStorage.setItem('habits_guest', JSON.stringify([
            {
              id: 'h1',
              name: '💻 2 LeetCode Mediums',
              category: 'Productivity',
              priority: 'High',
              period: 'Daily',
              dueDate: new Date().toISOString(),
              completedDates: [],
              streak: 4,
              freezeCredits: 2,
            },
            {
              id: 'h2',
              name: '💧 Sunlight & Hydration',
              category: 'Health',
              priority: 'Medium',
              period: 'Daily',
              dueDate: new Date().toISOString(),
              completedDates: [],
              streak: 2,
              freezeCredits: 1,
            }
          ]));
        }, { themeName: theme });

        const url = `http://localhost:8080/Personal-Performance-System/${p.path}`;
        try {
          await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        } catch {
          // fallback to domcontentloaded
          await page.waitForLoadState('domcontentloaded');
        }

        // Wait 1.5s for framer motion & fonts to settle
        await page.waitForTimeout(1500);

        // Ensure theme class is applied on <html>
        await page.evaluate(({ t }) => {
          if (t === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          }
        }, { t: theme });

        await page.waitForTimeout(500);

        // Capture screenshot
        const screenshotPath = path.join(
          outDir,
          `${p.name.toLowerCase()}-${theme}-${viewport.name}.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: viewport.name === 'mobile' ? false : true });

        // DOM Inspection for hardcoded colors, contrast, and layout overflow
        const domAnalysis = await page.evaluate(() => {
          const results = {
            rawColorClassElements: [],
            lowContrastElements: [],
            horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          };

          const rawRegex = /(text|bg|border)-(amber|sky|emerald|slate|blue|indigo|rose|violet|cyan|orange|green|purple|pink|red|fuchsia|gray|zinc|neutral|stone)-\d+/;

          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            const classList = el.className;
            if (typeof classList === 'string') {
              const matches = classList.match(new RegExp(rawRegex, 'g'));
              if (matches && matches.length > 0) {
                matches.forEach(m => {
                  results.rawColorClassElements.push({
                    cls: m,
                    tag: el.tagName.toLowerCase(),
                    text: el.innerText ? el.innerText.slice(0, 30).trim() : '',
                  });
                });
              }
            }

            // Contrast test on visible text nodes
            if (el.children.length === 0 && el.innerText && el.innerText.trim().length > 0) {
              const style = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
                results.lowContrastElements.push({
                  text: el.innerText.slice(0, 40).trim(),
                  color: style.color,
                  bgColor: style.backgroundColor,
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  className: (el.className || '').toString().slice(0, 60),
                });
              }
            }
          }
          return results;
        });

        // Aggregate findings
        if (domAnalysis.horizontalOverflow) {
          report.mobileOverflows.push({
            page: p.name,
            theme,
            viewport: viewport.name,
            scrollWidth: domAnalysis.scrollWidth,
            innerWidth: domAnalysis.innerWidth,
          });
        }

        // Tally hardcoded classes rendered
        domAnalysis.rawColorClassElements.forEach(item => {
          report.hardcodedClassesRendered[item.cls] = (report.hardcodedClassesRendered[item.cls] || 0) + 1;
        });

        // Compute contrast ratios for text elements with solid bg
        for (const item of domAnalysis.lowContrastElements.slice(0, 100)) {
          const fg = parseRgb(item.color);
          const bg = parseRgb(item.bgColor);
          if (fg && bg && bg.a > 0.8) {
            const ratio = getContrast(fg, bg);
            if (ratio && ratio < 4.5) { // WCAG AA threshold for normal text
              report.contrastWarnings.push({
                page: p.name,
                theme,
                viewport: viewport.name,
                text: item.text,
                ratio: ratio.toFixed(2),
                fg: item.color,
                bg: item.bgColor,
                className: item.className,
              });
            }
          }
        }

        report.pagesAudited.push({
          page: p.name,
          theme,
          viewport: viewport.name,
          screenshot: path.basename(screenshotPath),
          rawClassesFoundOnPage: domAnalysis.rawColorClassElements.length,
        });

        await context.close();
      }
    }
  }

  await browser.close();

  fs.writeFileSync(
    path.join(outDir, 'inspection-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('✅ Browser inspection complete. Report saved to screenshots/browser-inspection/inspection-report.json');
})();

