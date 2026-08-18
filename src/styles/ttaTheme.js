import { createTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// TTA theme — DESIGN.md + Cal.com, over the measured accessibility work.
// ---------------------------------------------------------------------------
// NOT WIRED YET. muiTheme.js is still what App.js imports. Swapping is one line;
// see ADOPTION at the foot of this file.
//
// Three sources, and what each contributed:
//
//   DESIGN.md    four surface tiers, amber discipline, tabular figures, depth
//                from tone rather than shadow
//   Cal.com      radius with ROLE assignments, near-monochrome restraint,
//                elevation restraint, and the principle that exposed the real
//                defect below
//   muiTheme.js  the measured contrast values. These are not preferences.
//                #A35905 exists because #FBBF24 scores 1.60:1 as text on the
//                page ground and #D97706 scores 3.05:1 — both under AA. Do not
//                "tidy" them back toward the brand ramp.
//
// THE DEFECT CAL.COM EXPOSED. Cal.com's rule is that the primary CTA is the
// heaviest object on screen; DESIGN.md says the same in its own words. The live
// theme's containedPrimary is #FDE68A, which measures 1.19:1 against the page
// ground — very nearly the LIGHTEST thing on screen. The primary action has not
// been reading as primary. That is what PRIMARY_STYLE below fixes.
// ---------------------------------------------------------------------------

// 'amber' keeps IKF's brand on the primary button (amber-500 fill, dark ink,
//         8.23:1 text contrast, 2.06:1 against the page).
// 'ink'   is Cal.com's answer: a near-black CTA at 18.07:1 against the page.
//         Strongest by a distance, but it retires amber from buttons entirely —
//         amber would then live only on the logo, the active nav pill and the
//         one hero figure per screen.
// Flipping this constant is the whole change; nothing else needs editing.
const PRIMARY_STYLE = 'amber';

// ── Primitives ─────────────────────────────────────────────────────────────
const AMBER_500 = '#F59E0B';   // action fill
const AMBER_600 = '#D97706';   // action hover
const AMBER_400 = '#FBBF24';   // brand mark, dark grounds only
const AMBER_100 = '#FEF3C7';   // action-subtle: active nav pill, selected row

// Amber cannot carry words on a light ground at any weight that still reads as
// amber. This is amber-600 darkened along its own hue until it clears AA on
// every ground the app paints: white 5.27 / #F9FAFB 5.04 / #F5F5F7 4.84 /
// #F3F4F6 4.78 / #FFFBEB 5.08. Text buttons, links, selected tabs, tab
// indicator, checked controls.
const AMBER_TEXT = '#A35905';

const INK = '#111111';          // Cal.com's primary; TTA's heaviest neutral
const INK_PRESSED = '#242424';  // Cal.com's press state
const INK_950 = '#0E0B07';      // DESIGN.md's warm near-black: nav, hero, login

// Surfaces. Cal.com's four light tiers, warmed slightly toward DESIGN.md.
const CANVAS = '#F9FAFB';        // page floor
const SURFACE = '#FFFFFF';       // cards, panels
const SURFACE_SOFT = '#F8F9FA';  // nav pill-group wrapper, soft dividers
const SURFACE_SUNKEN = '#F1F5F9';// table headers, wells, insets
const HAIRLINE = '#E5E7EB';
const HAIRLINE_SOFT = '#F3F4F6';

// Greys, measured on the tinted grounds this app actually uses — not on white.
// #94A3B8 scores 2.45 and #6B7280 scores 4.44 on #F5F5F7, both failing.
const GREY_MUTED = '#5F6672';  // 5.54 on #F9FAFB, 5.31 on #F5F5F7
const GREY_LABEL = '#5B6270';  // 5.87 / 5.63

const TEXT_PRIMARY = '#1d1d1f';
const TEXT_SECONDARY = '#6e6e73';

// ── Motion ─────────────────────────────────────────────────────────────────
// Cal.com documents no motion at all — deliberately ("Animation and transition
// timings are not in scope", "Never document hover"). So the timings come from
// NN/g, and the restraint comes from Cal.com.
//
// NN/g: 100ms for simple feedback, 200-300ms for substantial screen changes,
// 100-500ms overall with 500 the point animations "feel like a real drag", and
// — the part DESIGN.md was missing — entering elements want a LONGER duration
// than exiting ones, with ease-out entering and ease-in exiting.
//
// No spring, no bounce, anywhere. The design-system MCP rates bouncy easing on
// financial products `critical`, and this app moves money.
export const motion = {
  feedback: '120ms',   // hover, press, focus — perceptible, not sluggish
  enter: '220ms',      // menus, panels, rows arriving
  exit: '160ms',       // the same leaving: shorter, per NN/g asymmetry
  overlayEnter: '260ms',
  overlayExit: '200ms',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',  // entering
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',   // exiting
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Name the properties explicitly. The catch-all keyword animates layout
// properties too — width, margin, font-weight — which drops frames and blurs
// text mid-tween. There are 19 such declarations in the app today, and
// designLint fails the build on any new one.
const t = (props, dur = motion.feedback, ease = motion.easeOut) =>
  props.map((p) => `${p} ${dur} ${ease}`).join(', ');

// ── Radius ─────────────────────────────────────────────────────────────────
// Cal.com's contribution: a scale with ROLES attached, in px. The live theme
// uses rem with no role mapping, so nothing tells you which to reach for.
const radius = {
  xs: 4,    // badge accents
  sm: 6,    // dropdown items, small inline buttons
  md: 8,    // BUTTONS, INPUTS, tabs
  lg: 12,   // content cards
  xl: 16,   // modals, sheets, the one marquee panel per screen
  pill: 9999,
};

// ── Elevation ──────────────────────────────────────────────────────────────
// Cal.com: "small drop shadows, colour-block contrast for emphasis. No heavy
// shadows." DESIGN.md: "depth comes from tone, not shadow." The live theme goes
// up to 0 25px 50px. Two real shadows, and the surface tiers do the rest.
const SHADOW_SOFT = '0 1px 2px rgba(17,17,17,0.05)';
const SHADOW_RAISED = '0 4px 12px rgba(17,17,17,0.08)';
const SHADOW_OVERLAY = '0 12px 32px rgba(17,17,17,0.12)';

const primaryFill = PRIMARY_STYLE === 'ink' ? INK : AMBER_500;
const primaryFillHover = PRIMARY_STYLE === 'ink' ? INK_PRESSED : AMBER_600;
const primaryInk = PRIMARY_STYLE === 'ink' ? '#FFFFFF' : '#231603';

const ttaTheme = createTheme({
  palette: {
    // `main` is what MUI renders as TEXT for text buttons, links, focused labels
    // and selected tabs — so it must be the on-light-legible amber, never the
    // fill. The fill survives as `light` and in containedPrimary below.
    primary: { main: AMBER_TEXT, light: AMBER_400, dark: '#7E3A06', contrastText: primaryInk },
    secondary: { main: '#16A34A', light: '#86EFAC', dark: '#15803D', contrastText: '#111827' },
    info: { main: '#2563EB', light: '#93C5FD', dark: '#1E40AF', contrastText: '#FFFFFF' },
    // Warning moves to red-orange so a yellow element can only ever mean brand
    // or action. The live theme has warning.dark === primary.main, so neither
    // can signify anything.
    warning: { main: '#C2410C', light: '#FDBA74', dark: '#9A3412', contrastText: '#FFFFFF' },
    error: { main: '#DC2626', light: '#FCA5A5', dark: '#B91C1C', contrastText: '#FFFFFF' },
    success: { main: '#16A34A', light: '#86EFAC', dark: '#15803D', contrastText: '#111827' },
    grey: {
      50: CANVAS, 100: HAIRLINE_SOFT, 200: HAIRLINE, 300: '#D1D5DB', 400: '#9CA3AF',
      500: GREY_MUTED, 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: INK,
    },
    background: { default: CANVAS, paper: SURFACE },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY, disabled: GREY_MUTED },
    divider: HAIRLINE,
  },

  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', sans-serif",
    // Cal.com's display treatment: weight 600 and negative tracking, never 700.
    // "Cal Sans without negative letter-spacing reads as off-brand." The same
    // technique reads as precision here rather than brand, which suits a ledger.
    h1: { fontSize: '2.5rem', fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.03em', color: TEXT_PRIMARY },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.025em', color: TEXT_PRIMARY },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', color: TEXT_PRIMARY },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.02em', color: TEXT_PRIMARY },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55, fontWeight: 400, color: TEXT_PRIMARY },
    body2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 400, color: TEXT_PRIMARY },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: 0 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4, color: GREY_LABEL, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 },
    subtitle1: { fontWeight: 500, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 500, letterSpacing: '-0.01em', fontSize: '0.875rem' },
    overline: { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: GREY_LABEL },
  },

  spacing: 8,
  shape: { borderRadius: radius.md },
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } },

  // Two real shadows and a scrim. Everything above index 5 collapses to the
  // raised value rather than escalating to the 25px monsters MUI ships.
  shadows: [
    'none', SHADOW_SOFT, SHADOW_SOFT, SHADOW_RAISED, SHADOW_RAISED,
    SHADOW_OVERLAY, SHADOW_OVERLAY, ...Array(18).fill(SHADOW_RAISED),
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        // Respect the OS setting. NN/g: "you should respect those users who have
        // set their browser or device to reduce motion by removing animations."
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          padding: '10px 20px',
          minHeight: 40,
          boxShadow: 'none',
          transition: t(['background-color', 'border-color', 'color', 'box-shadow']),
          '&:hover': { boxShadow: 'none' },
          // Cal.com's only documented motion: the primary darkens on press and
          // nothing else moves. A 1px nudge acknowledges the click without
          // animating a layout property.
          '&:active': { transform: 'translateY(1px)' },
          '&.Mui-disabled': { backgroundColor: HAIRLINE, color: '#9CA3AF' },
        },
        sizeSmall: { padding: '6px 14px', minHeight: 32, fontSize: '0.8125rem' },
        sizeLarge: { padding: '12px 24px', minHeight: 48, fontSize: '0.9375rem' },
        containedPrimary: {
          backgroundColor: primaryFill,
          color: primaryInk,
          '&:hover': { backgroundColor: primaryFillHover, boxShadow: 'none' },
        },
        // White with a hairline — Cal.com's button-secondary exactly.
        outlined: {
          backgroundColor: SURFACE,
          borderColor: HAIRLINE,
          color: TEXT_PRIMARY,
          '&:hover': { backgroundColor: SURFACE_SOFT, borderColor: '#D1D5DB' },
        },
        outlinedPrimary: { borderColor: AMBER_TEXT, color: AMBER_TEXT, '&:hover': { backgroundColor: AMBER_100, borderColor: AMBER_TEXT } },
        textPrimary: { color: AMBER_TEXT },
        // White on #22C55E is 2.28:1; #16A34A carries white at 3.94 and dark ink
        // far higher, so the darker green is the one that ships.
        containedSecondary: { backgroundColor: '#16A34A', color: '#FFFFFF', '&:hover': { backgroundColor: '#15803D' } },
        containedInfo: { backgroundColor: '#2563EB', color: '#FFFFFF', '&:hover': { backgroundColor: '#1D4ED8' } },
        containedError: { backgroundColor: '#DC2626', color: '#FFFFFF', '&:hover': { backgroundColor: '#B91C1C' } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.pill,   // Cal.com: icon buttons are circular
          transition: t(['background-color', 'color']),
          '&:hover': { backgroundColor: HAIRLINE_SOFT },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: SURFACE,
          transition: t(['border-color', 'box-shadow']),
          '& .MuiOutlinedInput-notchedOutline': { borderColor: HAIRLINE },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
          // Focus is a ring, not a thicker border — a border-width change
          // reflows the field's contents by a pixel on every focus.
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: AMBER_TEXT, borderWidth: 1 },
          '&.Mui-focused': { boxShadow: '0 0 0 3px ' + AMBER_100 },
        },
        // Never below 16px on a mobile surface or iOS zooms the viewport.
        input: { fontSize: '0.9375rem', padding: '10px 14px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem', fontWeight: 500, color: GREY_LABEL,
          // Deliberately NOT bolding on focus. A font-weight change on a state
          // re-flows the label every time it is focused.
          '&.Mui-focused': { color: AMBER_TEXT },
          '&.Mui-error': { color: '#DC2626' },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          backgroundColor: SURFACE,
          border: '1px solid ' + HAIRLINE,
          // One border OR one shadow, never both.
          boxShadow: 'none',
          transition: t(['box-shadow', 'border-color'], motion.enter),
          '&:hover': { boxShadow: SHADOW_SOFT, borderColor: '#D1D5DB' },
        },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } } },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: radius.lg, backgroundImage: 'none' },
        elevation0: { boxShadow: 'none' },
        elevation1: { boxShadow: SHADOW_SOFT },
        elevation2: { boxShadow: SHADOW_RAISED },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radius.xl, boxShadow: SHADOW_OVERLAY, border: '1px solid ' + HAIRLINE },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.02em', color: TEXT_PRIMARY, padding: '24px 24px 8px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' }, dividers: { borderColor: HAIRLINE } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '8px 24px 24px', gap: 8 } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(17,17,17,0.40)' } } },

    MuiTableCell: {
      styleOverrides: {
        root: { padding: '12px 16px', fontSize: '0.875rem', borderColor: HAIRLINE_SOFT, letterSpacing: '-0.01em' },
        head: {
          fontWeight: 600, backgroundColor: SURFACE_SUNKEN, color: GREY_LABEL,
          fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { transition: t(['background-color']), '&:hover': { backgroundColor: SURFACE_SOFT }, '&:last-child td': { borderBottom: 0 } },
        head: { '&:hover': { backgroundColor: 'transparent' } },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          margin: '2px 0',
          transition: t(['background-color', 'color']),
          '&:hover': { backgroundColor: HAIRLINE_SOFT },
          // Active nav is a filled pill — never a left border, and never a
          // weight change, which would re-flow the label on every navigation.
          '&.Mui-selected': {
            backgroundColor: AMBER_100,
            color: '#B45309',
            '&:hover': { backgroundColor: '#FDE68A' },
            '& .MuiListItemIcon-root': { color: AMBER_TEXT },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: GREY_LABEL } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: radius.md, boxShadow: SHADOW_RAISED, border: '1px solid ' + HAIRLINE }, list: { padding: 6 } } },
    MuiMenuItem: { styleOverrides: { root: { borderRadius: radius.sm, fontSize: '0.875rem', padding: '8px 12px', '&:hover': { backgroundColor: SURFACE_SOFT } } } },

    // Cal.com's badge-pill: soft fill, pill radius, small label. Status always
    // carries a WORD — colour alone excludes roughly 8% of men, and in a
    // financial context that is a correctness problem rather than a nicety.
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.pill, fontWeight: 600, fontSize: '0.75rem', height: 24, letterSpacing: 0 },
        sizeSmall: { height: 20, fontSize: '0.7rem' },
        colorPrimary: { backgroundColor: AMBER_100, color: '#B45309' },
        colorSuccess: { backgroundColor: '#DCFCE7', color: '#15803D' },
        colorWarning: { backgroundColor: '#FFEDD5', color: '#9A3412' },
        colorError: { backgroundColor: '#FEE2E2', color: '#991B1B' },
        colorInfo: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
        colorDefault: { backgroundColor: SURFACE_SUNKEN, color: '#374151' },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.875rem' }, colorDefault: { backgroundColor: AMBER_100, color: '#B45309' } } },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', letterSpacing: 0, color: GREY_LABEL,
          transition: t(['color']),
          // Weight stays 500 when selected — see the nav note above.
          '&.Mui-selected': { color: AMBER_TEXT },
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: AMBER_TEXT, height: 2, borderRadius: radius.pill } } },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, fontSize: '0.875rem', alignItems: 'center' },
        standardSuccess: { backgroundColor: '#DCFCE7', color: '#15803D' },
        standardWarning: { backgroundColor: '#FFEDD5', color: '#9A3412' },
        standardError: { backgroundColor: '#FEE2E2', color: '#991B1B' },
        standardInfo: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
      },
    },

    MuiCheckbox: { styleOverrides: { root: { color: '#D1D5DB', '&.Mui-checked': { color: AMBER_TEXT } } } },
    MuiRadio: { styleOverrides: { root: { color: '#D1D5DB', '&.Mui-checked': { color: AMBER_TEXT } } } },
    MuiSwitch: { styleOverrides: { switchBase: { '&.Mui-checked': { color: AMBER_TEXT, '& + .MuiSwitch-track': { backgroundColor: '#FDE68A' } } } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: radius.pill, height: 6, backgroundColor: HAIRLINE_SOFT }, barColorPrimary: { backgroundColor: AMBER_TEXT } } },
    MuiCircularProgress: { styleOverrides: { colorPrimary: { color: AMBER_TEXT } } },
    MuiDivider: { styleOverrides: { root: { borderColor: HAIRLINE } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: radius.sm, fontSize: '0.75rem', fontWeight: 500, backgroundColor: INK, padding: '6px 10px' }, arrow: { color: INK } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: radius.sm, backgroundColor: HAIRLINE_SOFT } } },
  },
});

