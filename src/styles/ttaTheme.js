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
// Retuned 21 Aug 2026. Every ink now sits at ONE lightness (OKLCH L 0.47) and a
// near-uniform chroma, hue the only thing that changes between them. That is the
// single rule behind a categorical set that reads as one considered family
// rather than a rainbow -- the earlier values ranged L 0.43→0.61 and chroma
// 0.074→0.122, so ochre and clay shouted while the identity greens sat flat,
// which is exactly what reads as "cheap." Consequence of the uniform lightness:
// all six clear AA as text on every ground AND carry a white glyph, so the two
// darkened text variants below collapse into their fills and ochre is no longer
// barred from being a fill. FILL values — spines, chips, progress, primary button.
const MOSS = '#006C49';    // money utilised · primary action
const INDIGO = '#335A97';  // contracts & deliverables · anything promised
const OCHRE = '#795300';   // waiting on you · not started  (a bronze, not a gold)
const TEAL = '#00686A';    // funders & partners · everything facing outward
const PLUM = '#833F6B';    // closed · frozen certificate
const CLAY = '#8C4325';    // overspend · needs a decision

// ACCENTS — the chroma-carrying variant, added 26 Aug 2026.
//
// THE PROBLEM THEY SOLVE. The six fills above are saturated on paper and dark
// in the eye: moss, ochre and teal are at 100% saturation but sit at L 21-24%,
// and at that lightness the eye reads a near-black with a hue smell, not a
// colour. Six near-blacks on a 94%-lightness bone ground is a grey page with
// coloured punctuation, which is what the client saw and called dull. It was
// not a mistake — the 21 Aug retune pushed every fill down into one dark band
// so a solid badge could carry a white glyph at AA — but it bought that by
// spending all the chroma the page had.
//
// THE SPLIT IS THE SYSTEM'S OWN RULE, RUN THE OTHER WAY. `design-system.md`
// says a fill that fails as text gets a darkened text variant, and never to
// collapse the two back together. The collapse above (OCHRE_TEXT = OCHRE) is
// that rule broken. Rather than un-darken the fills — which would break every
// white glyph and every white button label — the missing variant is added at
// the light end: ACCENT is the value for shapes that carry no white text.
//
//   fill    solid grounds under WHITE — badges, the active nav pill, buttons
//   accent  shapes that carry nothing — spines, bars, progress, washes, rings
//   text    anything a person reads
//   tint    pale chip and banner grounds
//
// MEASURED, per the standing rule, against the DARKEST ground each one can
// land on. A bar sits in a `surfaces.sunken` track, so sunk is the binding
// case, not bone. All six clear the 3:1 that a UI boundary carrying meaning
// must clear, on all three grounds:
//                     sunk / bone / card
const MOSS_A = '#0C9065';    // 3.30 / 3.56 / 3.89
const INDIGO_A = '#477ED4';  // 3.29 / 3.55 / 3.89
const OCHRE_A = '#A6760D';   // 3.28 / 3.54 / 3.87
const TEAL_A = '#0C8C8F';    // 3.32 / 3.58 / 3.92
const PLUM_A = '#BF5B9C';    // 3.30 / 3.56 / 3.89
const CLAY_A = '#D25928';    // 3.29 / 3.55 / 3.89
//
// Equal CONTRAST, not equal lightness — which is why the L values run 30% to
// 55% rather than sitting on one number the way the fills do. At a fixed
// lightness a yellow is far heavier than a blue; matching the ratio is what
// makes them read as one family on the page, and it is the ratio the rule is
// written about. Saturation is capped per hue so the set stays a palette:
// plum holds 44% and reads as wine rather than the hot pink 72% produced, and
// clay 68% rather than a traffic-cone orange.
//
// AN ACCENT MUST NEVER GO UNDER WHITE TEXT. At ~3.3 it is a shape colour, not
// a ground for type. That is what `fill` is still for, and the two are kept
// apart deliberately.

// Tints — chip and banner grounds, each ink's own hue at ~93% lightness, uniform
// chroma to match the fills.
const MOSS_T = '#DCEDE3';
const INDIGO_T = '#DFE9F7';
const OCHRE_T = '#F0E6D8';
const TEAL_T = '#D8EDED';
const PLUM_T = '#F3E2EC';
const CLAY_T = '#F6E3DD';

// TEXT variants. Measured, not chosen. After the 21 Aug retune ALL six inks
// clear AA as text on every ground this module paints — the uniform L 0.47 is
// what bought that — so every one is used directly and there are no separate
// darkened variants any more. The two that used to fail (ochre, clay) now pass
// because the retune darkened them; keeping OCHRE_TEXT/CLAY_TEXT as aliases of
// the fills preserves every call site without a rename.
//                    bone / card / sunk / white / own tint
//   MOSS   5.70 / 6.24 / 5.28 / 6.48 / 5.33
//   INDIGO 6.05 / 6.63 / 5.61 / 6.89 / 5.62
//   OCHRE  6.05 / 6.63 / 5.61 / 6.88 / 5.58
//   TEAL   5.79 / 6.34 / 5.37 / 6.59 / 5.41
//   PLUM   6.39 / 7.00 / 5.93 / 7.27 / 5.85
//   CLAY   6.27 / 6.87 / 5.81 / 7.13 / 5.76
const OCHRE_TEXT = OCHRE;
const CLAY_TEXT = CLAY;

