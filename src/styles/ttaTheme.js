// ===========================================================================
// COLOUR DECISION — settled 01 Sep 2026, by explicit product direction
// The module is GREEN-LED. Moss #2C6A4F leads: primary action, money, success.
// The ground is a cool green-white (#F4F7F4). Type is Fontshare — Zodiak
// (serif), Switzer (UI), Cabinet Grotesk (figures). Glass and gradient surface
// tokens are opt-in, see `surfaces.glass` / `surfaces.gradient`.
//
// SUPERSEDED, kept as provenance: the 26 Aug 2026 owner call was "it really
// feels cheap and the color green remove it make it something others like
// light coral. make it look good and well divided". Coral led the system from
// 26 Aug until 01 Sep, when that call was reversed by the direction above. No
// coral value survives in this file; `inks.coral` is a deprecated alias onto
// moss and nothing else references the name.
// ===========================================================================
import { createTheme } from '@mui/material/styles';

// ---------------------------------------------------------------------------
// CSR theme — the LEDGER system, green-led.
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
// Three owner decisions this encodes:
//   "no dark anchor"                       (2026-08-18) → there is no inverse
//     surface. None.
//   "green needs to change its shades      (2026-08-18) → the moss moved
//    ... incorporate more color to           #1F5F4B → #2C6A4F, and one accent
//    break monotonity of same color"         became six with fixed jobs.
//   "it really feels cheap and the color   (2026-08-26) → retired green as the
//    green remove it make it something        LEADING colour for one week.
//    others like light coral. make it        REVERSED 2026-09-01: moss holds
//    look good and well divided"             the primary-action / money seat
//                                             again and the rail is green.
//                                             What survives of the 26 Aug brief
//                                             is "well divided" — the hairline
//                                             and tint work below answers it.
//
// THE RULE THAT KEEPS IT CALM. One ink may lead a screen; the rest appear only
// where their meaning applies. If a screen shows four accents it is because
// four kinds of thing are genuinely present. Colour is never decorative here —
// it tells you what kind of thing you are looking at.
// ---------------------------------------------------------------------------

// ── The six inks ───────────────────────────────────────────────────────────
// A green-led family as of 01 Sep 2026. All six sit at one shared lightness
// (relative luminance 0.114–0.119), which is what buys white text ≥6.2:1 on
// every one of them and ≥5.4:1 as TEXT against the darkest ground, `sunk`,
// with margin to spare. No ink in this set needs a lightness exception.
//
// FILL values — spines, chips, progress, primary button, solid grounds under
// WHITE.
const MOSS = '#2C6A4F';   // money utilised · primary action · success
                           // luminance 0.114 · white on it 6.40:1
const INDIGO = '#385DB2';  // contracts & deliverables · anything promised
const OCHRE = '#815903';   // waiting on you · not started  (a bronze, not a gold)
const STEEL = '#1B678D';   // funders & partners · everything facing outward
const PLUM = '#A33969';    // closed · frozen certificate
const CLAY = '#914F27';    // overspend · needs a decision

// Moss's fill is dark enough to read as TEXT on every ground in the system, so
// `text` simply aliases `fill` — no darkened variant is needed, the way the
// other five inks need none. The separate MOSS_TEXT name is kept only because
// call sites reference it; it is the same value as MOSS and must stay so.
const MOSS_TEXT = '#2C6A4F';  // = MOSS · bone 5.93 / card 6.40 / sunk 5.61 /
                               // white 6.40 / own tint 5.24

