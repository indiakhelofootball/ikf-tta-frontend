import theme, { motion, surfaces, tabular, inks, figure, fonts } from './ttaTheme';

test('theme constructs with the expected contract', () => {
  // the Ledger system: moss leads, on a bone ground
  expect(theme.palette.primary.main).toBe('#2C6A4F');
  expect(theme.palette.background.default).toBe('#EFF1EC');
  expect(theme.shape.borderRadius).toBe(7);
  // the primary action must be the heaviest object in its region -- the moss
  // fill, never the pale tint
  expect(theme.components.MuiButton.styleOverrides.containedPrimary.backgroundColor).toBe('#2C6A4F');
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

  // and white on the primary button
  expect(ratio('#2C6A4F', '#F3F8F5')).toBeGreaterThanOrEqual(4.5);
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
