import {
  wrapTracked, fitAddressBlock, fitTextSize, fitBadgeNumber, slipAddressWarning,
} from './courierSlipText';

// Stand-in for jsPDF's metrics: proportional to size, plus the tracking between
// glyphs. The real widths come from Barlow at render time; the rules under test are
// width-driven, not font-driven, so a linear model exercises them exactly.
const measure = (s, size, tc) => s.length * size * 0.5 + Math.max(0, s.length - 1) * tc;

// The wrap this replaced, verbatim, so "unchanged on ordinary input" is a comparison
// against the old behaviour rather than against a value someone typed in.
const legacyWrap = (text, size, tc, maxW, maxLines) => {
  const lines = [];
  let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || measure(t, size, tc) <= maxW) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
};

const ADDR = 'Flat 402 Sai Krupa Apartments, Plot 214-B Sector 27-A, Behind Shivaji Maharaj Sports Complex, Near Gandhi Chowk Bus Depot, Vashi Naka Road, Chembur East';
const SIZE = 23.809, TC = 1.536, MAXW = 640;

describe('wrapTracked', () => {
  test('ordinary text wraps exactly where the old implementation wrapped', () => {
    for (const text of [
      'Flat 402 Sai Krupa Apartments, Plot 214-B',
      ADDR,
      'C/O Mahesh Traders Opposite Municipal School Ward 6',
    ]) {
      const got = wrapTracked(text, SIZE, TC, MAXW, measure);
      expect(got).toEqual(legacyWrap(text, SIZE, TC, MAXW, got.length));
    }
  });

  test('an unbroken token wider than the line is broken, not printed past the panel', () => {
    const token = 'Under-19-District-Level-Inter-School-Championship-Ground-Marking-Depot-Annexe-B';
    // The old wrap accepted it whole: one line, far wider than the box.
    expect(measure(legacyWrap(token, SIZE, TC, MAXW, 3)[0], SIZE, TC)).toBeGreaterThan(MAXW);

    const lines = wrapTracked(`Plot 9 ${token} Road`, SIZE, TC, MAXW, measure);
    lines.forEach((l) => expect(measure(l, SIZE, TC)).toBeLessThanOrEqual(MAXW));
    expect(lines.join('')).toContain(token.replace(/\s+/g, ''));
  });

  test('every character survives the wrap', () => {
    const lines = wrapTracked(ADDR, SIZE, TC, MAXW, measure);
    expect(lines.join(' ')).toBe(ADDR);
  });
});