// ACCENTS — the chroma-carrying variant. Shapes that carry no text: spines,
// bars, progress tracks, washes, focus rings. Sits lighter than fill/text
// (luminance 0.210 for five of them and 0.253 for moss, vs 0.114–0.119 for
// fill), which is what keeps it visibly distinct from a near-black in the eye
// rather than reading as six dark punctuation marks on a pale page.
//
// MEASURED, per the standing rule, against the DARKEST ground each one can
// land on. A bar sits in a `surfaces.sunken` track, so sunk is the binding
// case, not bone. All six clear the 3:1 that a UI boundary carrying meaning
// must clear, on all three grounds, and all six FAIL white at 4.5 — which is
// what keeps `fill`/`text` and `accent` from collapsing into one value again.
// MOSS_A is the lightest of the six and therefore the tightest: 3.04 on sunk
// leaves almost no margin over the 3:1 floor, so it must not be lightened.
//                     sunk / bone / card / white
const MOSS_A = '#3E9A6E';   // gauge, pools, bars   // 3.04 / 3.21 / 3.47 / 3.47
const INDIGO_A = '#527BDA';  // 3.54 / 3.74 / 4.04 / 4.04
const OCHRE_A = '#AA7400';   // 3.53 / 3.74 / 4.03 / 4.03
const STEEL_A = '#1586BE';   // 3.55 / 3.75 / 4.05 / 4.05
const PLUM_A = '#D54B89';    // 3.54 / 3.74 / 4.04 / 4.04
const CLAY_A = '#CD5E19';    // 3.53 / 3.73 / 4.03 / 4.03
//
// AN ACCENT MUST NEVER GO UNDER WHITE TEXT. At 3.0–3.6 on sunk it is a shape
// colour, not a ground for type. That is what `fill`/`text` is still for, and
// the two are kept apart deliberately.

// Tints — chip and banner grounds, each ink's own hue held near 0.74 relative
// luminance. Measured, not eyeballed: `text` is the fill itself for all six
// inks and sits at luminance 0.114–0.119, so a tint would clear 4.5:1 against
// its own ink anywhere at or above luminance ≈0.70. The tints are deliberately
// kept close to that floor rather than pushed toward white, because a tint
// much lighter reads as barely-tinted white and was part of what made the
// earlier pass look washed out. Five sit at 0.739–0.743 and clear 4.69–4.74;
// MOSS_T sits lighter at 0.810 and clears 5.24 — it is the one tint that could
// afford to go a step darker without breaking the floor.
const MOSS_T = '#E1EBE4';
const INDIGO_T = '#D8E0F1';
const OCHRE_T = '#EDDEC0';
const STEEL_T = '#CDE3ED';
const PLUM_T = '#F0DAE4';
const CLAY_T = '#EEDCD0';
// A one-step-darker moss tint for the selected nav pill's hover state — see
// MuiListItemButton below. Moss text on it measures 4.72, so the pill's label
// still clears 4.5:1 while the pill is under the cursor.
const MOSS_T_HOVER = '#D2E1D8';

// TEXT variants. There are none — all six inks read directly as text, each
// clearing 4.5:1 on bone, card, sunk AND its own tint at the fill value
// itself, so a darkened variant would only restate the fill. MOSS_TEXT exists
// as a name, not as a value: it holds the same #2C6A4F as MOSS and is kept
// solely because call sites already reference it.
//                bone / card / sunk / white / own tint
//   MOSS         5.93 / 6.40 / 5.61 / 6.40 / 5.24
//   INDIGO       5.76 / 6.22 / 5.45 / 6.22 / 4.69
//   OCHRE        5.78 / 6.24 / 5.47 / 6.24 / 4.70
//   STEEL        5.77 / 6.23 / 5.46 / 6.23 / 4.69
//   PLUM         5.81 / 6.28 / 5.50 / 6.28 / 4.74
//   CLAY         5.81 / 6.27 / 5.49 / 6.27 / 4.71

// ── Surfaces ───────────────────────────────────────────────────────────────
// Three tiers, all light, and all in the same cool green-white family as the
// moss that leads the system — a near-neutral held at hue ~130° rather than
// pushed to a warm cream. The point of the three tiers is a value ladder, not
// a hue statement: bone → card is one step up, bone → sunk one step down, and
// nothing on the page is darker than the type.
const BONE = '#F4F7F4';    // page floor · luminance 0.923
const CARD = '#FFFFFF';    // cards, panels · luminance 1.000
const SUNK = '#EDF1ED';    // table headers, wells, insets · luminance 0.870
//
// The hairlines are the "well divided" half of the 26 Aug brief, and they are
// the weakest measurement in the file: HAIRLINE is 1.21:1 against bone and
// 1.31:1 against card — a division you have to be told about rather than one
// you see. HAIRLINE_SOFT is weaker still by design; it is the gentle divider
// and hover wash, not the structural one. If divisions need to read harder,
// this is the pair to move, not the surfaces.
const HAIRLINE = '#DCE3DD';       // luminance 0.754 · 1.21 on bone / 1.31 on card
const HAIRLINE_SOFT = '#EAEFEA'; // luminance 0.852 · 1.08 on bone / 1.17 on card

