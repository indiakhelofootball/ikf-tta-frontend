// Text-fitting rules for the package slip, kept out of courierSlipPdf.js so they can
// be tested without jsPDF (and out of CourierManagementPage.jsx, which cannot be
// imported under Jest at all). Every function here takes a `measure(text, size, tc)`
// callback so the caller supplies the real font metrics from the live jsPDF document.
//
// The slip artwork is fixed and must not change: each rule below is written so that
// on an ordinary shipment it returns exactly what the previous inline code returned.

// Split a single over-wide word into chunks that each fit `maxW`.
// Only reached when one unbroken token is wider than the whole line — an ordinary
// address never gets here, so this cannot move a normal wrap point.
function breakWord(word, size, tc, maxW, measure) {
  const chunks = [];
  let cur = '';
  for (const ch of String(word)) {
    const next = cur + ch;
    if (cur && measure(next, size, tc) > maxW) {
      chunks.push(cur);
      cur = ch;
    } else {
      cur = next;
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

// Width-aware wrap honouring the active letter-spacing. Returns EVERY line — the
// caller decides what to do with an overflow, because silently dropping the tail of
// an address is how "Chembur East" shipped as "Chembur".
export function wrapTracked(text, size, tc, maxW, measure) {
  const lines = [];
  let cur = '';
  // A word wider than the line used to be accepted whole and printed straight across
  // the CONTENTS panel. Break it instead; a word that fits never takes this path.
  const start = (w) => {
    if (measure(w, size, tc) <= maxW) { cur = w; return; }
    const parts = breakWord(w, size, tc, maxW, measure);
    lines.push(...parts.slice(0, -1));
    cur = parts[parts.length - 1];
  };
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    if (!cur) { start(w); continue; }
    const t = `${cur} ${w}`;
    if (measure(t, size, tc) <= maxW) cur = t;
    else { lines.push(cur); start(w); }
  }
  if (cur) lines.push(cur);
  return lines;
}

// The five address slots on the artwork, in the order they print.
export const ADDR_SLOTS = 5;

// Largest size (stepping down from `size`) whose wrap fits `maxLines`, or null.
function fitLines(text, size, tc, maxW, maxLines, measure, minSize, step) {
  for (let s = size; s >= minSize - 1e-9; s -= step) {
    // Tracking is part of the type: shrink it with the size so the block keeps the
    // artwork's proportions instead of turning into loosely spaced small text.
    const lineTc = (tc * s) / size;
    const lines = wrapTracked(text, s, lineTc, maxW, measure);
    if (lines.length <= maxLines) return { size: s, tc: lineTc, lines };
  }
  return null;
}

/**
 * Lay the recipient address out over the fixed five slots.
 *
 * District and sub-area are collected from the REP city assignment and were being
 * dropped on the floor; they print between the street lines and the state, in
 * delivery order: street / sub-area / city / district / state.
 *
 * Five slots cannot always hold five fields plus a multi-line street address, so
 * the order of sacrifice is explicit rather than accidental:
 *   1. shrink the type (half-point steps) — a smaller line is fully recoverable;
 *   2. drop `district`, then `sub-area` — both are refinements of a city that the
 *      PIN code already pins down, and both are REPORTED in `dropped`;
 *   3. only then report `overflow`, meaning the printed address is incomplete.
 * The street address, city and state are never cut: losing "East" off a locality is
 * what put a parcel in the wrong part of Chembur.
 */
export function fitAddressBlock({
  address, subArea, city, district, state,
  size, tc, maxW, measure, minSize = 15, legibleSize = 18, step = 0.5, slots = ADDR_SLOTS,
}) {
  const clean = (v) => String(v || '').trim();
  const text = clean(address);
  const parts = { subArea: clean(subArea), city: clean(city), district: clean(district), state: clean(state) };

  // Fields the courier can still deliver without, in the order they are given up.
  const sacrificial = ['district', 'subArea'];
  const dropped = [];
  const tailOf = () => [parts.subArea, parts.city, parts.district, parts.state]
    .filter((v, i) => v && !dropped.includes(['subArea', 'city', 'district', 'state'][i]));

  if (!text) return { lines: tailOf().slice(0, slots), size, tc, overflow: false, dropped };

  // Squeezing the street address into one slot so that a district can keep its own
  // is the wrong trade: below `legibleSize` the block gives up a sacrificial field
  // instead of shrinking further. Whatever survives is reported in `dropped`.
  for (;;) {
    const tail = tailOf();
    const chosen = fitLines(text, size, tc, maxW, Math.max(1, slots - tail.length), measure, minSize, step);
    const next = sacrificial.find((k) => parts[k] && !dropped.includes(k));
    if (chosen && (chosen.size >= legibleSize || !next)) {
      return { lines: [...chosen.lines, ...tail], size: chosen.size, tc: chosen.tc, overflow: false, dropped };
    }
    if (!next) break;
    dropped.push(next);
  }

  // Nothing fits even at the floor with only city and state left: print what the
  // slots hold and let the caller warn. This is the only path that can cut a word.
  const tail = tailOf();
  const lineTc = (tc * minSize) / size;
  const lines = [...wrapTracked(text, minSize, lineTc, maxW, measure), ...tail];
  return { lines: lines.slice(0, slots), size: minSize, tc: lineTc, overflow: true, dropped };
}

/**
 * Largest size at or below `size` whose rendered width fits `maxW`.
 * Returns `size` unchanged whenever the text already fits, so a two-digit quantity
 * in its badge is byte-identical to before.
 */
export function fitTextSize(text, size, tc, maxW, measure, { minSize = 6, step = 0.25 } = {}) {
  let s = size;
  while (s > minSize && measure(String(text), s, (tc * s) / size) > maxW) s -= step;
  return s;
}

/**
 * Size for a QTY number so it stays inside its badge tile.
 *
 * A number that already fits the tile is left at exactly `size` — including the
 * four-digit case that sits a fraction inside it — so nothing an operator is likely
 * to print moves at all. Only a number that actually overprints the tile is shrunk,
 * and then to `padding` clear of both edges rather than to the edge itself.
 */
export function fitBadgeNumber(text, size, tileW, padding, measure) {
  if (measure(String(text), size, 0) <= tileW) return size;
  return fitTextSize(text, size, 0, tileW - padding * 2, measure);
}

// Operator-facing warning for a slip whose address block could not hold everything.
// Returns '' for an ordinary shipment, so the page shows nothing in the normal case.
export function slipAddressWarning({ addressOverflow, addressDropped } = {}) {
  const LABELS = { district: 'district', subArea: 'sub-area' };
  const names = (addressDropped || []).map((k) => LABELS[k] || k);
  const parts = [];
  if (addressOverflow) {
    parts.push('The address is too long for the slip and the printed one is cut short — shorten it on the REP city assignment and download again.');
  } else if (names.length) {
    parts.push(`The address filled the slip, so the ${names.join(' and ')} could not be printed.`);
  }
  return parts.join(' ');
}
