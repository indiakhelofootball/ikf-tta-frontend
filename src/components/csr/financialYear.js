// Indian financial years run 1 April to 31 March and are written "2025-26",
// the shape the server stores and the funder portal groups by.

const startYearOf = (iso) => {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso || '');
  if (!m) return null;
  const year = Number(m[1]);
  return Number(m[2]) >= 4 ? year : year - 1;
};

export const fyFromStartYear = (y) => `${y}-${String(y + 1).slice(-2)}`;

export const fyOf = (iso) => {
  const y = startYearOf(iso);
  return y == null ? '' : fyFromStartYear(y);
};

const todayIso = (now) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const fyLabel = (fy) => `FY ${fy}`;

// The year holding the anchor, three before it and two after. A value already
// held that falls outside that window is kept as an option of its own.
export const fyOptions = (anchorIso, keep = '', now = new Date()) => {
  const base = startYearOf(anchorIso) ?? startYearOf(todayIso(now));
  const list = [];
  for (let y = base - 3; y <= base + 2; y += 1) list.push(fyFromStartYear(y));
  if (keep && !list.includes(keep)) list.push(keep);
  return list.sort();
};
