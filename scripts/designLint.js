#!/usr/bin/env node
/* eslint-disable no-console */
//
// scripts/designLint.js — mechanical design-system checks.
//
// These four rules exist because each one was found by hand in a UI review and
// each one is fully decidable from source. A rule that a machine can decide
// should never cost a human a second look.
//
//   1. TRANSITION_ALL     `transition: all` — animates layout properties
//   2. WEIGHT_SHIFT       font-weight changing on :hover/:focus/.active
//   3. NATIVE_DIALOG      window.confirm / alert / prompt
//
// And one OPT-IN rule, off by default (`--tokens`):
//   HARDCODED_COLOUR      colour literals outside the theme layer
//
// HARDCODED_COLOUR is deliberately not on by default, and the reason matters.
// It is a GOVERNANCE rule — "route colour through the token layer" — not a
// design rule. It cannot tell you whether a colour is any good. It flags pink
// and amber identically, because it has no idea what either one is for. Turning
// it on by default made this script look like it had opinions about aesthetics
// when it has none. Enable it once a token layer exists and you want to keep
// colour flowing through it; never mistake a clean run for a good-looking app.
//
// The three default rules are different in kind: each is a defect with no
// aesthetic content whatsoever. `transition: all` animates layout properties and
// drops frames. A font-weight change on hover reflows text. `confirm()` cannot be
// styled. There is no product on earth where these are the right choice, which
// is exactly what qualifies them to be a rule rather than a judgement.
//
// Run:  npm run lint:design          (exit 1 on any violation)
//       npm run lint:design -- --warn (report only, always exit 0)
//
// Adding a legitimate exception: put the file in ALLOWLIST below with a reason.
// Do not add an inline suppression comment — the allowlist is the record.

const fs = require('fs');
const path = require('path');

// Portable: works in any repo. Override with --root / --src, or drop a
// `design.config.json` next to package.json holding { src, allow: { path: reason } }.
const flag = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const ROOT = path.resolve(flag('root', path.join(__dirname, '..')));
const SRC = path.resolve(ROOT, flag('src', 'src'));
const WARN_ONLY = process.argv.includes('--warn');
// Opt-in. See the header comment — this one is governance, not design.
const CHECK_TOKENS = process.argv.includes('--tokens');

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------
// Only relevant to the opt-in --tokens rule. The theme layer is the one place
// colour literals legitimately live; everything else should reference it.
//
// Configure per project in design.config.json:
//   { "src": "src", "allow": { "src/theme.js": "the token source" } }
// Anything matching is skipped by the colour rule. A reason is required — the
// config is the record of why an exception exists.
let ALLOWLIST = {};
const CONFIG_PATH = path.join(ROOT, 'design.config.json');
if (fs.existsSync(CONFIG_PATH)) {
  try {
    ALLOWLIST = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).allow || {};
  } catch (e) {
    console.error(`designLint: could not parse design.config.json — ${e.message}`);
    process.exit(1);
  }
} else {
  // Sensible defaults for common conventions when no config exists.
  ALLOWLIST = {
    'src/theme.js': 'conventional token source',
    'src/styles/theme.js': 'conventional token source',
    'src/styles/tokens.js': 'conventional token source',
    'src/styles/muiTheme.js': 'conventional token source',
  };
}

// Test files describe colours to assert on them; that is not drift.
const isTest = (rel) => /\.(test|spec)\.[jt]sx?$/.test(rel) || rel.includes('__tests__');

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

// rgb()/rgba() with literal numbers. Shadows and scrims are the common honest
// use, so those two properties are exempt — a scrim is not a brand colour.
const RGB = /\brgba?\(\s*\d+\s*,/g;
const SHADOW_OR_SCRIM = /(box-shadow|boxShadow|text-shadow|textShadow|filter|backdrop)/i;

function checkColours(rel, source) {
  const out = [];
  source.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('*') || line.trim().startsWith('//')) return; // comments
    if (SHADOW_OR_SCRIM.test(line)) return;

    const hits = [...(line.match(HEX) || []), ...(line.match(RGB) || [])];
    hits.forEach((hit) => {
      out.push({
        rule: 'HARDCODED_COLOUR',
        file: rel,
        line: i + 1,
        found: hit,
        message: `Colour literal "${hit}" outside the theme layer. Reference a token instead — a literal here cannot be themed, cannot be rebranded, and blocks dark mode. Note: this rule says nothing about whether the colour is any GOOD; that is a judgement, not a check.`,
      });
    });
  });
  return out;
}