// Surfaces MUI has no palette slot for, exported for sx use.
export const surfaces = {
  canvas: CANVAS, surface: SURFACE, soft: SURFACE_SOFT, sunken: SURFACE_SUNKEN,
  inverse: INK_950, hairline: HAIRLINE, hairlineSoft: HAIRLINE_SOFT,
};

// Every figure on screen. A rupee value that changes width mid-render shoves the
// layout beside it, which in a financial table is a correctness problem.
export const tabular = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'tnum' 1" };

// ── Density ────────────────────────────────────────────────────────────────
// CSR spans two surfaces at different densities: the operator workspace, used
// many times a day and therefore dense; and the funder portal, visited once a
// quarter and therefore airy. They share this colour layer exactly — only these
// numbers differ. MUI has no slot for them, so they are exported for sx use.
export const density = {
  workspace: { rowHeight: 44, buttonHeight: 40, inputHeight: 40, maxWidth: 1280, cardPadding: 24 },
  portal:    { rowHeight: 52, buttonHeight: 48, inputHeight: 48, maxWidth: 880,  cardPadding: 32 },
};

// Touch targets GROW on small screens rather than shrinking, and an input never
// drops below 16px there or iOS zooms the viewport on focus.
export const TOUCH_TARGET_MIN = 48;
export const MOBILE_INPUT_MIN_FONT_SIZE = 16;

