#!/usr/bin/env node
/* eslint-disable no-console */
//
// scripts/uiAudit.js — measure the rendered UI instead of inferring it from source.
//
// Everything in a design review that carries a number is a property of PIXELS,
// not of JSX. Reading `borderRadius: 2` from a component tells you nothing about
// what MUI's cascade actually produced, what the contrast is against the surface
// that ended up behind it, or whether the layout shifts on load. This script
// opens the real app and asks the browser.
//
// It reports facts only. No judgement, no severity, no prose — that is the
// reviewer's job. The output is the evidence a review is built from.
//
// Setup (once):
//   npm i -D playwright @axe-core/playwright && npx playwright install chromium
//
// Run:
//   npm start                                  # in another terminal
//   node scripts/uiAudit.js --url http://localhost:3000 \
//        --routes /,/pricing,/dashboard \
//        --email you@example.com --password ****
//
// Output:
//   _review/<timestamp>/shots/<route>@<width>.png
//   _review/<timestamp>/audit.json

const fs = require('fs');
const path = require('path');

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '');
const ROUTES = arg('routes', '/').split(',').map((r) => r.trim()).filter(Boolean);
const EMAIL = arg('email');
const PASSWORD = arg('password');
const LOGIN_PATH = arg('login', '/login');
// 360 is the real floor for Indian Android handsets; 1280 is the common laptop.
const WIDTHS = (arg('widths', '360,768,1280,1920')).split(',').map(Number);

const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, '..', '_review', STAMP);

// ---------------------------------------------------------------------------
// Browser-side probes. These run inside the page, so every value is computed
// style after the full cascade — the number the user actually sees.
// ---------------------------------------------------------------------------

const PROBES = /* js */ `() => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0';
  };
  const all = [...document.querySelectorAll('*')].filter(vis);

  // ---- colour helpers ----
  const parse = (c) => {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((n) => parseFloat(n));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  // The painted background behind an element: walk up until something is opaque.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a >= 0.95) return c;
      n = n.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  // ---- 1. contrast on every text node ----
  const contrast = [];
  all.forEach((el) => {
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!direct) return;
    const s = getComputedStyle(el);
    const fg = parse(s.color);
    if (!fg || fg.a < 0.5) return;
    const px = parseFloat(s.fontSize);
    const w = parseInt(s.fontWeight, 10) || 400;
    // WCAG large text: >=24px, or >=18.66px when bold.
    const large = px >= 24 || (px >= 18.66 && w >= 700);
    const req = large ? 3 : 4.5;
    const r = ratio(fg, bgOf(el));
    if (r < req) {
      contrast.push({
        text: el.textContent.trim().slice(0, 45),
        selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
        color: s.color, fontSize: px, fontWeight: w,
        ratio: Math.round(r * 100) / 100, required: req,
      });
    }
  });

  // ---- 2. interactive target sizes ----
  // WCAG 2.2 SC 2.5.8 minimum is 24x24 CSS px. Apple HIG says 44, MD3 says 48.
  // Report the measurement and all three thresholds; let the reviewer judge.
  const SEL = 'a,button,[role="button"],input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const targets = [];
  [...document.querySelectorAll(SEL)].filter(vis).forEach((el) => {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (Math.min(w, h) < 44) {
      targets.push({
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute('aria-label') || el.textContent.trim() || el.getAttribute('name') || '').slice(0, 40),
        w, h,
        failsWCAG22: Math.min(w, h) < 24,
        failsApple: Math.min(w, h) < 44,
        failsMD3: Math.min(w, h) < 48,
      });
    }
  });

  // ---- 3. the actual design-token spread ----
  const tally = (fn) => {
    const m = {};
    all.forEach((el) => { const k = fn(getComputedStyle(el), el); if (k) m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const radii = tally((s) => (s.borderRadius && s.borderRadius !== '0px' ? s.borderRadius : null));
  const shadows = tally((s) => (s.boxShadow && s.boxShadow !== 'none' ? s.boxShadow.slice(0, 60) : null));
  const fontSizes = tally((s, el) => ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? s.fontSize : null));
  const fontWeights = tally((s, el) => ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? s.fontWeight : null));
  const colors = tally((s, el) => ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ? s.color : null));
  const bgs = tally((s) => { const c = parse(s.backgroundColor); return c && c.a > 0.02 ? s.backgroundColor : null; });
  const borderColors = tally((s) => (parseFloat(s.borderTopWidth) > 0 ? s.borderTopColor : null));

  // ---- 4. transitions that animate layout ----
  const layoutProps = /\\b(all|width|height|margin|padding|top|left|right|bottom|font-weight|flex)\\b/;
  const badTransitions = [];
  all.forEach((el) => {
    const p = getComputedStyle(el).transitionProperty;
    if (p && p !== 'none' && layoutProps.test(p)) {
      badTransitions.push({
        selector: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
        property: p,
        duration: getComputedStyle(el).transitionDuration,
      });
    }
  });

  // ---- 5. numerals that will jitter ----
  // Any element whose text is mostly digits and is NOT tabular will change width
  // when the value changes, shoving adjacent layout.
  const jitter = [];
  all.forEach((el) => {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!t || t.length > 24) return;
    const digits = (t.match(/\\d/g) || []).length;
    if (digits < 2 || digits / t.length < 0.4) return;
    const s = getComputedStyle(el);
    if (!/tabular-nums/.test(s.fontVariantNumeric)) {
      jitter.push({ text: t, fontSize: s.fontSize, fontVariantNumeric: s.fontVariantNumeric || 'normal' });
    }
  });

  // ---- 6. horizontal overflow ----
  const overflow = document.documentElement.scrollWidth > window.innerWidth + 1
    ? { scrollWidth: document.documentElement.scrollWidth, viewport: window.innerWidth }
    : null;

  // ---- 7. images with no error handling / no alt ----
  const images = [...document.images].map((img) => ({
    src: (img.currentSrc || img.src || '').slice(-70),
    alt: img.alt || null,
    broken: img.complete && img.naturalWidth === 0,
  })).filter((i) => !i.alt || i.broken);

  return {
    counts: { elements: all.length },
    contrastFailures: contrast,
    smallTargets: targets,
    tokens: { radii, shadows, fontSizes, fontWeights, textColors: colors, backgrounds: bgs, borderColors },
    layoutAnimatingTransitions: badTransitions,
    nonTabularNumerals: jitter,
    horizontalOverflow: overflow,
    imageIssues: images,
  };
}`;

