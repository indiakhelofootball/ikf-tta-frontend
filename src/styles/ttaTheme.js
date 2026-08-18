import { createTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// CSR theme — the LEDGER system.
// ---------------------------------------------------------------------------
// Scoped to /csr only, through CSRThemeProvider. TTA keeps muiTheme.js and the
// funder portal at /client keeps its per-funder white-label. Nothing here
// reaches either.
//
// A record rather than a dashboard: bone ground, serif figures, generous space,
// and six inks that each carry a fixed meaning. Replaces the amber system that
// preceded it — amber was IKF's colour on the button, but a single accent
// repeated down every screen is what made the module read administrative.
//
// Two owner decisions this encodes, both from 2026-08-18:
//   "no dark anchor"                    → there is no inverse surface. None.
//   "green needs to change its shades   → the moss moved #1F5F4B → #2C6A4F, and
//    ... incorporate more color to         one accent became six with fixed
//    break monotonity of same color"       jobs.
//
// THE RULE THAT KEEPS IT CALM. One ink may lead a screen; the rest appear only
// where their meaning applies. If a screen shows four accents it is because
// four kinds of thing are genuinely present. Colour is never decorative here —
// it tells you what kind of thing you are looking at.
// ---------------------------------------------------------------------------

// ── The six inks ───────────────────────────────────────────────────────────
// Roughly matched chroma and lightness, so they sit together without any one
// shouting. FILL values — spines, chips, progress segments, the primary button.
const MOSS = '#2C6A4F';    // money utilised · primary action
const INDIGO = '#33517F';  // contracts & deliverables · anything promised
const OCHRE = '#A8791F';   // waiting on you · not started
const TEAL = '#1E6E70';    // funders & partners · everything facing outward
const PLUM = '#6E3F5C';    // closed · frozen certificate
const CLAY = '#A6512E';    // overspend · needs a decision

// Tints — chip and banner grounds, each ink's own hue at ~92% lightness.
const MOSS_T = '#E1EBE4';
const INDIGO_T = '#E3E8F1';
const OCHRE_T = '#F2EAD6';
const TEAL_T = '#DEECEB';
const PLUM_T = '#EEE3EA';
const CLAY_T = '#F2E3DB';

// TEXT variants. Measured, not chosen. Four of the six inks clear AA as text on
// every ground this module paints, so they are used directly. Two do not:
//
//   OCHRE #A8791F  scores 3.41 on bone, 3.16 on sunk, 3.23 on its own tint
//   CLAY  #A6512E  scores 4.46 on sunk and 4.37 on its own tint
//
// Both are darkened along their own hue until they clear 4.5 on bone, card,
// sunk, white AND their own tint. This is the same failure amber had, caught
// the same way. Do not "tidy" these back toward the fill values.
//                       bone / card / sunk / white / own tint
const OCHRE_TEXT = '#866119';  // 4.94 / 5.41 / 4.58 / 5.62 / 4.69
const CLAY_TEXT = '#A34F2D';   // 4.97 / 5.44 / 4.61 / 5.65 / 4.52

// The four that pass as text unchanged, for the record:
//   MOSS   5.63 / 6.16 / 5.22 / 6.40 / 5.24
//   INDIGO 7.04 / 7.70 / 6.52 / 8.00 / 6.51
//   TEAL   5.25 / 5.74 / 4.86 / 5.97 / 4.92
//   PLUM   7.30 / 8.00 / 6.77 / 8.31 / 6.65
//
// White on a MOSS fill measures 6.40, so the primary button carries white
// comfortably. OCHRE is the one ink that must never become a button fill —
// white on it is 3.87 and dark ink only 4.18. It lives in tints and text.

// ── Surfaces ───────────────────────────────────────────────────────────────
// Three tiers, all light. Bone carries a green bias rather than a cream, which
// keeps the module away from the warm-paper-and-terracotta look the serif
// would otherwise pull it toward.
const BONE = '#EFF1EC';    // page floor
const CARD = '#FAFBF8';    // cards, panels
const SUNK = '#E6E9E2';    // table headers, wells, insets
const HAIRLINE = '#DBDED6';
const HAIRLINE_SOFT = '#E9EBE5';

// ── Text ───────────────────────────────────────────────────────────────────
// Measured on bone / card / sunk.
const TEXT_PRIMARY = '#1A2620';    // 13.76 / 15.07 / 12.76
const TEXT_SECONDARY = '#4E5A54';  // darkened from the mockup's #5C6A63, which
                                   // scored 4.63 on sunk — inside the margin.
const TEXT_MUTED = '#5C6A63';      // 4.99 / 5.47 — captions on bone and card
                                   // only, never on sunk.

// ── Type ───────────────────────────────────────────────────────────────────
// The single biggest lever, and the reason the previous pass read like an OS
// rather than a product: it used the system stack for everything.
//
// Display is a serif — money and dates set in a serif read as a record, which
// is what a utilisation ledger is. UI stays sans, because form labels, buttons
// and table headers are controls rather than prose.
//
// Source Serif 4 is the production face and is NOT yet in the repo. Until it is
// self-hosted the stack falls through to Constantia (Windows) and Georgia, both
// of which have true tabular figures — so the layout is correct today and gets
// sharper when the font lands, rather than breaking.
const SERIF = "'Source Serif 4', Constantia, Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif";

// ── Motion ─────────────────────────────────────────────────────────────────
// Unchanged. NN/g timings, no spring, no bounce anywhere — the design-system
// MCP rates bouncy easing on financial products `critical`, and this app moves
// money. Entering elements run longer than exiting ones.
export const motion = {
  feedback: '120ms',
  enter: '220ms',
  exit: '160ms',
  overlayEnter: '260ms',
  overlayExit: '200ms',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

// Name the properties explicitly. The catch-all keyword animates layout
// properties too — width, margin, font-weight — which drops frames and blurs
// text mid-tween. designLint fails the build on any new one.
const t = (props, dur = motion.feedback, ease = motion.easeOut) =>
  props.map((p) => `${p} ${dur} ${ease}`).join(', ');

// ── Radius ─────────────────────────────────────────────────────────────────
// Tightened from the previous pass. A ledger is squarer than a dashboard; the
// 20-28px radii in the reference decks belong to consumer apps, not to a
// document a funder files.
const radius = {
  xs: 3,
  sm: 5,
  md: 7,    // buttons, inputs, tabs
  lg: 10,   // content cards
  xl: 14,   // modals, sheets
  pill: 9999,
};

// ── Elevation ──────────────────────────────────────────────────────────────
// Depth comes from the three surface tiers, not from shadow. Shadows are tinted
// toward the ground rather than neutral grey, so nothing floats over bone in a
// colour the page never uses.
const SHADOW_SOFT = '0 1px 2px rgba(20,28,24,0.05)';
const SHADOW_RAISED = '0 4px 12px rgba(20,28,24,0.08)';
const SHADOW_OVERLAY = '0 12px 32px rgba(20,28,24,0.12)';

const ttaTheme = createTheme({
  palette: {
    // primary is moss: it is both the money ink and the primary action, which
    // is correct here — the main verb in this module is always about spend.
    primary: { main: MOSS, light: MOSS_T, dark: '#1F5039', contrastText: '#F3F8F5' },
    // secondary is indigo — the other half of the product: what was promised.
    secondary: { main: INDIGO, light: INDIGO_T, dark: '#253C5E', contrastText: '#FFFFFF' },
    info: { main: TEAL, light: TEAL_T, dark: '#155152', contrastText: '#FFFFFF' },
    // warning is ochre's TEXT variant — the palette slot is read as text far
    // more often than as a fill, and the fill value fails there.
    warning: { main: OCHRE_TEXT, light: OCHRE_T, dark: '#6B4D14', contrastText: '#FFFFFF' },
    error: { main: CLAY_TEXT, light: CLAY_T, dark: '#7E3D22', contrastText: '#FFFFFF' },
    success: { main: MOSS, light: MOSS_T, dark: '#1F5039', contrastText: '#F3F8F5' },
    grey: {
      50: BONE, 100: HAIRLINE_SOFT, 200: HAIRLINE, 300: '#C7CCC3', 400: '#98A199',
      500: TEXT_MUTED, 600: TEXT_SECONDARY, 700: '#3D4842', 800: '#2B342E', 900: TEXT_PRIMARY,
    },
    background: { default: BONE, paper: CARD },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY, disabled: '#98A199' },
    divider: HAIRLINE,
  },

  typography: {
    fontFamily: SANS,

    // Display sizes raised, and the weight DROPPED to 400. A serif at 400 and
    // 44px carries more authority than a sans at 600 and 40px — the previous
    // pass borrowed Cal.com's weight-600 display rule without Cal Sans, which
    // is the typeface that justified it.
    h1: { fontFamily: SERIF, fontSize: '2.75rem', fontWeight: 400, lineHeight: 1.08, letterSpacing: '-0.03em', color: TEXT_PRIMARY },
    h2: { fontFamily: SERIF, fontSize: '2.125rem', fontWeight: 400, lineHeight: 1.12, letterSpacing: '-0.025em', color: TEXT_PRIMARY },
    h3: { fontFamily: SERIF, fontSize: '1.625rem', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    h4: { fontFamily: SERIF, fontSize: '1.3125rem', fontWeight: 400, lineHeight: 1.3, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    // h5/h6 are section labels rather than display — they stay sans, because
    // below about 20px the serif stops reading as a choice and starts reading
    // as a mistake.
    h5: { fontFamily: SANS, fontSize: '1rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em', color: TEXT_PRIMARY },
    h6: { fontFamily: SANS, fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.005em', color: TEXT_PRIMARY },

    body1: { fontSize: '0.9375rem', lineHeight: 1.55, fontWeight: 400, color: TEXT_PRIMARY },
    body2: { fontSize: '0.875rem', lineHeight: 1.5, fontWeight: 400, color: TEXT_PRIMARY },
    button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', letterSpacing: 0 },
    // The eyebrow. Uppercase survives from the mockup, but the tracking comes
    // down from 0.06em and the colour is the muted green-grey, so it sits under
    // the heading rather than competing with it.
    caption: { fontSize: '0.6875rem', lineHeight: 1.4, color: TEXT_MUTED, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 },
    overline: { fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: TEXT_MUTED },
    subtitle1: { fontWeight: 500, letterSpacing: '-0.01em' },
    subtitle2: { fontWeight: 500, letterSpacing: '-0.01em', fontSize: '0.875rem' },
  },

  spacing: 8,
  shape: { borderRadius: radius.md },
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } },

  shadows: [
    'none', SHADOW_SOFT, SHADOW_SOFT, SHADOW_RAISED, SHADOW_RAISED,
    SHADOW_OVERLAY, SHADOW_OVERLAY, ...Array(18).fill(SHADOW_RAISED),
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', backgroundColor: BONE },
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
          '&:active': { transform: 'translateY(1px)' },
          '&.Mui-disabled': { backgroundColor: SUNK, color: '#98A199' },
        },
        sizeSmall: { padding: '6px 14px', minHeight: 32, fontSize: '0.8125rem' },
        sizeLarge: { padding: '12px 24px', minHeight: 48, fontSize: '0.9375rem' },
        // Moss fill, white label, 6.40:1. The primary action is now the
        // heaviest object in its region — which the pale amber never was.
        containedPrimary: {
          backgroundColor: MOSS,
          color: '#F3F8F5',
          '&:hover': { backgroundColor: '#255943', boxShadow: 'none' },
        },
        outlined: {
          backgroundColor: CARD,
          borderColor: HAIRLINE,
          color: TEXT_PRIMARY,
          '&:hover': { backgroundColor: BONE, borderColor: '#C7CCC3' },
        },
        outlinedPrimary: { borderColor: MOSS, color: MOSS, '&:hover': { backgroundColor: MOSS_T, borderColor: MOSS } },
        textPrimary: { color: MOSS },
        containedSecondary: { backgroundColor: INDIGO, color: '#FFFFFF', '&:hover': { backgroundColor: '#2B446B' } },
        containedInfo: { backgroundColor: TEAL, color: '#FFFFFF', '&:hover': { backgroundColor: '#195D5F' } },
        containedError: { backgroundColor: CLAY, color: '#FFFFFF', '&:hover': { backgroundColor: '#8E4527' } },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.pill,
          transition: t(['background-color', 'color']),
          '&:hover': { backgroundColor: HAIRLINE_SOFT },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: CARD,
          transition: t(['border-color', 'box-shadow']),
          '& .MuiOutlinedInput-notchedOutline': { borderColor: HAIRLINE },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C7CCC3' },
          // A ring, not a thicker border — a border-width change reflows the
          // field's contents by a pixel on every focus.
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: MOSS, borderWidth: 1 },
          '&.Mui-focused': { boxShadow: '0 0 0 3px ' + MOSS_T },
        },
        input: { fontSize: '0.9375rem', padding: '10px 14px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem', fontWeight: 500, color: TEXT_SECONDARY,
          // Deliberately NOT bolding on focus — a weight change re-flows the
          // label every time the field is focused.
          '&.Mui-focused': { color: MOSS },
          '&.Mui-error': { color: CLAY_TEXT },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          backgroundColor: CARD,
          border: '1px solid ' + HAIRLINE,
          boxShadow: 'none',
          transition: t(['box-shadow', 'border-color'], motion.enter),
          '&:hover': { boxShadow: SHADOW_SOFT, borderColor: '#C7CCC3' },
        },
      },
    },
    MuiCardContent: { styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } } },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: radius.lg, backgroundImage: 'none', backgroundColor: CARD },
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
    // Dialog titles are display, so they take the serif.
    MuiDialogTitle: { styleOverrides: { root: { fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 400, letterSpacing: '-0.01em', color: TEXT_PRIMARY, padding: '24px 24px 8px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 16px' }, dividers: { borderColor: HAIRLINE } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '8px 24px 24px', gap: 8 } } },
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(20,28,24,0.40)' } } },

    MuiTableCell: {
      styleOverrides: {
        root: { padding: '12px 16px', fontSize: '0.875rem', borderColor: HAIRLINE_SOFT, letterSpacing: '-0.005em' },
        head: {
          fontWeight: 600, backgroundColor: SUNK, color: TEXT_SECONDARY,
          fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { transition: t(['background-color']), '&:hover': { backgroundColor: BONE }, '&:last-child td': { borderBottom: 0 } },
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
          // A filled pill — never a left border, and never a weight change,
          // which would re-flow the label on every navigation.
          '&.Mui-selected': {
            backgroundColor: MOSS_T,
            color: MOSS,
            '&:hover': { backgroundColor: '#D4E3D9' },
            '& .MuiListItemIcon-root': { color: MOSS },
          },
        },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: TEXT_SECONDARY } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: radius.md, boxShadow: SHADOW_RAISED, border: '1px solid ' + HAIRLINE }, list: { padding: 6 } } },
    MuiMenuItem: { styleOverrides: { root: { borderRadius: radius.sm, fontSize: '0.875rem', padding: '8px 12px', '&:hover': { backgroundColor: BONE } } } },

    // Status always carries a WORD as well as a colour — colour alone excludes
    // roughly 8% of men, and in a financial context that is a correctness
    // problem rather than a nicety. Every pairing below is ink-on-own-tint and
    // measured above.
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: radius.pill, fontWeight: 600, fontSize: '0.75rem', height: 24, letterSpacing: 0 },
        sizeSmall: { height: 20, fontSize: '0.7rem' },
        colorPrimary: { backgroundColor: MOSS_T, color: MOSS },
        colorSecondary: { backgroundColor: INDIGO_T, color: INDIGO },
        colorSuccess: { backgroundColor: MOSS_T, color: MOSS },
        colorWarning: { backgroundColor: OCHRE_T, color: OCHRE_TEXT },
        colorError: { backgroundColor: CLAY_T, color: CLAY_TEXT },
        colorInfo: { backgroundColor: TEAL_T, color: TEAL },
        colorDefault: { backgroundColor: SUNK, color: TEXT_SECONDARY },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.875rem' }, colorDefault: { backgroundColor: MOSS_T, color: MOSS } } },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', letterSpacing: 0, color: TEXT_SECONDARY,
          transition: t(['color']),
          // Weight stays 500 when selected — see the nav note above.
          '&.Mui-selected': { color: MOSS },
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: MOSS, height: 2, borderRadius: radius.pill } } },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, fontSize: '0.875rem', alignItems: 'center' },
        standardSuccess: { backgroundColor: MOSS_T, color: MOSS },
        standardWarning: { backgroundColor: OCHRE_T, color: OCHRE_TEXT },
        standardError: { backgroundColor: CLAY_T, color: CLAY_TEXT },
        standardInfo: { backgroundColor: TEAL_T, color: TEAL },
      },
    },

    MuiCheckbox: { styleOverrides: { root: { color: '#C7CCC3', '&.Mui-checked': { color: MOSS } } } },
    MuiRadio: { styleOverrides: { root: { color: '#C7CCC3', '&.Mui-checked': { color: MOSS } } } },
    MuiSwitch: { styleOverrides: { switchBase: { '&.Mui-checked': { color: MOSS, '& + .MuiSwitch-track': { backgroundColor: MOSS_T } } } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: radius.pill, height: 8, backgroundColor: SUNK }, barColorPrimary: { backgroundColor: MOSS } } },
    MuiCircularProgress: { styleOverrides: { colorPrimary: { color: MOSS } } },
    MuiDivider: { styleOverrides: { root: { borderColor: HAIRLINE } } },
    MuiTooltip: { styleOverrides: { tooltip: { borderRadius: radius.sm, fontSize: '0.75rem', fontWeight: 500, backgroundColor: TEXT_PRIMARY, padding: '6px 10px' }, arrow: { color: TEXT_PRIMARY } } },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: radius.sm, backgroundColor: HAIRLINE_SOFT } } },
  },
});