// ── White-label, funder portal only ────────────────────────────────────────
// A funder's brand hex replaces exactly these three roles and nothing else.
// Surfaces, text and semantics never rebrand, so a funder's colour cannot break
// legibility anywhere that was not already measured above.
//
// Derive the ramp in OKLCH — hold hue and chroma, move lightness. Multiplying
// sRGB channels is why the current implementation needs a twenty-step search to
// find a legible variant. Targets match the amber they replace:
export const WHITE_LABEL_ROLES = ['primary.main', 'primary.light', 'brandMark'];
export const WHITE_LABEL_TARGET_LIGHTNESS = { fill: 0.77, subtle: 0.96, text: 0.54 };

// Animating any of these moves layout. Named so a reviewer can point at the
// list rather than re-argue it; designLint enforces the last one mechanically.
export const NEVER_ANIMATE = ['font-weight', 'letter-spacing', 'width', 'margin', 'all'];

// ---------------------------------------------------------------------------
// ADOPTION
// ---------------------------------------------------------------------------
// One line in src/index.js:  import muiTheme from './styles/ttaTheme';
//
// What visibly changes: primary buttons gain weight, shadows lighten
// substantially, radii shift from rem to the px role scale, cards trade their
// shadow for a hairline, focus becomes a ring rather than a thicker border, and
// nothing animates for users who asked their OS to reduce motion.
//
// What does NOT change: every measured contrast value. #A35905, #5F6672 and
// #5B6270 carry forward exactly, because they were derived against the tinted
// grounds this app actually paints rather than against white.
// ---------------------------------------------------------------------------
export default ttaTheme;
