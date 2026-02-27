import { createTheme } from '@mui/material/styles';

const muiTheme = createTheme({
  // ===== COLOR PALETTE =====
  palette: {
    primary: {
      main: '#FBBF24',
      light: '#FDE68A',
      dark: '#D97706',
      contrastText: '#111827',
    },
    secondary: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
      contrastText: '#FFFFFF',
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
      dark: '#D97706',
      contrastText: '#111827',
    },
    success: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
      contrastText: '#FFFFFF',
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
      primary: '#1d1d1f',     // Apple's text color
      secondary: '#86868b',   // Apple's secondary text
      disabled: '#9CA3AF',
    },
  },

  // ===== TYPOGRAPHY — Apple-style sharpness =====
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
      color: '#86868b',
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },
    subtitle2: {
      fontWeight: 500,
      letterSpacing: '-0.01em',
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
    // Global CSS baseline for font smoothing
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
          padding: '0.75rem 1.5rem',
          fontSize: '0.9375rem',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          letterSpacing: '-0.01em',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
          },
        },
        containedPrimary: {
          background: '#FDE68A',        // brand yellow
          color: '#111827',             // always dark text — forced
          boxShadow: 'none',
          '&:hover': {
            background: '#FCD34D',
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          background: '#22C55E',
          color: '#FFFFFF',
          '&:hover': {
            background: '#16A34A',
          },
        },
        containedInfo: {
          background: '#3B82F6',
          color: '#FFFFFF',
          '&:hover': {
            background: '#2563EB',
          },
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.75rem',
            transition: 'border-color 0.2s ease',
            '&:hover fieldset': {
              borderColor: '#FBBF24',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#F59E0B',
              borderWidth: '2px',
            },
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.875rem',
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
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '1rem',
          padding: '2rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.75rem',
        },
        filledSuccess: {
          backgroundColor: '#22C55E',
        },
        filledWarning: {
          backgroundColor: '#F59E0B',
        },
        filledError: {
          backgroundColor: '#EF4444',
        },
        filledInfo: {
          backgroundColor: '#3B82F6',
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '0.875rem 1rem',
          letterSpacing: '-0.01em',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#f5f5f7',
          color: '#1d1d1f',
          fontSize: '0.75rem',
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          letterSpacing: '-0.01em',
        },
      },
    },
  },
});

export default muiTheme;