// ── Text ───────────────────────────────────────────────────────────────────
// Measured on bone / card / sunk. Dark neutrals carrying a faint green cast
// from the bone hue family, so type sits in the ground's colour rather than
// on top of it.
const TEXT_PRIMARY = '#1A2620';    // 14.50 / 15.65 / 13.72
const TEXT_SECONDARY = '#4A5750';  // 7.02 / 7.58 / 6.64
const TEXT_MUTED = '#70665C';      // 5.20 / 5.61 / 4.92 — the one warm-cast
                                   // value left in the text set; it clears
                                   // 4.5 on all three grounds, sunk with the
                                   // least room.
const NEUTRAL_GREY = '#ABA39C';    // 2.49 on white — fails AA as text, so it
                                   // is never a badge glyph; a status with no
                                   // fixed ink gets a tinted chip carrying its
                                   // OWN dark text instead.

// ── Type ───────────────────────────────────────────────────────────────────
// The single biggest lever, and the reason the previous pass read like an OS
// rather than a product: it used the system stack for everything.
//
// Display is a serif — money and dates set in a serif read as a record, which
// is what a utilisation ledger is. UI stays sans, because form labels, buttons
// and table headers are controls rather than prose.
//
// Zodiak is the production serif as of 01 Sep 2026; Switzer carries UI and
// Cabinet Grotesk the figures. Source Serif 4 stays in the stack behind
// Zodiak, and Georgia behind that, as the fallback for the instant before the
// variable font loads — both have true tabular figures, so the layout doesn't
// shift when it swaps in.
const SERIF = "'Zodiak', 'Source Serif 4', Georgia, serif";
const SANS = "'Switzer', system-ui, -apple-system, 'Segoe UI', sans-serif";
const DISPLAY = "'Cabinet Grotesk', 'Switzer', system-ui, sans-serif"; // figures that matter

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
// colour the page never uses. The tint below is rgb(37, 31, 24), a warm brown
// carried over from the coral pass; TEXT_PRIMARY is rgb(26, 38, 32), so the
// shadow no longer matches the ink it was meant to follow.
const SHADOW_SOFT = '0 1px 2px rgba(37,31,24,0.05)';
const SHADOW_RAISED = '0 4px 12px rgba(37,31,24,0.08)';
const SHADOW_OVERLAY = '0 12px 32px rgba(37,31,24,0.12)';

