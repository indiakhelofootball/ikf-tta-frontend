// A funder's brand colour is typed by hand and lands on the funder portal as a
// CSS value, so 'blue' or '#12' would save and then break that page. Only
// #RRGGBB is accepted; the '#' may be left off and case does not matter.
export function normaliseHex(value) {
  const raw = String(value ?? '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : null;
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

// WCAG 2 contrast of the colour against white. null for an invalid colour.
export function contrastOnWhite(value) {
  const hex = normaliseHex(value);
  if (!hex) return null;
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.2126 * channel((n >> 16) & 255)
    + 0.7152 * channel((n >> 8) & 255)
    + 0.0722 * channel(n & 255);
  return 1.05 / (lum + 0.05);
}

export function isTooLightForText(value) {
  const ratio = contrastOnWhite(value);
  return ratio !== null && ratio < 4.5;
}
