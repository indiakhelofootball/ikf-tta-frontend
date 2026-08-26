import theme, { motion, surfaces, tabular, inks, figure, fonts, reveal } from './ttaTheme';

test('theme constructs with the expected contract', () => {
  // the Ledger system: moss leads, on a bone ground. Moss moved #2C6A4F ->
  // #006C49 in the 21 Aug retune that put all six inks on one lightness; the
  // value is hardcoded so a palette change stays a deliberate edit.
  expect(theme.palette.primary.main).toBe('#006C49');
  expect(theme.palette.background.default).toBe('#EFF1EC');
  expect(theme.shape.borderRadius).toBe(7);
  // the primary action must be the heaviest object in its region -- the moss
  // fill, never the pale tint
  expect(theme.components.MuiButton.styleOverrides.containedPrimary.backgroundColor).toBe('#006C49');
  // shadows must stay restrained -- no 25px monsters
  expect(theme.shadows[5]).toContain('12px 32px');
  // motion: entering longer than exiting, per NN/g
  expect(parseInt(motion.enter, 10)).toBeGreaterThan(parseInt(motion.exit, 10));
  expect(parseInt(motion.overlayEnter, 10)).toBeGreaterThan(parseInt(motion.overlayExit, 10));
  // no transition:all anywhere in the component overrides
  expect(JSON.stringify(theme.components)).not.toMatch(/transition":"all|transition: *all/);
  expect(surfaces.sunken).toBe('#E6E9E2');
  expect(tabular.fontVariantNumeric).toBe('tabular-nums');
});

test('no dark anchor anywhere -- the owner rejected one', () => {
  // there is no inverse surface to reach for
  expect(surfaces.inverse).toBeUndefined();
  // and no surface is dark: every one sits above 90% relative luminance
  const luminance = (hexColour) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hexColour.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  [surfaces.canvas, surfaces.surface, surfaces.sunken].forEach((s) => {
    expect(luminance(s)).toBeGreaterThan(0.7);
  });
});

test('six inks, each with a distinct meaning', () => {
  const names = Object.keys(inks);
  expect(names).toHaveLength(6);
  const meanings = names.map((n) => inks[n].means);
  expect(new Set(meanings).size).toBe(6);
  const fills = names.map((n) => inks[n].fill);
  expect(new Set(fills).size).toBe(6);
});

test('every ink is legible as text on every ground it can land on', () => {
  const luminance = (hexColour) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hexColour.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // This is the guard that caught amber, and then caught ochre and clay. The
  // `text` variant of an ink must clear AA on all three surfaces AND on the
  // ink's own tint, which is the chip ground.
  Object.entries(inks).forEach(([name, ink]) => {
    [surfaces.canvas, surfaces.surface, surfaces.sunken, ink.tint].forEach((ground) => {
      expect({ name, ground, ratio: ratio(ink.text, ground) }).toEqual(
        expect.objectContaining({ ratio: expect.any(Number) }),
      );
      expect(ratio(ink.text, ground)).toBeGreaterThanOrEqual(4.5);
    });
  });

  // There is deliberately no white-on-fill assertion here, and it is not an
  // oversight. White is lighter than bone, so ratio(ink, white) is always at
  // least ratio(ink, bone) -- the loop above already implies it, and a check
  // that cannot fail independently reads as coverage without being any. The
  // line this replaced compared moss against '#F3F8F5', a ground this module
  // does not paint, and could not have failed either. The white-glyph decision
  // that CAN fail is the NEUTRAL badge (#98A199, ~2.0 on white), and it lives
  // with the component that makes it: CSRDashboard's badgeCarriesWhite.
});

test('every ink carries a chroma accent that clears 3:1 on every ground', () => {
  const luminance = (hexColour) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hexColour.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [luminance(a), luminance(b)];
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // THE ANTI-COLLAPSE GUARD. `design-system.md` says never to collapse a
  // variant back into the fill, and it happened anyway: the 21 Aug retune set
  // OCHRE_TEXT = OCHRE and CLAY_TEXT = CLAY, which is how the palette lost its
  // chroma and the page came to read as grey. This asserts the split exists.
  Object.entries(inks).forEach(([name, ink]) => {
    expect({ name, accent: ink.accent, fill: ink.fill }).toEqual(
      expect.objectContaining({ accent: expect.any(String) }),
    );
    expect(ink.accent).not.toBe(ink.fill);
    // and it runs the intended way: the accent is the LIGHTER of the two, or
    // the split would be two darks and buy nothing.
    expect(luminance(ink.accent)).toBeGreaterThan(luminance(ink.fill));
  });

  // A spine, a bar or a progress fill is a UI boundary that carries meaning,
  // so 3:1 is its bar. It must clear it on the DARKEST ground it can land on —
  // a bar sits in a `sunken` track, so bone alone would not have caught it.
  Object.entries(inks).forEach(([name, ink]) => {
    [surfaces.canvas, surfaces.surface, surfaces.sunken].forEach((ground) => {
      expect({ name, ground, ratio: ratio(ink.accent, ground) }).toEqual(
        expect.objectContaining({ ratio: expect.any(Number) }),
      );
      expect(ratio(ink.accent, ground)).toBeGreaterThanOrEqual(3);
    });
  });

  // The accents are shape colours and must never become grounds for white
  // text. Stated as a real measurement rather than a comment: every one of
  // them FAILS white at AA, which is exactly why `fill` still exists.
  Object.entries(inks).forEach(([name, ink]) => {
    expect({ name, ratio: ratio(ink.accent, '#FFFFFF') }).toEqual(
      expect.objectContaining({ ratio: expect.any(Number) }),
    );
    expect(ratio(ink.accent, '#FFFFFF')).toBeLessThan(4.5);
  });
});

test('entrance motion is capped, unsprung, and off under reduced motion', () => {
  // A stagger with no ceiling makes the last row of a long list wait for a
  // decoration. 40ms/item to a 400ms cap is the UDS grid preset.
  expect(reveal(0).animationDelay).toBe('0ms');
  expect(reveal(3).animationDelay).toBe('120ms');
  expect(reveal(40).animationDelay).toBe('400ms');
  // No spring anywhere. A bounce curve is exactly one thing: a cubic-bezier
  // whose y control points leave the 0..1 box, which is what makes the value
  // overshoot its target and come back. Checking the string for a minus sign
  // does not work -- "cubic-bezier" has one -- so the points are parsed.
  expect(reveal(0).animation).toContain(motion.easeOut);
  const ys = motion.easeOut
    .replace(/^cubic-bezier\(|\)$/g, '')
    .split(',')
    .map(Number)
    .filter((_, i) => i % 2 === 1);
  expect(ys).toHaveLength(2);
  ys.forEach((y) => {
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(1);
  });
  // `both` or the tile flashes at full opacity for a frame before its delay.
  expect(reveal(2).animation).toContain('both');
  expect(reveal(0)['@media (prefers-reduced-motion: reduce)'].animation).toBe('none');
});

test('money is set in the serif, its unit in the sans', () => {
  expect(figure.hero.fontFamily).toBe(fonts.serif);
  expect(figure.unit.fontFamily).toBe(fonts.sans);
  // a figure reads about three times its label
  const heroPx = parseFloat(figure.hero.fontSize) * 16;
  const unitPx = parseFloat(figure.unit.fontSize) * 16;
  expect(heroPx / unitPx).toBeGreaterThan(3);
  // every figure style is tabular -- a rupee value must not change width
  [figure.hero, figure.large, figure.row].forEach((f) => {
    expect(f.fontVariantNumeric).toBe('tabular-nums');
  });
});