const ttaTheme = createTheme({
  palette: {
    // primary.main takes MOSS_TEXT, which is the same value as MOSS. The
    // palette slot is read as TEXT far more often than as a fill (borders,
    // selected labels, checked icons, the Tab underline's label colour), and
    // naming the text constant here keeps that reading explicit at the call
    // site. Nothing turns on the choice while the two are equal — but if moss
    // ever needs a darkened text variant again, this is the line that already
    // points at it.
    primary: { main: MOSS_TEXT, light: MOSS_T, dark: '#234F3B', contrastText: '#FDF7F4' },
    // secondary is indigo — the other half of the product: what was promised.
    secondary: { main: INDIGO, light: INDIGO_T, dark: '#27417D', contrastText: '#FFFFFF' },
    info: { main: STEEL, light: STEEL_T, dark: '#134863', contrastText: '#FFFFFF' },
    warning: { main: OCHRE, light: OCHRE_T, dark: '#5A3E02', contrastText: '#FFFFFF' },
    error: { main: CLAY, light: CLAY_T, dark: '#66371B', contrastText: '#FFFFFF' },
    // success mirrors primary, as it always has here — the main verb in this
    // module is spend, so "successful" and "primary action" are one ink.
    success: { main: MOSS_TEXT, light: MOSS_T, dark: '#234F3B', contrastText: '#FDF7F4' },
    grey: {
      50: BONE, 100: HAIRLINE_SOFT, 200: HAIRLINE, 300: '#D1C9C1', 400: NEUTRAL_GREY,
      500: TEXT_MUTED, 600: TEXT_SECONDARY, 700: '#4E4439', 800: '#38312A', 900: TEXT_PRIMARY,
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
    // down from 0.06em and the colour is TEXT_MUTED, so it sits under
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
        // The MOSS fill under a near-white label: #FDF7F4 on moss is 6.03:1,
        // pure white would be 6.40:1. The primary action is the heaviest
        // object in its region — which the pale amber it replaced never was.
        containedPrimary: {
          backgroundColor: MOSS,
          color: '#FDF7F4',
          '&:hover': { backgroundColor: '#AF3216', boxShadow: 'none' },
        },
        outlined: {
          backgroundColor: CARD,
          borderColor: HAIRLINE,
          color: TEXT_PRIMARY,
          '&:hover': { backgroundColor: BONE, borderColor: '#C9BCA8' },
        },
        outlinedPrimary: { borderColor: MOSS_TEXT, color: MOSS_TEXT, '&:hover': { backgroundColor: MOSS_T, borderColor: MOSS_TEXT } },
        textPrimary: { color: MOSS_TEXT },
        containedSecondary: { backgroundColor: INDIGO, color: '#FFFFFF', '&:hover': { backgroundColor: '#305099' } },
        containedInfo: { backgroundColor: STEEL, color: '#FFFFFF', '&:hover': { backgroundColor: '#175979' } },
        containedError: { backgroundColor: CLAY, color: '#FFFFFF', '&:hover': { backgroundColor: '#7D4422' } },
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
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9BCA8' },
          // A ring, not a thicker border — a border-width change reflows the
          // field's contents by a pixel on every focus.
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: MOSS_TEXT, borderWidth: 1 },
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
          '&.Mui-focused': { color: MOSS_TEXT },
          '&.Mui-error': { color: CLAY },
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
          '&:hover': { borderColor: '#C9BCA8' },
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
    MuiBackdrop: { styleOverrides: { root: { backgroundColor: 'rgba(37,31,24,0.40)' } } },

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
          // The nav rail's selected item is a filled moss pill — never a left
          // border, and never a weight change, which would re-flow the label
          // on every navigation. Moss tint under moss text, 5.24:1 at rest and
          // 4.72:1 on hover.
          '&.Mui-selected': {
            backgroundColor: MOSS_T,
            color: MOSS_TEXT,
            '&:hover': { backgroundColor: MOSS_T_HOVER },
            '& .MuiListItemIcon-root': { color: MOSS_TEXT },
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
        colorPrimary: { backgroundColor: MOSS_T, color: MOSS_TEXT },
        colorSecondary: { backgroundColor: INDIGO_T, color: INDIGO },
        colorSuccess: { backgroundColor: MOSS_T, color: MOSS_TEXT },
        colorWarning: { backgroundColor: OCHRE_T, color: OCHRE },
        colorError: { backgroundColor: CLAY_T, color: CLAY },
        colorInfo: { backgroundColor: STEEL_T, color: STEEL },
        colorDefault: { backgroundColor: SUNK, color: TEXT_SECONDARY },
      },
    },
    MuiAvatar: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.875rem' }, colorDefault: { backgroundColor: MOSS_T, color: MOSS_TEXT } } },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', letterSpacing: 0, color: TEXT_SECONDARY,
          transition: t(['color']),
          // Weight stays 500 when selected — see the nav note above.
          '&.Mui-selected': { color: MOSS_TEXT },
        },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { backgroundColor: MOSS, height: 2, borderRadius: radius.pill } } },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, fontSize: '0.875rem', alignItems: 'center' },
        standardSuccess: { backgroundColor: MOSS_T, color: MOSS_TEXT },
        standardWarning: { backgroundColor: OCHRE_T, color: OCHRE },
        standardError: { backgroundColor: CLAY_T, color: CLAY },
        standardInfo: { backgroundColor: STEEL_T, color: STEEL },
      },
    },

    MuiCheckbox: { styleOverrides: { root: { color: '#C9BCA8', '&.Mui-checked': { color: MOSS_TEXT } } } },
    MuiRadio: { styleOverrides: { root: { color: '#C9BCA8', '&.Mui-checked': { color: MOSS_TEXT } } } },
    MuiSwitch: { styleOverrides: { switchBase: { '&.Mui-checked': { color: MOSS_TEXT, '& + .MuiSwitch-track': { backgroundColor: MOSS_T } } } } },
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
  // Opt-in Apple-glass surface. Spread onto a Paper/Box `sx` where depth is
  // wanted (project detail, wizard card). The inset top line is the specular
  // highlight; heavy blur+saturation lets the ground's colour glow through.
  glass: {
    background: 'linear-gradient(160deg, rgba(255,255,255,0.62), rgba(255,255,255,0.40))',
    backdropFilter: 'blur(40px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 30px 70px rgba(30,54,42,0.16), 0 8px 20px rgba(30,54,42,0.08)',
  },
  // A soft green→teal→amber wash for the app canvas behind glass panels.
  gradient: 'radial-gradient(1200px 700px at 88% -8%, rgba(196,232,214,0.55), transparent 60%), radial-gradient(1000px 620px at -8% 8%, rgba(196,226,232,0.40), transparent 55%), radial-gradient(900px 600px at 50% 108%, rgba(240,228,196,0.28), transparent 55%), linear-gradient(180deg,#F6F9F6,#F1F5F1)',
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
// are two paint values rather than one. `text` equals `fill` for all six inks;
// moss spells it MOSS_TEXT only because existing call sites use that name.
export const inks = {
  moss: { fill: MOSS, accent: MOSS_A, text: MOSS_TEXT, tint: MOSS_T, means: 'money utilised, primary action' },
  indigo: { fill: INDIGO, accent: INDIGO_A, text: INDIGO, tint: INDIGO_T, means: 'contracts and deliverables' },
  ochre: { fill: OCHRE, accent: OCHRE_A, text: OCHRE, tint: OCHRE_T, means: 'waiting on you' },
  steel: { fill: STEEL, accent: STEEL_A, text: STEEL, tint: STEEL_T, means: 'funders and partners' },
  plum: { fill: PLUM, accent: PLUM_A, text: PLUM, tint: PLUM_T, means: 'closed, frozen certificate' },
  clay: { fill: CLAY, accent: CLAY_A, text: CLAY, tint: CLAY_T, means: 'overspend, needs a decision' },
  // Deprecated aliases, kept so nothing breaks mid-rename. `coral` is the name
  // the 26 Aug pitch gave this slot; that call was reversed 01 Sep 2026 and the
  // slot has been moss green since. `teal` is the old name for steel. Neither
  // is a distinct ink — both point at the canonical entry above. Do not reach
  // for either in new code.
  coral: { fill: MOSS, accent: MOSS_A, text: MOSS_TEXT, tint: MOSS_T, means: 'money utilised, primary action' },
  teal: { fill: STEEL, accent: STEEL_A, text: STEEL, tint: STEEL_T, means: 'funders and partners' },
};

// Every figure on screen. A rupee value that changes width mid-render shoves
// the layout beside it, which in a financial table is a correctness problem.
export const tabular = { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'tnum' 1" };

// Money is the subject of every screen here, so a figure is set roughly three
// times its label — the reference decks all do this and the previous pass did
// not, which is why its numbers read as data rather than as the point.
export const figure = {
  hero: { fontFamily: DISPLAY, fontSize: '2.75rem', fontWeight: 600, lineHeight: 1, letterSpacing: '-0.032em', ...tabular },
  large: { fontFamily: DISPLAY, fontSize: '1.5625rem', fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.03em', ...tabular },
  row: { fontFamily: DISPLAY, fontSize: '0.96875rem', fontWeight: 500, letterSpacing: '-0.02em', ...tabular },
  unit: { fontFamily: SANS, fontSize: '0.71875rem', color: TEXT_MUTED, letterSpacing: 0 },
};

export const fonts = { serif: SERIF, sans: SANS, display: DISPLAY };

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
// legibility anywhere that was not already measured above. Outside the portal
// all three roles are moss. Derive the ramp in OKLCH — hold hue and chroma,
// move lightness.
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
