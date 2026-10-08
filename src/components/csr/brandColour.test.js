import { normaliseHex, contrastOnWhite, isTooLightForText } from './brandColour';

describe('normaliseHex', () => {
  test('accepts six hex digits with or without #, and upper-cases them', () => {
    expect(normaliseHex('#2c6a4f')).toBe('#2C6A4F');
    expect(normaliseHex('2c6a4f')).toBe('#2C6A4F');
    expect(normaliseHex('  #0B5FFF ')).toBe('#0B5FFF');
  });

  test('rejects anything that is not exactly six hex digits', () => {
    ['blue', '#12', '#123', '#1234567', '#GGGGGG', '##123456', '', null, undefined]
      .forEach((v) => expect(normaliseHex(v)).toBeNull());
  });
});

describe('contrast against white', () => {
  test('matches the WCAG figures at the ends and in the middle', () => {
    expect(contrastOnWhite('#000000')).toBeCloseTo(21, 5);
    expect(contrastOnWhite('#FFFFFF')).toBeCloseTo(1, 5);
    // Measured values quoted in .ai/design-system.md.
    expect(contrastOnWhite('#486AFF')).toBeCloseTo(4.39, 2);
    expect(contrastOnWhite('#808080')).toBeCloseTo(3.95, 2);
  });

  test('flags a colour under 4.5 as too light, and nothing invalid', () => {
    expect(isTooLightForText('#486AFF')).toBe(true);
    expect(isTooLightForText('#2C6A4F')).toBe(false);
    expect(isTooLightForText('blue')).toBe(false);
    expect(isTooLightForText('')).toBe(false);
  });
});
