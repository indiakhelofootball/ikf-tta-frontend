import { createTheme } from '@mui/material/styles';

// ===== ACCENT AMBER =====
// TTA's amber has two jobs with opposite requirements, and one hex cannot do
// both. As a FILL (#FDE68A behind #111827 ink) it measures 11.75:1 and is fine.
// As TEXT on the app's light grounds it is not: #FBBF24 measures 1.60:1 on the
// page ground #F9FAFB and #D97706 measures 3.05:1 — both below the 4.5:1 AA
// minimum for normal text, and #FBBF24 is below 3:1 even for the tabs
// indicator, which is a UI boundary rather than text.
//
// AMBER_TEXT is #D97706 darkened 25% along its own hue, so it still reads as
// the brand amber. Measured against every ground this app paints text on:
//   #FFFFFF 5.27 · #F9FAFB 5.04 · #F5F5F7 4.84 · #F3F4F6 4.78 · #FFFBEB 5.08
// It is used for every amber TEXT/accent role — text buttons, links, the
// selected tab label, the tabs indicator, focused labels. Fills keep the light
// amber ramp untouched; do not swap one for the other.
//
// It also carries the non-text UI roles, which are judged at 3:1 rather than
// 4.5:1: checked checkbox/radio/switch, progress bars, hover borders. #FBBF24
// measures 1.52–1.67 across the four grounds and fails even that lower bar, so
// a checked control was near-invisible. AMBER_TEXT clears it everywhere
// (4.78–5.27). #D97706 was rejected: it passes on #FFFFFF (3.19) and #F9FAFB
// (3.05) but fails on the tinted grounds #F5F5F7 (2.93) and #F3F4F6 (2.89).
const AMBER_TEXT = '#A35905';

// Greys, likewise measured. The old values fail on the tinted grounds this app
// actually uses, not just on white:
//   #94A3B8 2.45 on #F9FAFB · #9CA3AF 2.43 on #F9FAFB
//   #6B7280 4.83 on white but 4.44 on #F5F5F7 — no headroom, fails on any tint.
// Replacements keep their hue family and clear 4.5:1 on the darkest ground:
//   GREY_SLATE #5A6B82 → 5.21 on #F9FAFB, 5.00 on #F5F5F7
//   GREY_MUTED #5F6672 → 5.54 on #F9FAFB, 5.31 on #F5F5F7
//   GREY_LABEL #5B6270 → 5.87 on #F9FAFB, 5.63 on #F5F5F7
const GREY_MUTED = '#5F6672';
const GREY_LABEL = '#5B6270';

