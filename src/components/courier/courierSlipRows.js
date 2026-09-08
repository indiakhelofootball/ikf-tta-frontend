// Which shipment items claim the six pre-printed artwork tiles on the package
// slip, and which are drawn as live text.
//
// Extracted from courierSlipPdf.js so the rule can be tested without jsPDF, the
// same reason courierSlipText.js exists.
//
// THE RULE
//
// The six tiles are images from the source artwork. Each one has a word baked
// into it -- BANNERS, MATCHSHEET, and so on. Drawing a tile therefore PRINTS
// THAT WORD, whatever the item is actually called.
//
// So a tile may only be claimed by an item whose name is exactly the canonical
// one. Everything else is drawn as live text under the name the operator typed.
//
// WHAT THIS FIXES
//
// There used to be a second pass: if no item matched a tile exactly, any item
// whose name merely CONTAINED a keyword took it -- `(n) => n.includes('banner')`
// for the Banners tile. Measured on production shipment CR-2026-0051, which
// holds "Naari Shakti Banner x8" and no plain "Banners" item: the slip printed
// the standard BANNERS artwork with qty 08. Nothing vanished, but the person
// receiving the parcel read an item name that nobody had typed, and the item
// they were actually sent was not named anywhere on the page.
//
// The file already said this was the intent -- "a custom item can neither vanish
// from the slip nor steal a standard item's artwork" -- while the pass below it
// did exactly that. Same rule, two doors.
//
// A keyword-only match is, by definition, a name that differs from the canonical
// string (case and surrounding space are already normalised for the exact pass).
// So there is no keyword match that prints the right word, and the pass had no
// safe case to preserve.

const nameLower = (s) => String(s || '').toLowerCase();

// Canonical artwork rows, in the order they print on the slip.
export const CONTENT_ROWS = [
  { tile: 'vol', exact: 'volunteer tshirts' },
  { tile: 'ban', exact: 'banners' },
  { tile: 'mat', exact: 'matchsheet' },
  { tile: 'sco', exact: 'scout dockets' },
  { tile: 'bibo', exact: 'numbered bibs orange' },
  { tile: 'bibg', exact: 'numbered bibs green' },
];

/**
 * Split the shipment's items into what the slip draws.
 *
 * @returns {Array} rows in print order. A tiled row is `{ tile, qty }`; a text
 *                  row is `{ text, qty }` carrying the item's own name.
 */
export function assignSlipRows(items) {
  const list = Array.isArray(items) ? items : [];

  const claimed = new Set();
  const claims = new Map();
  CONTENT_ROWS.forEach((r) => {
    const it = list.find((i) => !claimed.has(i) && nameLower(i.name).trim() === r.exact);
    if (it) { claimed.add(it); claims.set(r.tile, it); }
  });

  const tiled = CONTENT_ROWS
    .filter((r) => claims.has(r.tile))
    .map((r) => ({ tile: r.tile, qty: Number(claims.get(r.tile).quantity) }));

  return [
    ...tiled,
    ...list.filter((i) => !claimed.has(i))
      .map((i) => ({ text: String(i.name || '').trim(), qty: Number(i.quantity) })),
  ];
}
