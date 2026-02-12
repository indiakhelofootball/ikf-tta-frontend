import { createTheme } from '@mui/material/styles';

const muiTheme = createTheme({
  // ===== COLOR PALETTE =====
  palette: {
    // PRIMARY = YELLOW
    primary: {
      main: '#FBBF24',      // Yellow-400
      light: '#FDE68A',     // Yellow-200
      dark: '#D97706',      // Yellow-600
      contrastText: '#111827',
    },
    
    // SECONDARY = GREEN
    secondary: {
      main: '#22C55E',      // Green-500
      light: '#86EFAC',     // Green-300
      dark: '#16A34A',      // Green-600
      contrastText: '#FFFFFF',
    },
    
    // INFO = BLUE (Tertiary)
    info: {
      main: '#3B82F6',      // Blue-500
      light: '#93C5FD',     // Blue-300
      dark: '#2563EB',      // Blue-600
      contrastText: '#FFFFFF',
    },
    
    // SEMANTIC COLORS
    error: {
      main: '#EF4444',      // Red-500
      light: '#FCA5A5',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',      // Amber-500
      light: '#FCD34D',
      dark: '#D97706',
      contrastText: '#111827',
    },
    success: {
      main: '#22C55E',      // Green-500 (same as secondary)
      light: '#86EFAC',
      dark: '#16A34A',
      contrastText: '#FFFFFF',
    },
    
    // GRAY SCALE
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
    
    // BACKGROUNDS
    background: {
      default: '#F9FAFB',   // Gray-50
      paper: '#FFFFFF',
    },
    
    // TEXT
    text: {
      primary: '#111827',   // Gray-900
      secondary: '#6B7280', // Gray-500
      disabled: '#9CA3AF',  // Gray-400
    },
  },

  // ===== TYPOGRAPHY =====
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    
    h1: {
      fontSize: '3rem',     // 48px
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2.25rem',  // 36px
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.875rem', // 30px
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',   // 24px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',  // 20px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 600,
      lineHeight: 1.5,
    },
    
    body1: {
      fontSize: '1rem',     // 16px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem', // 14px
      lineHeight: 1.5,
    },
    
    button: {
      textTransform: 'none', // Don't uppercase buttons
      fontWeight: 700,
      fontSize: '1rem',
    },
    
    caption: {
      fontSize: '0.75rem',  // 12px
      lineHeight: 1.5,
    },
  },

  // ===== SPACING =====
  spacing: 8, // Base unit: 8px
  // Usage: spacing(1) = 8px, spacing(2) = 16px, spacing(3) = 24px

  // ===== SHAPE (Border Radius) =====
  shape: {
    borderRadius: 8, // 0.5rem
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
    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    // MUI requires 25 shadows total, fill remaining with default
    ...Array(18).fill('0 1px 3px 0 rgba(0, 0, 0, 0.1)'),
  ],

  // ===== COMPONENT OVERRIDES =====
  components: {
    // === BUTTON ===
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          fontWeight: 700,
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 300ms ease',
          '&:hover': {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            transform: 'scale(1.02)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(to right, #FBBF24, #F59E0B)',
          color: '#111827',
          '&:hover': {
            background: 'linear-gradient(to right, #F59E0B, #D97706)',
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

    // === CARD === ✅ UPDATED FOR UNIFORM HEIGHTS
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          transition: 'all 300ms ease',
          height: '100%',           // 🔑 ADDED
          display: 'flex',          // 🔑 ADDED
          flexDirection: 'column',  // 🔑 ADDED
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },

    // === TEXT FIELD ===
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.5rem',
            transition: 'all 300ms ease',
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

    // === CHIP / BADGE ===
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

    // === PAPER ===
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
      },
    },

    // === DIALOG / MODAL ===
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '1rem',
          padding: '2rem',
        },
      },
    },

    // === ALERT ===
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem',
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

    // === TABLE ===
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '1rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#F9FAFB',
        },
      },
    },

    // === TABS ===
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
        },
      },
    },
  },
});

export default muiTheme;