// ── Exports for sx use ─────────────────────────────────────────────────────

// Surfaces MUI has no palette slot for. There is deliberately NO inverse:
// the owner rejected a dark anchor on 2026-08-18, so depth comes from the
// three-tier bone/card/sunk spread and the hairlines, not from dark chrome.
export const surfaces = {
  canvas: BONE, surface: CARD, sunken: SUNK,
  hairline: HAIRLINE, hairlineSoft: HAIRLINE_SOFT,
};

// The six inks, for spines, split bars and anything MUI has no slot for.
// `fill` paints, `text` is legible on every ground, `tint` is the chip ground.
export const inks = {
  moss: { fill: MOSS, text: MOSS, tint: MOSS_T, means: 'money utilised, primary action' },
  indigo: { fill: INDIGO, text: INDIGO, tint: INDIGO_T, means: 'contracts and deliverables' },
  ochre: { fill: OCHRE, text: OCHRE_TEXT, tint: OCHRE_T, means: 'waiting on you' },
  teal: { fill: TEAL, text: TEAL, tint: TEAL_T, means: 'funders and partners' },
  plum: { fill: PLUM, text: PLUM, tint: PLUM_T, means: 'closed, frozen certificate' },
  clay: { fill: CLAY, text: CLAY_TEXT, tint: CLAY_T, means: 'overspend, needs a decision' },
};

