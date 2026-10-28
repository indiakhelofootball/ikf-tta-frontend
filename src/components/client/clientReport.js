// The arithmetic behind the funder's Overview: how far through the grant we
// are, what happened in which month, and which places the programme reached.
// Pure functions over data the portal already fetches, so the page needs no new
// endpoint and every figure here can be tested without rendering anything.
//
// Nothing here sums across deliverables or units. Places and months count
// ACTIVITIES, which are one kind of thing.

import { toParts } from './clientFormat';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A strip longer than two years stops being readable at a glance; such a grant
// shows its last 24 months.
const MAX_MONTHS = 24;

const dayNumber = (p) => Math.floor(Date.UTC(p.y, p.mo, p.d) / 86400000);
const todayParts = (today) => toParts(today || new Date());

export const activityDate = (a) => a?.startDate || a?.date || a?.endDate || null;

// Where today sits in the grant: { state: 'running', day, total } inside the
// period, 'upcoming' before it, 'ended' after it, null without both dates.
export function grantProgress(start, end, today) {
  const s = toParts(start);
  const e = toParts(end);
  const t = todayParts(today);
  if (!s || !e || !t) return null;
  const total = dayNumber(e) - dayNumber(s) + 1;
  if (total < 1) return null;
  const day = dayNumber(t) - dayNumber(s) + 1;
  if (day < 1) return { state: 'upcoming', total };
  if (day > total) return { state: 'ended', total };
  return { state: 'running', day, total };
}

// '4 months' for a grant's length in days. Under two months a month count is
// too coarse to be true, so a short grant says its days.
export function grantLength(totalDays) {
  if (!totalDays || totalDays < 1) return '';
  if (totalDays < 60) return `${totalDays} day${totalDays === 1 ? '' : 's'}`;
  const months = Math.round(totalDays / 30.44);
  return `${months} month${months === 1 ? '' : 's'}`;
}

// Where the grant runs, from the cities ticked on it: one city with its state
// ('Ludhiana, Punjab'), several by name ('Pune, Wardha'), '' when none is ticked.
export function grantPlace(cities) {
  const named = (cities || []).filter((c) => c?.name);
  if (named.length === 1) return [named[0].name, named[0].state].filter(Boolean).join(', ');
  return named.map((c) => c.name).join(', ');
}

// ---- the Activities tab (28 Oct, design/portal-activities-2026-10-28.html) ----

const lastDayOf = (y, mo) => new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();

// The days an activity covers: its start, and its end when that is later.
function activitySpan(a) {
  const from = toParts(activityDate(a));
  if (!from) return null;
  const to = toParts(a?.endDate);
  return [from, to && dayNumber(to) >= dayNumber(from) ? to : from];
}

// Every month an activity ran in, as 'YYYY-MM', first to last.
export function activityMonths(a) {
  const span = activitySpan(a);
  if (!span) return [];
  const keys = [];
  for (let k = span[0].y * 12 + span[0].mo; k <= span[1].y * 12 + span[1].mo; k += 1) {
    keys.push(`${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}`);
  }
  return keys;
}

// 'January 2026' for '2026-01'.
export function monthName(key) {
  const [y, m] = String(key || '').split('-').map(Number);
  return y && m ? `${MONTH_NAMES[m - 1]} ${y}` : 'Date not set';
}

// The date as the card's block shows it: one day '27' over 'Dec', days of one
// month '2–26' over 'Dec', a whole month 'Mar' over '2026', several months
// 'Jan–Mar' over '2026'. Null when the activity has no date.
export function activityDateBlock(a) {
  const span = activitySpan(a);
  if (!span) return null;
  const [s, e] = span;
  if (dayNumber(s) === dayNumber(e)) return { top: String(s.d), bottom: MONTHS[s.mo] };
  if (s.y === e.y && s.mo === e.mo) {
    if (s.d === 1 && e.d === lastDayOf(e.y, e.mo)) return { top: MONTHS[s.mo], bottom: String(s.y) };
    return { top: `${s.d}–${e.d}`, bottom: MONTHS[s.mo] };
  }
  return {
    top: `${MONTHS[s.mo]}–${MONTHS[e.mo]}`,
    bottom: s.y === e.y ? String(s.y) : `${s.y}–${String(e.y).slice(-2)}`,
  };
}

