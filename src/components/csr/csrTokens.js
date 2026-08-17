/**
 * csrTokens.js — token definitions for the CSR surfaces.
 *
 * STATUS: DEFINITION ONLY. Nothing imports this yet. Adopting it is a separate,
 * deliberate pass — see ADOPTION at the bottom of this file.
 *
 * Source of truth is DESIGN.md at the repo root. This file is the machine-readable
 * form of its `primitives` and `colors` blocks, with three deviations, each marked
 * DEVIATION below and each backed by a measured number rather than a preference.
 *
 * Every contrast figure in this file was computed (WCAG 2.1 relative luminance) —
 * none are estimates. Every OKLCH value was converted from its hex, not authored by
 * hand. The two are kept side by side because DESIGN.md asks for perceptual
 * derivation (hold hue and chroma, move lightness) while MUI and the existing
 * theme layer still consume hex.
 *
 * CSR spans two surfaces at different densities, per DESIGN.md section 1:
 *   workspace — /csr, staff, many times a day, dense
 *   portal    — /client, funders, once a quarter, airy
 * They share this colour layer exactly. Only DENSITY below differs between them.
 */

// ---------------------------------------------------------------------------
// TIER 1 — PRIMITIVES
// Raw values. Never reference these from a component; use the semantic tier.
// ---------------------------------------------------------------------------

export const primitives = Object.freeze({
  amber: {
    50: { hex: '#FFFBEB', oklch: 'oklch(98.69% 0.0214 95.28)' },
    100: { hex: '#FEF3C7', oklch: 'oklch(96.19% 0.0580 95.62)' },
    200: { hex: '#FDE68A', oklch: 'oklch(92.43% 0.1151 95.75)' },
    300: { hex: '#FCD34D', oklch: 'oklch(87.90% 0.1534 91.61)' },
    400: { hex: '#FBBF24', oklch: 'oklch(83.69% 0.1644 84.43)' },
    500: { hex: '#F59E0B', oklch: 'oklch(76.86% 0.1647 70.08)' },
    600: { hex: '#D97706', oklch: 'oklch(66.58% 0.1574 58.32)' },
    700: { hex: '#B45309', oklch: 'oklch(55.53% 0.1455 49.00)' },
    900: { hex: '#78350F', oklch: 'oklch(41.37% 0.1054 45.90)' },
  },

  // Warm near-blacks. The anchor DESIGN.md notes the app currently lacks.
  ink: {
    950: { hex: '#0E0B07', oklch: 'oklch(15.18% 0.0102 76.80)' },
    900: { hex: '#171310', oklch: 'oklch(19.05% 0.0089 59.08)' },
    800: { hex: '#292420', oklch: 'oklch(26.44% 0.0105 61.01)' },
  },

  slate: {
    900: { hex: '#0F172A', oklch: 'oklch(20.77% 0.0398 265.75)' },
    800: { hex: '#1E293B', oklch: 'oklch(27.95% 0.0368 260.03)' },
    700: { hex: '#334155', oklch: 'oklch(37.17% 0.0392 257.29)' },
    600: { hex: '#475569', oklch: 'oklch(44.55% 0.0374 257.28)' },
    500: { hex: '#64748B', oklch: 'oklch(55.44% 0.0407 257.42)' },
    400: { hex: '#94A3B8', oklch: 'oklch(71.07% 0.0351 256.79)' },
    300: { hex: '#CBD5E1', oklch: 'oklch(86.90% 0.0198 252.89)' },
    200: { hex: '#E2E8F0', oklch: 'oklch(92.88% 0.0126 255.51)' },
    100: { hex: '#F1F5F9', oklch: 'oklch(96.83% 0.0069 247.90)' },
    50: { hex: '#F8FAFC', oklch: 'oklch(98.42% 0.0034 247.86)' },
  },

  // DEVIATION 1 — DESIGN.md specifies `white: #FFFFFF` as the card surface. The
  // standing global rule is no pure #fff. #FDFDFC is the substitute: a 0.6%
  // warm-neutral step off white, which keeps text-primary at 18.67:1 (pure white
  // gives 19.00:1 — no practical difference) and reads marginally warmer against
  // the amber. Revert by setting this to '#FFFFFF'; nothing else moves.
  paper: { hex: '#FDFDFC', oklch: 'oklch(99.38% 0.0013 106.42)' },

  green: {
    600: { hex: '#16A34A', oklch: 'oklch(62.71% 0.1699 149.21)' },
    700: { hex: '#15803D', oklch: 'oklch(52.73% 0.1371 150.07)' },
    subtle: { hex: '#DCFCE7', oklch: 'oklch(96.24% 0.0434 156.74)' },
  },
  red: {
    600: { hex: '#DC2626', oklch: 'oklch(57.71% 0.2152 27.33)' },
    700: { hex: '#B91C1C', oklch: 'oklch(50.54% 0.1905 27.52)' },
    800: { hex: '#991B1B', oklch: 'oklch(44.37% 0.1613 26.90)' },
    subtle: { hex: '#FEE2E2', oklch: 'oklch(93.56% 0.0309 17.72)' },
  },
  blue: {
    600: { hex: '#2563EB', oklch: 'oklch(54.61% 0.2152 262.88)' },
    800: { hex: '#1E40AF', oklch: 'oklch(42.44% 0.1809 265.64)' },
    subtle: { hex: '#DBEAFE', oklch: 'oklch(93.19% 0.0316 255.59)' },
  },
  // Warning lives in red-orange specifically to stay out of amber's way, so a
  // yellow element can only ever mean brand or action, never caution.
  orange: {
    700: { hex: '#C2410C', oklch: 'oklch(55.34% 0.1739 38.40)' },
    subtle: { hex: '#FFEDD5', oklch: 'oklch(95.42% 0.0372 75.16)' },
  },
});