// Every figure on screen. A rupee value that changes width mid-render shoves
// the layout beside it, which in a financial table is a correctness problem.
export const tabular = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'tnum' 1" };

// Money is the subject of every screen here, so a figure is set roughly three
// times its label — the reference decks all do this and the previous pass did
// not, which is why its numbers read as data rather than as the point.
export const figure = {
  hero: { fontFamily: SERIF, fontSize: '2.75rem', fontWeight: 400, lineHeight: 1, letterSpacing: '-0.03em', ...tabular },
  large: { fontFamily: SERIF, fontSize: '1.5625rem', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em', ...tabular },
  row: { fontFamily: SERIF, fontSize: '0.96875rem', fontWeight: 400, ...tabular },
  unit: { fontFamily: SANS, fontSize: '0.71875rem', color: TEXT_MUTED, letterSpacing: 0 },
};

export const fonts = { serif: SERIF, sans: SANS };

// ── Density ────────────────────────────────────────────────────────────────
// CSR spans two surfaces at different densities: the operator workspace, used
// many times a day and therefore dense; and the funder portal, visited once a
// quarter and therefore airy. They share this colour layer exactly — only these
// numbers differ.
export const density = {
  workspace: { rowHeight: 44, buttonHeight: 40, inputHeight: 40, maxWidth: 1280, cardPadding: 24 },
  portal: { rowHeight: 52, buttonHeight: 48, inputHeight: 48, maxWidth: 880, cardPadding: 32 },
};

// Touch targets GROW on small screens rather than shrinking, and an input never
// drops below 16px there or iOS zooms the viewport on focus.
export const TOUCH_TARGET_MIN = 48;
export const MOBILE_INPUT_MIN_FONT_SIZE = 16;

// ── White-label, funder portal only ────────────────────────────────────────
// A funder's brand hex replaces exactly these three roles and nothing else.
// Surfaces, text and semantics never rebrand, so a funder's colour cannot break
// legibility anywhere that was not already measured above. Derive the ramp in
// OKLCH — hold hue and chroma, move lightness.
export const WHITE_LABEL_ROLES = ['primary.main', 'primary.light', 'brandMark'];
export const WHITE_LABEL_TARGET_LIGHTNESS = { fill: 0.44, subtle: 0.92, text: 0.44 };

// Animating any of these moves layout. designLint enforces the last one.
export const NEVER_ANIMATE = ['font-weight', 'letter-spacing', 'width', 'margin', 'all'];

// ---------------------------------------------------------------------------
// STILL TO DO
// ---------------------------------------------------------------------------
// 1. Self-host Source Serif 4 (woff2, weights 400/600) and drop it in public/.
//    Until then the serif stack falls through to Constantia/Georgia, which is
//    correct but not the specified face.
// 2. The CSR screens still lay out to the old rhythm. This file changes colour,
//    type and radius everywhere at once; the figure/unit hierarchy and the
//    per-grant spines need applying per screen, starting with CSRDashboard.
// ---------------------------------------------------------------------------
export default ttaTheme;