function checkTransitionAll(rel, source) {
  const out = [];
  source.split('\n').forEach((line, i) => {
    // `transition: all …` in CSS, or transition: 'all …' in a sx/style object.
    if (/transition\s*:\s*['"`]?\s*all\b/.test(line)) {
      out.push({
        rule: 'TRANSITION_ALL',
        file: rel,
        line: i + 1,
        found: line.trim().slice(0, 70),
        message:
          'transition: all animates every property including layout ones (width, margin, font-weight), which drops frames and blurs text mid-tween. Name the properties: `transition: background-color 120ms ease-out, color 120ms ease-out`.',
      });
    }
  });
  return out;
}

// Parse `selector { … }` blocks out of a CSS file. Good enough for flat
// stylesheets; nested rules are not used in this codebase.
//
// Comments are blanked (not deleted) before parsing, preserving byte offsets so
// reported line numbers stay accurate. Leaving them in put the comment text
// inside the captured selector, so `.sidebar-link.active` arrived as
// `/* Links */ .sidebar-link.active` and never matched its base — the rule
// silently found nothing on a file that violates it.
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

function cssBlocks(source) {
  const clean = stripComments(source);
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    if (!selector || selector.startsWith('@')) continue; // at-rules
    const line = clean.slice(0, m.index).split('\n').length;
    blocks.push({ selector, body: m[2], line });
  }
  return blocks;
}

const weightOf = (body) => {
  const m = body.match(/font-weight\s*:\s*(\d{3})/);
  return m ? Number(m[1]) : null;
};

// A state selector is the base selector plus a pseudo-class or state class.
const STATE = /(:hover|:focus|:active|:focus-visible|\.active|\.selected|\.is-active|\[aria-selected)/;
const baseOf = (selector) =>
  selector
    .split(',')[0]
    .replace(/(:hover|:focus-visible|:focus|:active)/g, '')
    .replace(/\.(active|selected|is-active)\b/g, '')
    .replace(/\[aria-selected[^\]]*\]/g, '')
    .trim();

function checkWeightShift(rel, source) {
  const blocks = cssBlocks(source);
  const baseWeights = new Map();

  // Pass 1 — record the resting weight of every plain selector.
  blocks.forEach((b) => {
    if (STATE.test(b.selector)) return;
    const w = weightOf(b.body);
    if (w != null) baseWeights.set(b.selector.split(',')[0].trim(), w);
  });

  // Pass 2 — any state selector that sets a DIFFERENT weight reflows the text.
  const out = [];
  blocks.forEach((b) => {
    if (!STATE.test(b.selector)) return;
    const w = weightOf(b.body);
    if (w == null) return;
    const base = baseOf(b.selector);
    const bw = baseWeights.get(base);
    if (bw != null && bw !== w) {
      out.push({
        rule: 'WEIGHT_SHIFT',
        file: rel,
        line: b.line,
        found: `${b.selector} { font-weight: ${w} }  (base ${base} is ${bw})`,
        message:
          'font-weight changes on a state, so the label re-flows every time the state changes — visible text shift on hover or navigation. Keep the weight constant and carry the state with colour or background instead. If the bolder weight is required, set it on the base too and differentiate another way.',
      });
    }
  });
  return out;
}