// The month picker: one entry per month of the grant (the activities' own
// months when the grant has no dates), with how many activities ran in it and
// how many began in it, so a month of only running work reads "2 ongoing".
export function monthPicker(start, end, activities) {
  return monthStrip(start, end, activities).map((m) => ({
    key: m.key,
    short: `${m.label} ${m.year}`,
    count: m.count,
    started: (activities || []).filter((a) => activityMonths(a)[0] === m.key).length,
  }));
}

// The months of the Activities tab. With no month picked, each activity sits
// once, under the month it began, and every later month it ran through names
// it as continuing, so a month of only running work is not missing. With a
// month picked, everything that ran in that month is listed.
export function activityMonthBlocks(list, { month = null, newestFirst = false } = {}) {
  const items = list || [];
  const byStart = (x, y) => {
    const px = toParts(activityDate(x));
    const py = toParts(activityDate(y));
    if (!px && !py) return 0;
    if (!px) return 1;
    if (!py) return -1;
    const d = dayNumber(px) - dayNumber(py);
    return newestFirst ? -d : d;
  };
  if (month) {
    const inMonth = items.filter((a) => activityMonths(a).includes(month)).sort(byStart);
    return inMonth.length ? [{ key: month, label: monthName(month), items: inMonth, continuing: [] }] : [];
  }
  const startOf = (a) => activityMonths(a)[0] || '';
  const keys = [...new Set(items.flatMap(activityMonths))].sort();
  if (newestFirst) keys.reverse();
  const blocks = keys.map((k) => ({
    key: k,
    label: monthName(k),
    items: items.filter((a) => startOf(a) === k).sort(byStart),
    continuing: items.filter((a) => startOf(a) !== k && activityMonths(a).includes(k)).sort(byStart),
  }));
  const undated = items.filter((a) => !startOf(a));
  if (undated.length) blocks.push({ key: '', label: 'Date not set', items: undated, continuing: [] });
  return blocks;
}

const URL_LINE = /^https?:\/\/\S+$/;
const LABELLED_LINK = /^(.{1,80}?)\s*[:–—-]\s*(https?:\/\/\S+)$/;
const isLinkLine = (line) => URL_LINE.test(line) || LABELLED_LINK.test(line);

// An activity's description split into its words and its links. A line that is
// only a link ("Reel: https://…", or a bare address) becomes a named link; a
// short line heading a run of bare links ("Promotional videos") names them. A
// link inside a sentence stays in the sentence. Nothing else is dropped.
export function activityText(description) {
  const lines = String(description || '').split('\n').map((l) => l.trim());
  const keep = [];
  const links = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const labelled = line.match(LABELLED_LINK);
    if (labelled) { links.push({ label: labelled[1].trim(), href: labelled[2] }); continue; }
    if (URL_LINE.test(line)) { links.push({ label: null, href: line }); continue; }
    let j = i + 1;
    while (j < lines.length && isLinkLine(lines[j])) j += 1;
    const heads = line && line.length <= 40 && !/[.!?:]$/.test(line) && j > i + 1;
    if (heads) {
      const bare = lines.slice(i + 1, j).filter((l) => URL_LINE.test(l));
      let n = 0;
      lines.slice(i + 1, j).forEach((l) => {
        const lab = l.match(LABELLED_LINK);
        if (lab) { links.push({ label: lab[1].trim(), href: lab[2] }); return; }
        n += 1;
        links.push({ label: bare.length > 1 ? `${line} ${n}` : line, href: l });
      });
      i = j - 1;
      continue;
    }
    keep.push(line);
  }
  const text = keep.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text, links };
}