const hex = (token) => token.hex;

// ---------------------------------------------------------------------------
// TIER 2 — SEMANTIC
// What a component references. Values may move underneath; names should not.
// ---------------------------------------------------------------------------

export const color = Object.freeze({
  // -- Surfaces ------------------------------------------------------------
  // MEASURED, and it contradicts DESIGN.md's stated fix. DESIGN.md argues the app
  // reads flat because canvas #F9FAFB under card #FFFFFF is a one-percent step —
  // measured, 1.045:1. The prescribed replacement (slate-50 under white) measures
  // 1.046:1. It is the same step. Swapping those two hexes buys nothing.
  // Structure has to come from the other two tiers actually being used:
  //   surface vs sunken   1.076:1
  //   any light vs inverse ~18:1
  // Hence DESIGN.md's "at least three tiers per screen" rule is the load-bearing
  // part, not the palette. Treat canvas/surface as a hairline-separated pair.
  canvas: hex(primitives.slate[50]),
  surface: hex(primitives.paper),
  surfaceSunken: hex(primitives.slate[100]),
  surfaceInverse: hex(primitives.ink[950]),

  // -- Text ----------------------------------------------------------------
  // Ratios given canvas / surface / sunken.
  textPrimary: '#12100C', //            18.16 / 18.67 / 17.35
  textSecondary: hex(primitives.slate[600]), // 7.24 /  7.58 /  6.92

  // DEVIATION 2 — DESIGN.md maps text-muted to slate-500 (#64748B). That measures
  // 4.34:1 on surface-sunken, under the 4.5 AA floor, and sunken is exactly where
  // muted text lands (table headers, wells, insets). #5A6B82 is the value already
  // proven in src/styles/muiTheme.js for this role and clears every tier:
  //                                            5.20 /  5.34 /  4.97
  textMuted: '#5A6B82',

  textOnInverse: '#FFFDF7', // 19.30 on surface-inverse
  textOnAmber: '#231603', //   8.23 on action, 14.20 on action-subtle

  // -- Borders -------------------------------------------------------------
  hairline: hex(primitives.slate[200]),
  hairlineStrong: hex(primitives.slate[300]),

  // -- Brand and action ----------------------------------------------------
  // One job each. Amber appears on the logo, the primary button, the active nav
  // pill, and the single hero figure. Nowhere else, and never as text on a light
  // ground — see actionText below for why that variant has to exist.
  action: hex(primitives.amber[500]),
  actionHover: hex(primitives.amber[600]),
  actionSubtle: hex(primitives.amber[100]),
  brandMark: hex(primitives.amber[400]), // 11.76 on inverse; dark grounds only
  focusRing: hex(primitives.amber[600]),

  // Fill amber cannot carry words on a light ground: amber-500 measures 2.4:1 and
  // amber-600 measures 3.04 / 3.19 / 2.91 — the last fails even the 3:1 UI bar.
  // #A35905 is amber-600 darkened along its own hue and clears text everywhere:
  //                                            5.03 /  5.27 /  4.81
  // Use for text buttons, links, selected tab labels, tab indicators, and any
  // checked control. Never swap it in for a fill.
  actionText: '#A35905',

  // -- Semantics -----------------------------------------------------------
  // No semantic shares a hex with `action`. Each carries a solid (fills, icons)
  // and, where the solid misses AA as text, a separate text-safe shade.
  success: hex(primitives.green[600]), //      3.15 / 3.30 / 3.01 — fills only
  successText: hex(primitives.green[700]), //  4.79 / 5.02 / 4.58
  successSubtle: hex(primitives.green.subtle), // green-700 on it: 4.57

  warning: hex(primitives.orange[700]), //     4.95 / 5.18 / 4.73
  warningText: hex(primitives.orange[700]),
  warningSubtle: hex(primitives.orange.subtle), // orange-700 on it: 4.52

  danger: hex(primitives.red[600]), //         4.62 / 4.83 / 4.41 — 4.41 misses AA
  dangerText: hex(primitives.red[700]), //     6.18 / 6.35 / 5.91
  dangerSubtle: hex(primitives.red.subtle), // red-800 on it: 6.80

  info: hex(primitives.blue[600]), //          4.94 / 5.17 / 4.72
  infoText: hex(primitives.blue[600]),
  infoSubtle: hex(primitives.blue.subtle), //  blue-800 on it: 7.15

  // -- Money ---------------------------------------------------------------
  // Financial figures get their own roles so they can be restyled in one place.
  money: hex(primitives.slate[900]), //        17.06 / 17.51 / 16.30
  moneyPositive: hex(primitives.green[700]),
  moneyNegative: hex(primitives.red[700]),
});

