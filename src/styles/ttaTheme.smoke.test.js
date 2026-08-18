import theme, { motion, surfaces, tabular } from './ttaTheme';

test('theme constructs with the expected contract', () => {
  expect(theme.palette.primary.main).toBe('#A35905');
  expect(theme.palette.background.default).toBe('#F9FAFB');
  expect(theme.shape.borderRadius).toBe(8);
  // the defect cal.com exposed: the primary fill must not be the pale amber
  expect(theme.components.MuiButton.styleOverrides.containedPrimary.backgroundColor).toBe('#F59E0B');
  // shadows must stay restrained -- no 25px monsters
  expect(theme.shadows[5]).toContain('12px 32px');
  // motion: entering longer than exiting, per NN/g
  expect(parseInt(motion.enter, 10)).toBeGreaterThan(parseInt(motion.exit, 10));
  expect(parseInt(motion.overlayEnter, 10)).toBeGreaterThan(parseInt(motion.overlayExit, 10));
  // no transition:all anywhere in the component overrides
  expect(JSON.stringify(theme.components)).not.toMatch(/transition":"all|transition: *all/);
  expect(surfaces.sunken).toBe('#F1F5F9');
  expect(tabular.fontVariantNumeric).toBe('tabular-nums');
});