// One cell per calendar month of the grant, with the number of activities that
// started in it. Without grant dates the strip spans the activities themselves.
export function monthStrip(start, end, activities, today) {
  // An activity with an end date counts in every month it runs, so a
  // Jan-Mar training does not leave February looking empty.
  const spans = (activities || []).map((a) => {
    const from = toParts(activityDate(a));
    if (!from) return null;
    const to = toParts(a.endDate);
    return [from, to && dayNumber(to) >= dayNumber(from) ? to : from];
  }).filter(Boolean);
  const dated = spans.map(([from]) => from);
  let s = toParts(start);
  let e = toParts(end);
  if (!s || !e) {
    if (dated.length === 0) return [];
    const sorted = [...dated].sort((a, b) => dayNumber(a) - dayNumber(b));
    s = s || sorted[0];
    e = e || sorted[sorted.length - 1];
  }
  const first = s.y * 12 + s.mo;
  const last = e.y * 12 + e.mo;
  if (last < first) return [];
  const from = Math.max(first, last - MAX_MONTHS + 1);
  const t = todayParts(today);
  const now = t ? t.y * 12 + t.mo : null;

  const counts = new Map();
  spans.forEach(([p, q]) => {
    for (let k = p.y * 12 + p.mo; k <= q.y * 12 + q.mo; k += 1) {
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  });

  const cells = [];
  for (let k = from; k <= last; k += 1) {
    const y = Math.floor(k / 12);
    const mo = k % 12;
    cells.push({
      key: `${y}-${String(mo + 1).padStart(2, '0')}`,
      label: MONTHS[mo],
      year: y,
      count: counts.get(k) || 0,
      state: now == null ? 'past' : k < now ? 'past' : k === now ? 'now' : 'ahead',
    });
  }
  return cells;
}

// The places activities were held, most visited first. Spelling differences in
// case and spacing ('gurugram ', 'Gurugram') are one place; the first spelling
// seen is the one shown.
export function placesReached(activities) {
  const byKey = new Map();
  (activities || []).forEach((a) => {
    // D-019: the grant city the activity names, else its free-text location.
    const name = String(a?.city || a?.location || '').replace(/\s+/g, ' ').trim();
    if (!name) return;
    const key = name.toLowerCase();
    const when = toParts(activityDate(a));
    const prev = byKey.get(key) || { name, count: 0, latest: null, latestDay: -Infinity };
    prev.count += 1;
    if (when && dayNumber(when) > prev.latestDay) {
      prev.latestDay = dayNumber(when);
      prev.latest = activityDate(a);
    }
    byKey.set(key, prev);
  });
  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || b.latestDay - a.latestDay || a.name.localeCompare(b.name))
    .map(({ name, count, latest }) => ({ name, count, latest }));
}

// Most recent first, undated last.
export function latestFirst(items, dateOf) {
  return [...(items || [])].sort((a, b) => {
    const pa = toParts(dateOf(a));
    const pb = toParts(dateOf(b));
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    return dayNumber(pb) - dayNumber(pa);
  });
}

// D-019: where an activity was, as the funder reads it: its city, then the
// venue text when that says something the city does not.
export function activityPlace(a) {
  const city = String(a?.city || '').trim();
  const loc = String(a?.location || '').trim();
  if (!city) return loc;
  if (!loc || loc.toLowerCase() === city.toLowerCase()) return city;
  return `${city}, ${loc}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

// Items grouped by the month of their date, months and items oldest first,
// undated ones last: the order a report reads in.
export function byMonth(items, dateOf) {
  const groups = new Map();
  (items || []).forEach((item) => {
    const p = toParts(dateOf(item));
    const key = p ? `${p.y}-${String(p.mo + 1).padStart(2, '0')}` : '';
    if (!groups.has(key)) {
      groups.set(key, { key, label: p ? `${MONTH_NAMES[p.mo]} ${p.y}` : 'Date not set', items: [] });
    }
    groups.get(key).items.push(item);
  });
  const oldestFirst = (list) => [...latestFirst(list, dateOf)].reverse()
    .sort((a, b) => (toParts(dateOf(a)) ? 0 : 1) - (toParts(dateOf(b)) ? 0 : 1));
  return [...groups.values()]
    .sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.key.localeCompare(b.key)))
    .map((g) => ({ ...g, items: oldestFirst(g.items) }));
}

// The date printed on a document, as an ISO day to sort by: "30 March 2026",
// "December 2025" (its first day) and "FY 2025-26" (1 April, the year's start).
export function documentDateKey(text) {
  const t = String(text || '').trim();
  const fy = t.match(/^FY\s*(\d{4})/i);
  if (fy) return `${fy[1]}-04-01`;
  const m = t.match(/^(?:(\d{1,2})\s+)?([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mo = MONTH_NAMES.findIndex((n) => n.toLowerCase().startsWith(m[2].toLowerCase().slice(0, 3)));
    if (mo >= 0) return `${m[3]}-${String(mo + 1).padStart(2, '0')}-${String(m[1] || 1).padStart(2, '0')}`;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
}

// Reports by the date on the document, falling back to the day it was uploaded.
export const reportDate = (r) => documentDateKey(r?.documentDate) || r?.createdAt || null;