// ---------------------------------------------------------------------------
// White-label — funder portal only
// ---------------------------------------------------------------------------
// A funder's brand hex replaces exactly these three roles and nothing else.
// Surfaces, text and semantics never rebrand, so a funder's colour cannot break
// legibility anywhere that was not already measured above.
//
// Derive the ramp in OKLCH: hold H and C, move L. sRGB channel multiplication is
// what forces the current implementation into a twenty-step search for a legible
// variant. Targets, matching the amber they replace:
//   action        L ~= 77%   (amber-500 is 76.86%)
//   actionSubtle  L ~= 96%   (amber-100 is 96.19%)
//   actionText    L ~= 54%   (amber-text is 54.01%) — must clear 4.5:1 on surface
export const WHITE_LABEL_ROLES = Object.freeze(['action', 'actionSubtle', 'brandMark']);

export const WHITE_LABEL_TARGET_LIGHTNESS = Object.freeze({
  action: 0.77,
  actionSubtle: 0.96,
  actionText: 0.54,
});

// ---------------------------------------------------------------------------
// TIER 2 — TYPE, SPACE, SHAPE, MOTION
// ---------------------------------------------------------------------------

export const font = Object.freeze({
  ui: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
  // Same stack. Named separately so figures can be moved to a dedicated face
  // later without touching every call site.
  number: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
});

// Every figure on screen is tabular. A rupee value that changes width mid-render
// shoves the layout beside it, which in a financial table is a correctness
// problem, not a polish one.
export const TABULAR = Object.freeze({
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: "'tnum' 1",
});

