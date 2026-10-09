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

// One cell per calendar month of the grant, with the number of activities that
// started in it. Without grant dates the strip spans the activities themselves.
export function monthStrip(start, end, activities, today) {
  const dated = (activities || []).map((a) => toParts(activityDate(a))).filter(Boolean);
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
  dated.forEach((p) => {
    const k = p.y * 12 + p.mo;
    counts.set(k, (counts.get(k) || 0) + 1);
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
    const name = String(a?.location || '').replace(/\s+/g, ' ').trim();
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