// Cumulative Layout Shift, observed during load rather than guessed at from
// whether a skeleton "looks like" the content it replaces.
const CLS_PROBE = /* js */ `() => new Promise((resolve) => {
  let cls = 0;
  const shifts = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) {
          cls += e.value;
          if (e.value > 0.01) shifts.push({ value: Math.round(e.value * 1000) / 1000 });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) { /* unsupported */ }
  setTimeout(() => resolve({ cls: Math.round(cls * 1000) / 1000, shifts }), 3000);
})`;

// ---------------------------------------------------------------------------

async function main() {
  let chromium, AxeBuilder;
  try {
    ({ chromium } = require('playwright'));
    try { ({ AxeBuilder } = require('@axe-core/playwright')); } catch (_) { AxeBuilder = null; }
  } catch (_) {
    console.error('\nuiAudit needs Playwright:\n  npm i -D playwright @axe-core/playwright && npx playwright install chromium\n');
    process.exit(1);
  }

  fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const browser = await chromium.launch();
  const results = { base: BASE, ranAt: new Date().toISOString(), routes: {} };

  // One context so the login session is reused across routes and widths.
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));

  if (EMAIL && PASSWORD) {
    await page.goto(`${BASE}${LOGIN_PATH}`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[autocomplete="username"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    console.log(`  signed in as ${EMAIL} → ${page.url()}`);
  }

  for (const route of ROUTES) {
    const slug = route.replace(/^\//, '').replace(/\//g, '-') || 'root';
    console.log(`\n${route}`);
    results.routes[route] = { widths: {} };

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
      consoleErrors.length = 0;

      const t0 = Date.now();
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
      const loadMs = Date.now() - t0;

      const cls = await page.evaluate(CLS_PROBE);
      const probes = await page.evaluate(PROBES);

      const shot = path.join(OUT, 'shots', `${slug}@${width}.png`);
      await page.screenshot({ path: shot, fullPage: true });

      let axe = null;
      if (AxeBuilder && width === 1280) {
        try {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
          axe = r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
        } catch (e) { axe = [{ error: String(e).slice(0, 120) }]; }
      }

      results.routes[route].widths[width] = {
        loadMs, cls, screenshot: path.relative(OUT, shot), axe,
        consoleErrors: [...new Set(consoleErrors)],
        ...probes,
      };

      const c = probes.contrastFailures.length;
      const t = probes.smallTargets.filter((x) => x.failsWCAG22).length;
      console.log(
        `  ${String(width).padStart(4)}px  ${String(loadMs).padStart(5)}ms  ` +
        `CLS ${String(cls.cls).padEnd(5)}  contrast✗ ${String(c).padStart(3)}  ` +
        `target<24 ${String(t).padStart(2)}  radii ${probes.tokens.radii.length}  ` +
        `type sizes ${probes.tokens.fontSizes.length}` +
        (probes.horizontalOverflow ? '  \x1b[31mH-OVERFLOW\x1b[0m' : '')
      );
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'audit.json'), JSON.stringify(results, null, 2));

  console.log(`\nWrote ${path.relative(process.cwd(), OUT)}/audit.json`);
  console.log('Screenshots in shots/. Feed both to the ui-audit skill.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