export const type = Object.freeze({
  display: { fontSize: '32px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em' },
  titleLg: { fontSize: '24px', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
  title: { fontSize: '18px', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.02em' },
  titleSm: { fontSize: '15px', fontWeight: 650, lineHeight: 1.4, letterSpacing: '-0.01em' },
  body: { fontSize: '15px', fontWeight: 400, lineHeight: 1.55 },
  bodySm: { fontSize: '13px', fontWeight: 400, lineHeight: 1.5 },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.4,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  button: { fontSize: '14.5px', fontWeight: 650, lineHeight: 1, letterSpacing: '-0.01em' },

  // The one figure a screen exists to report. It is the largest object on that
  // screen — larger than the page title.
  statHero: { fontSize: '32px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', ...TABULAR },
  stat: { fontSize: '24px', fontWeight: 750, lineHeight: 1.15, ...TABULAR },
  number: { fontSize: '15px', fontWeight: 500, lineHeight: 1.4, ...TABULAR },
});

export const space = Object.freeze({
  base: '4px',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
});

export const radius = Object.freeze({
  sm: '4px', // chips inside cards, small badges
  md: '8px', // buttons, inputs, nav items
  lg: '12px', // cards, tiles
  xl: '16px', // modals, sheets, page panels
  pill: '9999px',
});

// Depth comes from surface tone and hairlines, not shadow. Shadow is only for
// objects that genuinely float above the page. A card, a header and a nav are
// not among them — a permanent shadow under a static header is the clearest
// single tell that an interface predates about 2020.
export const elevation = Object.freeze({
  none: 'none',
  overlay: '0 4px 16px rgba(14, 11, 7, 0.08)', // menus, popovers, dropdowns
  modal: '0 20px 60px rgba(14, 11, 7, 0.12)', // modals, drawers
});

// ease-out throughout, no spring. Corroborated by the UDS finance anti-pattern
// set, which rates bouncy easing on financial products `critical`.
export const motion = Object.freeze({
  feedback: { duration: '120ms', easing: 'ease-out' }, // hover, press, focus
  entrance: { duration: '200ms', easing: 'ease-out' }, // menus, panels, rows
  overlay: { duration: '220ms', easing: 'ease-out' }, // modals, drawers

  // Builds an explicit property list so a call site never has to reach for the
  // catch-all keyword, which animates layout properties, drops frames, and is one
  // of the three rules scripts/designLint.js fails the build on.
  transition: (props, { duration, easing } = { duration: '120ms', easing: 'ease-out' }) =>
    props.map((p) => `${p} ${duration} ${easing}`).join(', '),
});

export const NEVER_ANIMATE = Object.freeze([
  'font-weight',
  'letter-spacing',
  'width',
  'margin',
  'all',
]);

// ---------------------------------------------------------------------------
// DENSITY — the only axis on which the two CSR surfaces differ
// ---------------------------------------------------------------------------

export const density = Object.freeze({
  workspace: Object.freeze({
    rowHeight: '44px',
    buttonHeight: '44px',
    inputHeight: '44px',
    contentMaxWidth: '1280px',
    sectionGap: space.lg,
    cardPadding: space.lg,
  }),
  portal: Object.freeze({
    rowHeight: '52px',
    buttonHeight: '48px',
    inputHeight: '48px',
    contentMaxWidth: '880px',
    sectionGap: space.xl,
    cardPadding: space.xl,
  }),
});

// Touch targets grow on small screens rather than shrinking, and inputs never
// drop below 16px there or iOS zooms the viewport on focus.
export const TOUCH_TARGET_MIN = '48px';
export const MOBILE_INPUT_MIN_FONT_SIZE = '16px';

export const breakpoint = Object.freeze({
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
});

// ---------------------------------------------------------------------------
// Currency
// ---------------------------------------------------------------------------
// Lakh and crore grouping is not optional. A plain toLocaleString() produces
// thousands grouping and is a defect in this app.
export const formatINR = (value, { decimals = 0 } = {}) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0);

// ---------------------------------------------------------------------------
// ADOPTION
// ---------------------------------------------------------------------------
// Nothing imports this file. Before anything does, two things are worth knowing:
//
// 1. This layer cannot reach MUI components on its own. CSR renders MuiButton,
//    MuiChip, MuiTableCell and others, and those take their colour from
//    src/styles/muiTheme.js regardless of what is defined here. Reaching them
//    needs either a ThemeProvider wrapping the CSR routes with an override built
//    from these values, or sx props at each call site. A CSR-scoped token file
//    alone will not change how a MUI component in CSR renders.
//
// 2. Adopting this means CSR and the rest of the app diverge — two palettes, one
//    of which will drift. DESIGN.md's opening premise is a single shared token
//    layer across both surfaces. This file is scoped to CSR by explicit request;
//    the divergence is the accepted cost of that scope.
//
// Unresolved in DESIGN.md and therefore provisional here:
//   - light workspace with a dark anchor, vs fully dark chrome (v2 Q1)
//   - whether #FBBF24 is fixed or the amber ramp can shift (v2 Q2)
//   - whether the portal shares this type scale or steps up a size (v2 Q3)
export default Object.freeze({
  primitives,
  color,
  font,
  type,
  space,
  radius,
  elevation,
  motion,
  density,
  breakpoint,
  formatINR,
});