// White on any fill now measures ≥6.48, so every ink — ochre included — can be a
// solid badge or button and carry white comfortably. The old bar on ochre as a
// fill (white was 3.87 on the pale gold) is void: this ochre is a dark bronze.

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
const NEUTRAL_GREY = '#98A199';    // 2.66 on white — fails AA as text, so it is
                                   // never a badge glyph; a status with no fixed
                                   // ink (activities, "active") gets a tinted
                                   // chip carrying its OWN dark text instead.

// ── Type ───────────────────────────────────────────────────────────────────
// The single biggest lever, and the reason the previous pass read like an OS
// rather than a product: it used the system stack for everything.
//
// Display is a serif — money and dates set in a serif read as a record, which
// is what a utilisation ledger is. UI stays sans, because form labels, buttons
// and table headers are controls rather than prose.
//
// Source Serif 4 is the production face and is self-hosted from
// src/assets/fonts/ (see fonts.css). Constantia and Georgia stay in the stack
// as the fallback for the instant before the variable font loads — both have
// true tabular figures, so the layout doesn't shift when it swaps in.
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
      50: BONE, 100: HAIRLINE_SOFT, 200: HAIRLINE, 300: '#C7CCC3', 400: NEUTRAL_GREY,
      500: TEXT_MUTED, 600: TEXT_SECONDARY, 700: '#3D4842', 800: '#2B342E', 900: TEXT_PRIMARY,
    },
    background: { default: BONE, paper: CARD },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY, disabled: NEUTRAL_GREY },
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
          '&.Mui-disabled': { backgroundColor: SUNK, color: NEUTRAL_GREY },
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
          transition: t(['border-color'], motion.enter),
          // The line darkens; nothing lifts. The shadow that used to accompany
          // this was the last of the "depth from elevation" habit this file's
          // own header argues against, and it was redundant -- the border move
          // already reads, and unlike a shadow it reads on keyboard focus and
          // on touch too.
          '&:hover': { borderColor: '#C7CCC3' },
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

// Text colours MUI's palette can't carry a third tier for, plus the neutral
// grey used where a status has no fixed ink (see NEUTRAL_GREY above). Mirrors
// `surfaces`' shape so both read the same way at a call site.
export const text = {
  primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY, muted: TEXT_MUTED,
  neutral: NEUTRAL_GREY,
};

// The six inks, for spines, split bars and anything MUI has no slot for.
// `fill` is the solid ground white sits on, `accent` is the chroma-carrying
// shape colour that must never go under white, `text` is legible on every
// ground, `tint` is the chip ground. See the ACCENTS block above for why there
// are two paint values rather than one.
export const inks = {
  moss: { fill: MOSS, accent: MOSS_A, text: MOSS, tint: MOSS_T, means: 'money utilised, primary action' },
  indigo: { fill: INDIGO, accent: INDIGO_A, text: INDIGO, tint: INDIGO_T, means: 'contracts and deliverables' },
  ochre: { fill: OCHRE, accent: OCHRE_A, text: OCHRE_TEXT, tint: OCHRE_T, means: 'waiting on you' },
  teal: { fill: TEAL, accent: TEAL_A, text: TEAL, tint: TEAL_T, means: 'funders and partners' },
  plum: { fill: PLUM, accent: PLUM_A, text: PLUM, tint: PLUM_T, means: 'closed, frozen certificate' },
  clay: { fill: CLAY, accent: CLAY_A, text: CLAY_TEXT, tint: CLAY_T, means: 'overspend, needs a decision' },
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

// ── Entrance motion ────────────────────────────────────────────────────────
// One shape, used everywhere: a short rise with a fade. No scale, no spring, no
// bounce — the standing constraint from 18 Aug, and the design-system MCP rates
// bouncy easing on financial products `critical`. The rise is 8px because the
// UDS `enter.slide-up` preset is 8px; larger reads as the page assembling
// itself, which on a ledger looks unserious.
//
// The stagger is capped, not open-ended. 40ms per item to a 400ms ceiling is
// UDS's `stagger.grid` preset: a six-tile dashboard finishes in 200ms, and a
// forty-row list still finishes in 400ms rather than making the last row wait
// 1.6 seconds for a decoration.
//
// `both` fill mode matters. Without it the element paints at full opacity for
// one frame before the delay elapses, which is a visible flash on every tile
// that has a delay — the thing staggering was supposed to avoid.
export const reveal = (index = 0) => ({
  '@keyframes csrRise': {
    from: { opacity: 0, transform: 'translateY(8px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  animation: `csrRise ${motion.enter} ${motion.easeOut} both`,
  animationDelay: `${Math.min(index * 40, 400)}ms`,
  // Not a nicety. An entrance animation is exactly the kind of motion that
  // triggers vestibular symptoms, and the system already promises this
  // everywhere else.
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
});

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
// 1. The CSR screens still lay out to the old rhythm. This file changes colour,
//    type and radius everywhere at once; the figure/unit hierarchy and the
//    per-grant spines need applying per screen, starting with CSRDashboard.
// ---------------------------------------------------------------------------
export default ttaTheme;
