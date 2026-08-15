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

// Relative luminance, WCAG 2.x.
function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const INK = '#111827';
const PAPER = '#FFFFFF';

// Pick whichever of ink/paper actually contrasts better against the brand
// colour, by measuring both — NOT by thresholding luminance.
//
// A threshold was wrong here and wrong in a way that only shows up on real
// brands. Against this ink the true crossover is L ≈ 0.20; the code compared
// against 0.42, so every colour in the band between them was handed white when
// black was far better. #22C55E — the branding form's own secondary placeholder
// — rendered at 2.28:1, below the 4.5:1 minimum, where black gives 7.79:1.
// Comparing the two ratios is correct for any ink/paper pair and cannot drift
// if either is ever changed.
function contrastTextFor(hex) {
  if (!parseHex(hex)) return INK;
  return contrastRatio(hex, INK) >= contrastRatio(hex, PAPER) ? INK : PAPER;
}

const shade = (hex, amount) => {
  const rgb = parseHex(hex);
  return rgb ? toHex(rgb.map((v) => v * (1 - amount))) : hex;
};

const tint = (hex, amount) => {
  const rgb = parseHex(hex);
  return rgb ? toHex(rgb.map((v) => v + (255 - v) * amount)) : hex;
};

// WCAG AA for normal text.
const AA = 4.5;

// Some brand colours cannot reach AA against ANY text colour — mid-tones are
// the worst case, because they sit far from both ink and paper. #486AFF, a real
// funder's brand, tops out at 4.39:1; plain grey #808080 at 4.49:1. A
// white-label system does not get to choose the hex a client hands over, so
// "pick the better text colour" is not sufficient on its own.
//
// Where the brand colour cannot carry legible text, the FILL is nudged — darker
// or lighter, whichever direction its better text colour already points — until
// it clears AA. Hue is preserved, so it still reads as the client's colour; only
// the shade moves, and only as far as legibility requires. The unmodified brand
// colour is still used everywhere it is not carrying text.
function legibleFill(hex) {
  const parsed = parseHex(hex);
  if (!parsed) return { fill: hex, text: INK };

  let text = contrastTextFor(hex);
  if (contrastRatio(hex, text) >= AA) return { fill: hex, text };

  // Move away from the text colour: toward black under white text, toward white
  // under black text.
  const towardWhite = text === INK;
  for (let step = 1; step <= 20; step += 1) {
    const amount = step * 0.05;
    const candidate = towardWhite ? tint(hex, amount) : shade(hex, amount);
    text = contrastTextFor(candidate);
    if (contrastRatio(candidate, text) >= AA) return { fill: candidate, text };
  }
  // Unreachable for any real colour, but never return something illegible.
  return { fill: hex, text: contrastTextFor(hex) };
}

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

  // A malformed value is treated as absent. Passing it through reaches
  // createTheme, which throws on a colour it cannot parse — one bad character in
  // an admin form would white-screen the funder's whole portal.
  const primary = parseHex(brand.primaryColor) ? brand.primaryColor : null;
  const secondary = parseHex(brand.secondaryColor) ? brand.secondaryColor : null;
  if (!primary && !secondary) return muiTheme;

  const primaryFill = primary ? legibleFill(primary) : null;
  const secondaryFill = secondary ? legibleFill(secondary) : null;

  // Re-skin the inherited component overrides, then set the primary button
  // explicitly so its text contrast is computed rather than inherited.
  const components = primary ? rebrand(muiTheme.components, primary) : muiTheme.components;

  const buttonOverrides = {
    ...components?.MuiButton?.styleOverrides,
    ...(primaryFill
      ? {
          containedPrimary: {
            backgroundColor: primaryFill.fill,
            color: primaryFill.text,
            '&:hover': { backgroundColor: shade(primaryFill.fill, 0.12), boxShadow: 'none' },
          },
        }
      : {}),
    ...(secondaryFill
      ? {
          containedSecondary: {
            backgroundColor: secondaryFill.fill,
            color: secondaryFill.text,
            '&:hover': { backgroundColor: shade(secondaryFill.fill, 0.12), boxShadow: 'none' },
          },
        }
      : {}),
  };

  return createTheme({
    ...muiTheme,
    palette: {
      ...muiTheme.palette,
      // palette.main stays the funder's true colour — it tints borders, icons and
      // indicators that carry no text. contrastText is the legible pair.
      ...(primary
        ? { primary: { main: primary, contrastText: primaryFill.text } }
        : {}),
      ...(secondary
        ? { secondary: { main: secondary, contrastText: secondaryFill.text } }
        : {}),
    },
    components: {
      ...components,
      MuiButton: { ...components?.MuiButton, styleOverrides: buttonOverrides },
    },
  });
}
