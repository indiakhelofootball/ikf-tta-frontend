// How the funder's portal writes dates, counts and money. One module, so the
// portal cannot show '2026-04-01' in one tab, '8/10/2026' in another and
// '2026-10-08T07:05:25.027649Z' in a third — which is what it did.
//
// The funder is in India and reads Indian conventions: day before month, lakh
// and crore grouping (3,75,00,000, not 37,500,000), rupees without stray paise.

// Month names are spelled out here rather than taken from Intl. ICU's en-IN
// (and en-GB) abbreviates September as "Sept" while every other month gets
// three letters, and browsers ship different ICU versions — so the same date
// could read differently on the funder's laptop and phone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// A date-only value ('2026-04-01') is a calendar day, not an instant. Handing it
// to new Date() reads it as UTC midnight, which is the previous evening anywhere
// west of Greenwich — so it is split by hand. A full timestamp is an instant and
// is shown on the reader's own calendar.
export function toParts(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value.trim());
    if (m) {
      const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
      return { y, mo: mo - 1, d };
    }
  }
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return { y: dt.getFullYear(), mo: dt.getMonth(), d: dt.getDate() };
}

// '8 Oct 2026'. Anything unreadable comes back empty, never as 'Invalid Date'.
export function formatDate(value) {
  const p = toParts(value);
  return p ? `${p.d} ${MONTHS[p.mo]} ${p.y}` : '';
}

// '1 Apr 2026 – 31 Mar 2027'. A one-sided range says which side it has rather
// than printing a dangling dash.
export function formatRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return s === e ? s : `${s} – ${e}`;
  if (s) return `From ${s}`;
  if (e) return `Until ${e}`;
  return '';
}

// A count of things. Blank or unreadable is 0: a count the funder sees is
// never a dash.
export function formatCount(value) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Rupees. Whole rupees unless there are paise, then exactly two places — so
// 921000.00 off a DRF Decimal reads ₹9,21,000 and 1234.5 reads ₹1,234.50.
export function formatRupees(value) {
  const n = Number(value);
  const v = Number.isFinite(n) ? n : 0;
  const hasPaise = Math.round(Math.abs(v) * 100) % 100 !== 0;
  return `₹${v.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  })}`;
}