describe('fitAddressBlock', () => {
  const call = (over) => fitAddressBlock({
    size: SIZE, tc: TC, maxW: MAXW, measure, ...over,
  });

  test('the ordinary shipment is untouched: artwork size, artwork tracking, no warning', () => {
    const r = call({
      address: 'Flat 402 Sai Krupa Apartments, Plot 214-B',
      city: 'Mumbai', state: 'Maharashtra',
    });
    expect(r.lines).toEqual(['Flat 402 Sai Krupa Apartments, Plot 214-B', 'Mumbai', 'Maharashtra']);
    expect(r.size).toBe(SIZE);
    expect(r.tc).toBe(TC);
    expect(r.overflow).toBe(false);
    expect(r.dropped).toEqual([]);
  });

  test('sub-area and district print, in delivery order, when there is room', () => {
    const r = call({
      address: 'Flat 402 Sai Krupa Apartments',
      subArea: 'Chembur East', city: 'Mumbai',
      district: 'Mumbai Suburban', state: 'Maharashtra',
    });
    expect(r.lines).toEqual([
      'Flat 402 Sai Krupa Apartments', 'Chembur East', 'Mumbai', 'Mumbai Suburban', 'Maharashtra',
    ]);
    expect(r.size).toBe(SIZE);
    expect(r.dropped).toEqual([]);
  });

  test('a long address keeps every word — this is the shipment that lost "East"', () => {
    const r = call({ address: ADDR, city: 'Mumbai', state: 'Maharashtra' });
    const street = r.lines.slice(0, r.lines.length - 2).join(' ');
    expect(street).toBe(ADDR);
    expect(street).toContain('Chembur East');
    expect(r.lines).toHaveLength(5);
    expect(r.size).toBeLessThan(SIZE);   // it fits by shrinking, not by cutting
    expect(r.overflow).toBe(false);
  });

  test('street, city and state outrank a district that will not fit', () => {
    const r = call({
      address: ADDR, subArea: 'Chembur East', city: 'Mumbai',
      district: 'Mumbai Suburban', state: 'Maharashtra',
    });
    expect(r.lines).toContain('Mumbai');
    expect(r.lines).toContain('Maharashtra');
    expect(r.lines.join(' ')).toContain(ADDR);
    expect(r.dropped).toContain('district');
    expect(r.size).toBeGreaterThanOrEqual(18);   // never shrunk below legibility to keep one
  });

  test('an address that cannot fit at any size reports overflow instead of failing silently', () => {
    const r = call({ address: ADDR.repeat(4), city: 'Mumbai', state: 'Maharashtra' });
    expect(r.overflow).toBe(true);
    expect(slipAddressWarning({ addressOverflow: r.overflow, addressDropped: r.dropped })).not.toBe('');
  });

  test('no address at all still prints the city and state', () => {
    const r = call({ address: '', city: 'Mumbai', state: 'Maharashtra' });
    expect(r.lines).toEqual(['Mumbai', 'Maharashtra']);
    expect(r.overflow).toBe(false);
  });
});

describe('fitTextSize', () => {
  test('a two-digit quantity keeps the artwork size exactly', () => {
    expect(fitTextSize('06', 17.02, 0, 36, measure)).toBe(17.02);
  });

  test('a five- or six-digit quantity is shrunk until it is inside the badge', () => {
    for (const q of ['12000', '100000']) {
      const s = fitTextSize(q, 17.02, 0, 36, measure);
      expect(s).toBeLessThan(17.02);
      expect(measure(q, s, 0)).toBeLessThanOrEqual(36);
    }
    // The unfixed call printed at full size and overflowed the 40pt badge tile.
    expect(measure('100000', 17.02, 0)).toBeGreaterThan(40);
  });
});

describe('fitBadgeNumber', () => {
  const TILE = 40, PAD = 2, SIZE_Q = 17.02;

  test('anything that already fits the badge tile keeps the artwork size exactly', () => {
    for (const q of ['06', '250', '9999']) {
      expect(measure(q, SIZE_Q, 0)).toBeLessThanOrEqual(TILE);
      expect(fitBadgeNumber(q, SIZE_Q, TILE, PAD, measure)).toBe(SIZE_Q);
    }
  });

  test('a number that would overprint the tile is brought inside it with clearance', () => {
    for (const q of ['12000', '100000']) {
      expect(measure(q, SIZE_Q, 0)).toBeGreaterThan(TILE);   // the defect, at the old size
      const s = fitBadgeNumber(q, SIZE_Q, TILE, PAD, measure);
      expect(s).toBeLessThan(SIZE_Q);
      expect(measure(q, s, 0)).toBeLessThanOrEqual(TILE - PAD * 2);
    }
  });
});

describe('slipAddressWarning', () => {
  test('says nothing about an ordinary slip', () => {
    expect(slipAddressWarning({ addressOverflow: false, addressDropped: [] })).toBe('');
    expect(slipAddressWarning()).toBe('');
  });

  test('names the fields that could not be printed', () => {
    expect(slipAddressWarning({ addressDropped: ['district', 'subArea'] }))
      .toContain('district and sub-area');
  });

  test('a cut address is reported as cut, not as a dropped field', () => {
    const msg = slipAddressWarning({ addressOverflow: true, addressDropped: ['district'] });
    expect(msg).toContain('cut short');
  });
});