const NATIVE = /(?:^|[^.\w])(?:window\s*\.\s*)?(confirm|alert|prompt)\s*\(/g;

function checkNativeDialog(rel, source) {
  const out = [];
  source.split('\n').forEach((line, i) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    let m;
    NATIVE.lastIndex = 0;
    while ((m = NATIVE.exec(line))) {
      out.push({
        rule: 'NATIVE_DIALOG',
        file: rel,
        line: i + 1,
        found: `${m[1]}(`,
        message: `Native ${m[1]}() cannot be styled, cannot be branded, blocks the main thread, and is unusable inside a white-labelled portal. Use a MUI Dialog. For destructive actions also provide Undo rather than a confirmation — a reversible action needs no prompt.`,
      });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Walk
// ---------------------------------------------------------------------------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'graphify-out') continue;
      walk(full, files);
    } else if (/\.(jsx?|tsx?|css|scss|html?)$/.test(entry.name)) {
      // .html matters as much as .jsx here. A standalone review screen, a
      // prototype or an email template carries exactly the same defects —
      // native dialogs, transition:all, a weight shift on hover — and the
      // walker used to skip them silently, which reads as a clean pass rather
      // than as "not checked". Silence and a green tick must not look alike.
      files.push(full);
    }
  }
  return files;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error('designLint: src/ not found');
    process.exit(1);
  }

  const violations = [];

  for (const full of walk(SRC)) {
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (isTest(rel)) continue;
    const source = fs.readFileSync(full, 'utf8');
    const allowed = Object.prototype.hasOwnProperty.call(ALLOWLIST, rel);

    if (CHECK_TOKENS && !allowed) violations.push(...checkColours(rel, source));
    violations.push(...checkTransitionAll(rel, source));
    violations.push(...checkNativeDialog(rel, source));
    // Stylesheets and anything that can carry a <style> block. An HTML file
    // with an inline rule shifts weight on hover just as visibly as a .css one.
    if (/\.(css|scss|html?)$/.test(rel)) violations.push(...checkWeightShift(rel, source));
  }

  // Group by rule so the output reads as four problems, not two thousand lines.
  const byRule = violations.reduce((acc, v) => {
    (acc[v.rule] = acc[v.rule] || []).push(v);
    return acc;
  }, {});

  // ---- Baseline -----------------------------------------------------------
  // Retrofitting a rule onto an existing codebase produces a number nobody can
  // act on, and a rule nobody can action gets deleted. So the baseline records
  // today's count per rule and the build fails only when a count RISES. Drift
  // stops immediately; the backlog is paid down deliberately.
  //
  // `--update-baseline` rewrites it. Lowering a number is always safe; raising
  // one should be a conscious, reviewed act.
  const baselinePath = path.join(ROOT, '.designlint-baseline.json');
  const baseline = fs.existsSync(baselinePath)
    ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
    : null;

  if (process.argv.includes('--update-baseline')) {
    const next = Object.fromEntries(Object.entries(byRule).map(([r, l]) => [r, l.length]));
    fs.writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    console.log('designLint: baseline written to .designlint-baseline.json');
    console.log(Object.entries(next).map(([r, n]) => `  ${r}: ${n}`).join('\n'));
    return;
  }

  const regressions = [];
  const improvements = [];
  for (const [rule, list] of Object.entries(byRule)) {
    const was = baseline?.[rule] ?? 0;
    if (list.length > was) regressions.push({ rule, was, now: list.length });
    else if (list.length < was) improvements.push({ rule, was, now: list.length });
  }
  for (const rule of Object.keys(baseline || {})) {
    if (!byRule[rule]) improvements.push({ rule, was: baseline[rule], now: 0 });
  }

  if (violations.length === 0 && !baseline) {
    console.log('designLint: clean.');
    return;
  }

  console.log('');
  for (const [rule, list] of Object.entries(byRule)) {
    const was = baseline?.[rule];
    const delta =
      was == null ? '' : list.length > was ? `  \x1b[31m(+${list.length - was} new)\x1b[0m`
      : list.length < was ? `  \x1b[32m(-${was - list.length})\x1b[0m` : '  (at baseline)';
    console.log(`\x1b[1m${rule}\x1b[0m  —  ${list.length} occurrence${list.length === 1 ? '' : 's'}${delta}`);
    console.log(`  ${list[0].message}`);
    console.log('');
    const shown = list.slice(0, 12);
    shown.forEach((v) => console.log(`    ${v.file}:${v.line}  ${v.found}`));
    if (list.length > shown.length) console.log(`    … and ${list.length - shown.length} more`);
    console.log('');
  }

  improvements.forEach((i) =>
    console.log(`\x1b[32m✓ ${i.rule} improved: ${i.was} → ${i.now}. Run --update-baseline to lock it in.\x1b[0m`)
  );

  if (regressions.length) {
    console.log('');
    regressions.forEach((r) =>
      console.log(`\x1b[31m✗ ${r.rule} regressed: ${r.was} → ${r.now}\x1b[0m`)
    );
    console.log('\nNew violations were introduced. Fix them, or allowlist the file with a written reason.\n');
    if (!WARN_ONLY) process.exit(1);
    return;
  }

  console.log(`\ndesignLint: ${violations.length} known violation(s), none new. Baseline holding.\n`);
}

main();
