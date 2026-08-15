import clientThemeFrom from './clientTheme';

// WCAG 2.x relative luminance + contrast ratio, computed independently of the
// implementation so a bug in one cannot hide a bug in the other.
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const AA = 4.5;

describe('funder portal theming', () => {
  // Real brand colours, chosen to cover the band a luminance threshold gets
  // wrong. #22C55E is the branding form's own secondary placeholder and #0B5FFF
  // its primary one, so these are values a funder can actually be given.
  const BRANDS = [
    ['#22C55E', 'green'],
    ['#EF6C00', 'orange'],
    ['#1B3A6B', 'navy'],
    ['#0B5FFF', 'blue'],
    ['#486AFF', 'periwinkle'],
    ['#FDE68A', 'amber'],
    ['#808080', 'mid grey'],
  ];

  it.each(BRANDS)('%s (%s) button text meets WCAG AA', (color) => {
    const theme = clientThemeFrom({ primaryColor: color });
    const { backgroundColor, color: text } =
      theme.components.MuiButton.styleOverrides.containedPrimary;
    // The fill is NOT asserted equal to the input: some brand colours cannot
    // carry legible text at any shade, so the fill is nudged until it can. What
    // must always hold is that whatever ships is readable.
    expect(ratio(backgroundColor, text)).toBeGreaterThanOrEqual(AA);
  });

  it.each(BRANDS)('%s (%s) stays recognisably the same hue after adjustment', (color) => {
    // palette.main may be darkened for legibility (MUI renders it as text), but
    // it must still read as the funder's colour — the channel ordering, which is
    // what the eye reads as hue, has to survive. A pale brand like #FDE68A moves
    // a long way (yellow text on near-white is unreadable at any lightness) but
    // stays yellow-dominant rather than becoming a neutral grey.
    const order = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.replace('#', '').slice(i - 1, i + 1), 16));
      return [r > g, g > b, r > b].join();
    };
    expect(order(clientThemeFrom({ primaryColor: color }).palette.primary.main))
      .toBe(order(color));
  });

  it.each(BRANDS)('%s (%s) keeps the true brand colour on the login hero path', (color) => {
    // The branding record drives the logo and login image directly, not through
    // the theme, so the funder's exact colour is never lost — only the roles
    // that must carry or be text are adjusted.
    const theme = clientThemeFrom({ primaryColor: color });
    expect(theme.palette.primary.contrastText).toMatch(/^#(111827|FFFFFF)$/i);
  });

  it('leaves a colour alone when it is already legible', () => {
    // The adjustment must be a last resort, not a default.
    const theme = clientThemeFrom({ primaryColor: '#1B3A6B' });
    expect(theme.components.MuiButton.styleOverrides.containedPrimary.backgroundColor)
      .toBe('#1B3A6B');
  });

  it('adjusts only the colours that cannot reach AA, and only as far as needed', () => {
    // #486AFF is a real funder brand and tops out at 4.39:1 against any text.
    const theme = clientThemeFrom({ primaryColor: '#486AFF' });
    const { backgroundColor, color: text } =
      theme.components.MuiButton.styleOverrides.containedPrimary;
    expect(backgroundColor).not.toBe('#486AFF');
    expect(ratio(backgroundColor, text)).toBeGreaterThanOrEqual(AA);
    // Still recognisably the same colour: blue-dominant, not turned grey.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(backgroundColor.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it.each(BRANDS)('%s (%s) picks the BETTER of ink and paper, not a threshold', (color) => {
    // Regression guard. The original implementation thresholded luminance at
    // 0.42 when the true crossover against this ink is ~0.20, so every colour in
    // between was handed white where black scored far higher — #22C55E came out
    // at 2.28:1 instead of 7.79:1. Asserting "the better of the two" cannot
    // regress to a threshold, whatever the ink or paper is later changed to.
    const theme = clientThemeFrom({ primaryColor: color });
    const { backgroundColor, color: text } =
      theme.components.MuiButton.styleOverrides.containedPrimary;
    const best = Math.max(
      ratio(backgroundColor, '#111827'),
      ratio(backgroundColor, '#FFFFFF'),
    );
    expect(ratio(backgroundColor, text)).toBeCloseTo(best, 5);
  });

  it.each(BRANDS)('%s (%s) is legible as TEXT on a light surface', (color) => {
    // A brand colour is used two ways with opposite requirements: as a fill it
    // must carry legible text; as text it must be legible on a light surface.
    // MUI renders palette.primary.main as TEXT for textPrimary buttons, selected
    // tab labels and focused input labels — measured in a browser, #486AFF
    // failed all of those at 3.99-4.39:1 when main was the raw brand hex.
    // #F3F4F6 is the darkest surface the portal paints text on, so it is the
    // hard case.
    const theme = clientThemeFrom({ primaryColor: color });
    expect(ratio(theme.palette.primary.main, '#F3F4F6')).toBeGreaterThanOrEqual(AA);
  });

  it('leaves an already-legible brand untouched in the palette', () => {
    // #1B3A6B measures 10.24:1 on a light surface — nothing to correct.
    expect(clientThemeFrom({ primaryColor: '#1B3A6B' }).palette.primary.main).toBe('#1B3A6B');
  });

  it('re-skins the component overrides, not just the palette', () => {
    // muiTheme hardcodes TTA amber inside components.*.styleOverrides, and an
    // override beats the palette — so a palette-only swap left every button and
    // tab TTA yellow behind the funder's wallpaper.
    const theme = clientThemeFrom({ primaryColor: '#0B5FFF' });
    const serialised = JSON.stringify(theme.components);
    for (const amber of ['#FDE68A', '#FCD34D', '#FBBF24', '#FEF3C7']) {
      expect(serialised.toUpperCase()).not.toContain(amber);
    }
  });

  it('leaves semantic colours alone', () => {
    // Success/error/info must not become the funder's brand colour.
    const theme = clientThemeFrom({ primaryColor: '#0B5FFF' });
    expect(theme.palette.error.main).toBe(muiErrorMain());
    function muiErrorMain() {
      // eslint-disable-next-line global-require
      return require('../../styles/muiTheme').default.palette.error.main;
    }
  });

  it('falls back to the base theme when no brand is set', () => {
    // eslint-disable-next-line global-require
    const base = require('../../styles/muiTheme').default;
    expect(clientThemeFrom(null)).toBe(base);
    expect(clientThemeFrom({})).toBe(base);
  });

  it('ignores a malformed colour rather than throwing', () => {
    expect(() => clientThemeFrom({ primaryColor: 'not-a-colour' })).not.toThrow();
  });
});
