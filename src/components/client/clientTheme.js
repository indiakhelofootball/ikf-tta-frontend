import { createTheme } from '@mui/material/styles';

import muiTheme from '../../styles/muiTheme';

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

const toHex = (rgb) =>
  `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

// Relative luminance (WCAG 2.x) — picks black or white text over a brand colour
// so a dark navy and a pale yellow are both readable.
function contrastTextFor(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return '#111827';
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.42 ? '#111827' : '#FFFFFF';
}

const shade = (hex, amount) => {
  const rgb = parseHex(hex);
  return rgb ? toHex(rgb.map((v) => v * (1 - amount))) : hex;
};

const tint = (hex, amount) => {
  const rgb = parseHex(hex);
  return rgb ? toHex(rgb.map((v) => v + (255 - v) * amount)) : hex;
};

// ---------------------------------------------------------------------------
// The problem this file exists to solve
// ---------------------------------------------------------------------------
// Overriding `palette.primary` is NOT enough to re-skin the portal. `muiTheme`
// hardcodes TTA's amber ramp inside `components.*.styleOverrides` across 26
// component types (Button, Tab, Tabs, Chip, Alert, Menu, Table, inputs…), and a
// component styleOverride beats the palette. Spreading `...muiTheme` carried all
// of it through, so a funder saw their brand on the login hero and logo — which
// come from the branding record directly — while every button, tab and chip
// stayed TTA yellow.
//
// Rather than re-author 26 overrides, the amber ramp is substituted for a ramp
// derived from the funder's primary colour, preserving each value's role:
//   FEF3C7 palest fill · FDE68A light fill · FCD34D hover
//   FBBF24 / F59E0B / D97706 accent · B45309 dark accent text
// TTA's own theme is untouched; this mapping applies only under /client.
//
// The greys, greens, blues and reds in muiTheme are deliberately NOT remapped —
// they carry semantics (success, error, info) that must not change per funder.
const AMBER_RAMP = {
  '#fef3c7': (c) => tint(c, 0.92),
  '#fde68a': (c) => tint(c, 0.72),
  '#fcd34d': (c) => tint(c, 0.55),
  '#fbbf24': (c) => c, // Tabs indicator
  '#f59e0b': (c) => c,
  '#d97706': (c) => c,
  '#b45309': (c) => shade(c, 0.25),
};

function rebrand(node, primary) {
  if (typeof node === 'string') {
    const key = node.trim().toLowerCase();
    const map = AMBER_RAMP[key];
    return map ? map(primary) : node;
  }
  if (Array.isArray(node)) return node.map((v) => rebrand(v, primary));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = rebrand(v, primary);
    return out;
  }
  return node;
}

// ---------------------------------------------------------------------------

export default function clientThemeFrom(brand) {
  if (!brand || (!brand.primaryColor && !brand.secondaryColor)) {
    return muiTheme;
  }

  const primary = brand.primaryColor;
  const secondary = brand.secondaryColor;

  // Re-skin the inherited component overrides, then set the primary button
  // explicitly so its text contrast is computed rather than inherited.
  const components = primary ? rebrand(muiTheme.components, primary) : muiTheme.components;

  const buttonOverrides = {
    ...components?.MuiButton?.styleOverrides,
    ...(primary
      ? {
          containedPrimary: {
            backgroundColor: primary,
            color: contrastTextFor(primary),
            '&:hover': { backgroundColor: shade(primary, 0.12), boxShadow: 'none' },
          },
        }
      : {}),
    ...(secondary
      ? {
          containedSecondary: {
            backgroundColor: secondary,
            color: contrastTextFor(secondary),
            '&:hover': { backgroundColor: shade(secondary, 0.12), boxShadow: 'none' },
          },
        }
      : {}),
  };

  return createTheme({
    ...muiTheme,
    palette: {
      ...muiTheme.palette,
      ...(primary
        ? { primary: { main: primary, contrastText: contrastTextFor(primary) } }
        : {}),
      ...(secondary
        ? { secondary: { main: secondary, contrastText: contrastTextFor(secondary) } }
        : {}),
    },
    components: {
      ...components,
      MuiButton: { ...components?.MuiButton, styleOverrides: buttonOverrides },
    },
  });
}
