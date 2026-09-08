import { assignSlipRows, CONTENT_ROWS } from './courierSlipRows';

const item = (name, quantity) => ({ name, quantity });

describe('an item only claims a tile when its name IS the canonical one', () => {
  test('the six canonical items produce the original six-tile slip', () => {
    const rows = assignSlipRows([
      item('Volunteer Tshirts', 3),
      item('Banners', 2),
      item('Matchsheet', 10),
      item('Scout Dockets', 4),
      item('Numbered Bibs Orange', 20),
      item('Numbered Bibs Green', 20),
    ]);
    expect(rows.map((r) => r.tile)).toEqual(CONTENT_ROWS.map((r) => r.tile));
    expect(rows.every((r) => !('text' in r))).toBe(true);
  });

  test('case and surrounding space still match', () => {
    const rows = assignSlipRows([item('  BANNERS  ', 5)]);
    expect(rows).toEqual([{ tile: 'ban', qty: 5 }]);
  });

  test('tiles print in slip order, not the order the items arrived', () => {
    const rows = assignSlipRows([item('Matchsheet', 1), item('Banners', 2)]);
    expect(rows.map((r) => r.tile)).toEqual(['ban', 'mat']);
  });
});

describe('CR-2026-0051: a near-miss name no longer steals the artwork', () => {
  // Production shipment: "Naari Shakti Banner" and no plain "Banners". The old
  // keyword pass gave it the BANNERS tile, so the slip printed a name nobody
  // had typed and never named the item that was actually sent.
  test('it prints under its own name instead of the BANNERS tile', () => {
    const rows = assignSlipRows([item('Naari Shakti Banner', 8)]);
    expect(rows).toEqual([{ text: 'Naari Shakti Banner', qty: 8 }]);
  });

  test('the real Banners item still gets the tile when both are present', () => {
    const rows = assignSlipRows([item('Naari Shakti Banner', 8), item('Banners', 2)]);
    expect(rows).toContainEqual({ tile: 'ban', qty: 2 });
    expect(rows).toContainEqual({ text: 'Naari Shakti Banner', qty: 8 });
  });

  test('other near-misses print their own names too', () => {
    const rows = assignSlipRows([
      item('School Banners Kit', 1),
      item('Volunteer Caps', 2),
      item('Scouting Notes', 3),
    ]);
    expect(rows.map((r) => r.text)).toEqual([
      'School Banners Kit', 'Volunteer Caps', 'Scouting Notes',
    ]);
  });
});

describe('nothing is dropped', () => {
  test('every item reaches the slip, tiled or as text', () => {
    const items = [
      item('Banners', 2), item('Naari Shakti Banner', 8),
      item('Matchsheet', 1), item('Corner Flags', 4), item('Water Cans', 6),
    ];
    const rows = assignSlipRows(items);
    expect(rows).toHaveLength(items.length);
  });

  test('two items with the same canonical name: one tiles, the other prints', () => {
    const rows = assignSlipRows([item('Banners', 2), item('Banners', 3)]);
    expect(rows).toEqual([{ tile: 'ban', qty: 2 }, { text: 'Banners', qty: 3 }]);
  });

  test('empty and malformed input do not throw', () => {
    expect(assignSlipRows([])).toEqual([]);
    expect(assignSlipRows(undefined)).toEqual([]);
    expect(assignSlipRows([{ quantity: 1 }])).toEqual([{ text: '', qty: 1 }]);
  });
});