const muiTheme = createTheme({
  // ===== COLOR PALETTE =====
  palette: {
    primary: {
      // `main` is what MUI renders as TEXT for text buttons, links, focused
      // labels and selected tabs, so it must be the on-light-legible amber.
      // The fill amber survives as `light` and in containedPrimary below.
      main: AMBER_TEXT,
      light: '#FDE68A',
      dark: '#7E3A06',
      contrastText: '#111827',
    },
    secondary: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
      contrastText: '#111827',
    },
    info: {
      main: '#3B82F6',
      light: '#93C5FD',
      dark: '#2563EB',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      // `main` (2.06:1 on the page ground) and the old `#D97706` (3.05:1) are
      // both below AA as text, so `dark` is the only warning value safe to
      // render words in.
      dark: AMBER_TEXT,
      contrastText: '#111827',
    },
    success: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
      contrastText: '#111827',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1d1d1f',
      secondary: '#6e6e73',
      disabled: GREY_MUTED,
    },
  },

  // ===== TYPOGRAPHY =====
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', sans-serif",
    h1: {
      fontSize: '3rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    h2: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    h3: {
      fontSize: '1.875rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: '-0.025em',
      color: '#1d1d1f',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      fontWeight: 400,
      color: '#1d1d1f',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      fontWeight: 400,
      color: '#1d1d1f',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.9375rem',
      letterSpacing: '-0.01em',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: '#6e6e73',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },
    subtitle2: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
      fontSize: '0.875rem',
    },
    overline: {
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: '#6e6e73',
    },
  },

  // ===== SPACING =====
  spacing: 8,

  // ===== SHAPE =====
  shape: {
    borderRadius: 8,
  },

  // ===== BREAKPOINTS =====
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },

  // ===== SHADOWS =====
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
    '0 4px 12px rgba(0,0,0,0.06)',
    '0 8px 24px rgba(0,0,0,0.08)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    ...Array(18).fill('0 2px 8px rgba(0,0,0,0.04)'),
  ],

  // ===== COMPONENT OVERRIDES =====
  components: {

    // ── Baseline ────────────────────────────────────────────────────
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },

    // ── Buttons ─────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          padding: '0.625rem 1.25rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          letterSpacing: '-0.01em',
          '&:hover': {
            boxShadow: 'none',
          },
          '&.Mui-disabled': {
            backgroundColor: '#E5E7EB',
            color: '#9CA3AF',
          },
        },
        sizeSmall: {
          padding: '0.375rem 0.875rem',
          fontSize: '0.85rem',
        },
        sizeLarge: {
          padding: '0.875rem 1.75rem',
          fontSize: '1rem',
        },
        containedPrimary: {
          backgroundColor: '#FDE68A',
          color: '#111827',
          '&:hover': {
            backgroundColor: '#FCD34D',
            boxShadow: 'none',
          },
        },
        // White ink on #22C55E measures 2.28:1; the same green under #111827 ink
        // measures 7.79:1. The fill is kept, the ink is flipped — same pattern
        // the amber contained button already uses.
        containedSecondary: {
          backgroundColor: '#22C55E',
          color: '#111827',
          '&:hover': {
            backgroundColor: '#16A34A',
          },
        },
        // White on #3B82F6 measures 3.68:1 ("Send to Payment" on /payments).
        // #2563EB — the ramp's own hover shade — carries white at 5.17:1.
        containedInfo: {
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#1D4ED8',
          },
        },
        containedError: {
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#DC2626',
          },
        },
        outlinedPrimary: {
          borderColor: AMBER_TEXT,
          color: AMBER_TEXT,
          '&:hover': {
            backgroundColor: '#FEF3C7',
            borderColor: AMBER_TEXT,
          },
        },
        outlinedError: {
          borderColor: '#FECACA',
          color: '#EF4444',
          '&:hover': {
            backgroundColor: '#FEF2F2',
            borderColor: '#EF4444',
          },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.625rem',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.05)',
          },
        },
      },
    },

    // ── Inputs & Forms ───────────────────────────────────────────────
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.75rem',
            fontSize: '0.9375rem',
            transition: 'border-color 0.2s ease',
            '&:hover fieldset': {
              borderColor: AMBER_TEXT,
            },
            '&.Mui-focused fieldset': {
              borderColor: AMBER_TEXT,
              borderWidth: '2px',
            },
            '&.Mui-error fieldset': {
              borderColor: '#EF4444',
            },
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: AMBER_TEXT,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: AMBER_TEXT,
            borderWidth: '2px',
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9rem',
          fontWeight: 500,
          color: GREY_LABEL,
          '&.Mui-focused': {
            color: AMBER_TEXT,
            fontWeight: 600,
          },
          '&.Mui-error': {
            color: '#EF4444',
          },
        },
      },
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#3c3c43',
          '&.Mui-focused': {
            color: AMBER_TEXT,
          },
        },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          marginTop: '4px',
          fontWeight: 400,
          '&.Mui-error': {
            color: '#EF4444',
          },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: '0.75rem',
        },
      },
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: '0.75rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
        },
        option: {
          fontSize: '0.9rem',
          padding: '0.625rem 1rem',
          '&[aria-selected="true"]': {
            backgroundColor: '#FEF3C7',
            color: '#B45309',
          },
          '&.Mui-focused': {
            backgroundColor: '#F9FAFB',
          },
        },
        listbox: {
          padding: '0.375rem',
        },
        noOptions: {
          fontSize: '0.875rem',
          color: GREY_LABEL,
        },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#D1D5DB',
          '&.Mui-checked': {
            color: AMBER_TEXT,
          },
          '&:hover': {
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
          },
        },
      },
    },

    MuiRadio: {
      styleOverrides: {
        root: {
          color: '#D1D5DB',
          '&.Mui-checked': {
            color: AMBER_TEXT,
          },
          '&:hover': {
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
          },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          // Thumb reads against its own track, not the page: AMBER_TEXT on the
          // #FDE68A track measures 4.23, and 5.27 against white where the thumb
          // overhangs. #FBBF24 was 1.34 against the track — thumb and track were
          // the same colour, so "on" and "off" were indistinguishable.
          '&.Mui-checked': {
            color: AMBER_TEXT,
            '& + .MuiSwitch-track': {
              backgroundColor: '#FDE68A',
            },
          },
        },
      },
    },

    // ── Cards & Surfaces ─────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '1.5rem',
          '&:last-child': {
            paddingBottom: '1.5rem',
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        },
      },
    },

    // ── Dialogs ──────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          border: '1px solid rgba(0,0,0,0.06)',
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: '#1d1d1f',
          padding: '1.5rem 1.5rem 0.75rem',
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '1rem 1.5rem',
        },
        dividers: {
          borderColor: 'rgba(0,0,0,0.06)',
        },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '0.75rem 1.5rem 1.5rem',
          gap: '0.5rem',
        },
      },
    },

    // ── Tables ───────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '0.875rem 1rem',
          letterSpacing: '-0.01em',
          borderColor: 'rgba(0,0,0,0.06)',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 700,
          backgroundColor: '#F5F5F7',
          color: GREY_LABEL,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
          '&:last-child td': {
            borderBottom: 0,
          },
        },
        head: {
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: 'none',
        },
      },
    },

    // ── Navigation & Lists ───────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.625rem',
          margin: '0.125rem 0',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(0,0,0,0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: '#FDE68A',
            },
            '& .MuiListItemIcon-root': {
              color: AMBER_TEXT,
            },
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '36px',
          color: GREY_LABEL,
        },
      },
    },

    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.9rem',
          fontWeight: 500,
          letterSpacing: '-0.01em',
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: '0.75rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
          minWidth: '140px',
        },
        list: {
          padding: '0.375rem',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          fontSize: '0.9rem',
          padding: '0.5rem 0.875rem',
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
          '&.Mui-selected': {
            backgroundColor: '#FEF3C7',
            '&:hover': {
              backgroundColor: '#FDE68A',
            },
          },
        },
      },
    },

    // ── Steppers ─────────────────────────────────────────────────────
    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: GREY_MUTED,
          '&.Mui-active': {
            fontWeight: 700,
            color: AMBER_TEXT,
          },
          '&.Mui-completed': {
            fontWeight: 600,
            // #16A34A is 3.30:1 on white — fine for an icon, short of 4.5:1 for
            // a label. #15803D is the same green ramp at 5.02:1.
            color: '#15803D',
          },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: '#E5E7EB',
          // The step numeral sits ON this fill, so fill and numeral have to move
          // together. Darkening to AMBER_TEXT takes the circle from 1.67 to 5.27
          // against the page, but drops the #111827 numeral to 3.37 — under the
          // 4.5 text bar. White on AMBER_TEXT restores it at 5.27, so the numeral
          // is inverted for this state only. The inactive (#E5E7EB, 14.33) and
          // completed (#22C55E, 7.79) states keep the dark numeral below.
          '&.Mui-active': {
            color: AMBER_TEXT,
            '& .MuiStepIcon-text': {
              fill: '#FFFFFF',
            },
          },
          '&.Mui-completed': {
            color: '#22C55E',
          },
        },
        text: {
          fontWeight: 700,
          fill: '#111827',
        },
      },
    },

    MuiStepConnector: {
      styleOverrides: {
        line: {
          borderColor: '#E5E7EB',
        },
      },
    },

    // ── Chips ────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.75rem',
          letterSpacing: '0.02em',
          height: '24px',
        },
        sizeSmall: {
          height: '20px',
          fontSize: '0.7rem',
        },
        sizeMedium: {
          height: '28px',
        },
        colorPrimary: {
          backgroundColor: '#FEF3C7',
          color: '#B45309',
        },
        colorSecondary: {
          backgroundColor: '#DCFCE7',
          color: '#15803D',
        },
        colorInfo: {
          backgroundColor: '#DBEAFE',
          color: '#1E40AF',
        },
        colorSuccess: {
          backgroundColor: '#DCFCE7',
          color: '#15803D',
        },
        colorWarning: {
          backgroundColor: '#FEF3C7',
          color: '#B45309',
        },
        colorError: {
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
        },
        colorDefault: {
          backgroundColor: '#F3F4F6',
          color: '#374151',
        },
      },
    },

    // ── Alerts ───────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          alignItems: 'center',
        },
        standardSuccess: {
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          '& .MuiAlert-icon': { color: '#22C55E' },
        },
        standardWarning: {
          backgroundColor: '#FEF3C7',
          color: '#B45309',
          '& .MuiAlert-icon': { color: '#F59E0B' },
        },
        standardError: {
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          '& .MuiAlert-icon': { color: '#EF4444' },
        },
        standardInfo: {
          backgroundColor: '#DBEAFE',
          color: '#1E40AF',
          '& .MuiAlert-icon': { color: '#3B82F6' },
        },
        filledSuccess: { backgroundColor: '#22C55E' },
        filledWarning: { backgroundColor: '#F59E0B' },
        filledError: { backgroundColor: '#EF4444' },
        filledInfo: { backgroundColor: '#3B82F6' },
      },
    },

    MuiAlertTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.9rem',
          marginBottom: '0.25rem',
        },
      },
    },

    // ── Tabs ─────────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.9375rem',
          letterSpacing: '-0.01em',
          color: GREY_LABEL,
          '&.Mui-selected': {
            fontWeight: 700,
            color: AMBER_TEXT,
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          // A UI boundary, so 3:1 is the bar — but #FBBF24 measured 1.60:1 on
          // the page ground and failed even that.
          backgroundColor: AMBER_TEXT,
          height: '3px',
          borderRadius: '9999px',
        },
      },
    },

    // ── Misc ─────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0,0,0,0.06)',
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.9rem',
        },
        colorDefault: {
          backgroundColor: '#FEF3C7',
          color: '#B45309',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: '#111827',
          padding: '0.375rem 0.75rem',
        },
        arrow: {
          color: '#111827',
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          height: '6px',
          backgroundColor: '#F3F4F6',
        },
        barColorPrimary: {
          backgroundColor: AMBER_TEXT,
        },
        barColorSecondary: {
          backgroundColor: '#22C55E',
        },
      },
    },

    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: {
          color: AMBER_TEXT,
        },
      },
    },

    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      },
    },

    MuiBadge: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: '#FBBF24',
          color: '#111827',
        },
        colorError: {
          backgroundColor: '#EF4444',
        },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          backgroundColor: '#F3F4F6',
        },
        wave: {
          '&::after': {
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          },
        },
      },
    },
  },
});

export default muiTheme;
