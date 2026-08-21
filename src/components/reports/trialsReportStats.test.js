// Regression tests for "#10 / TC-RPT-04 — the Trials Report summary cards
// ignore the filters".
//
// Measured live on 2026-08-21: with the search box set to "Kota" the detail
// table went from 2 projects to 1 and the month matrix followed it down, while
// PROJECTS / TRIAL CITIES / ASSIGNED / UNASSIGNED stayed frozen at 2 / 2 / 1 / 1.
// The cards head a view where everything below them is filtered, so a frozen
// card is read as the filtered total and is simply wrong.

import fs from 'fs';
import path from 'path';
import { computeStats } from './trialsReportStats';

const row = (over = {}) => ({
  projectName: 'IKF Talent Hunt',
  city: 'Kota',
  assigned: true,
  ...over,
});

// The shape of the live measurement: two projects, one trial city each, one of
// them with a REP.
const ALL_ROWS = [
  row({ projectName: 'IKF Talent Hunt', city: 'Kota', assigned: true }),
  row({ projectName: 'Grassroot Scouting', city: 'Mathura', assigned: false }),
];
const KOTA_ROWS = ALL_ROWS.filter((r) => r.city === 'Kota');

describe('computeStats', () => {
  test('THE REPORTED BUG: the filtered set gives different counts to the full set', () => {
    // If these two ever agree the test is meaningless, so assert they differ
    // as well as asserting each value.
    const all = computeStats(ALL_ROWS);
    const kota = computeStats(KOTA_ROWS);

    expect(all).toEqual({ projects: 2, cities: 2, assigned: 1, unassigned: 1 });
    expect(kota).toEqual({ projects: 1, cities: 1, assigned: 1, unassigned: 0 });
    expect(kota).not.toEqual(all);
  });

  test('assigned and unassigned split the rows exactly', () => {
    const rows = [
      row({ assigned: true }),
      row({ assigned: true }),
      row({ assigned: false }),
    ];
    const s = computeStats(rows);
    expect(s.assigned).toBe(2);
    expect(s.unassigned).toBe(1);
    expect(s.assigned + s.unassigned).toBe(s.cities);
  });

  test('a row with no REP counts as unassigned', () => {
    // `assigned` is set on the row as reps.length > 0, so the falsy cases the
    // join can produce all have to land on the unassigned side.
    const s = computeStats([
      row({ assigned: false, reps: [] }),
      row({ assigned: undefined }),
    ]);
    expect(s.assigned).toBe(0);
    expect(s.unassigned).toBe(2);
  });

  test('projects counts distinct project names, not rows', () => {
    const s = computeStats([
      row({ projectName: 'A', city: 'Kota' }),
      row({ projectName: 'A', city: 'Mathura' }),
      row({ projectName: 'B', city: 'Jaipur' }),
    ]);
    expect(s.projects).toBe(2);
    expect(s.cities).toBe(3);
  });

  test('unnamed projects collapse to one bucket, matching the month matrix', () => {
    // rows() deliberately stores '' rather than the em-dash placeholder, and
    // the matrix groups those together. The card must agree with it.
    const s = computeStats([row({ projectName: '' }), row({ projectName: '' })]);
    expect(s.projects).toBe(1);
  });

  test('empty input gives zeroes, not NaN', () => {
    expect(computeStats([])).toEqual({
      projects: 0, cities: 0, assigned: 0, unassigned: 0,
    });
  });
});

// TrialsReport.jsx imports react-router-dom, which CRA's Jest resolver cannot
// load, so the component cannot be rendered or even imported here. computeStats
// alone cannot tell `computeStats(rows)` from `computeStats(filteredRows)` —
// which is precisely the bug. Reading the source is the only way to assert the
// wiring, so the fix itself stays covered.
describe('TrialsReport wiring', () => {
  const src = fs.readFileSync(path.join(__dirname, 'TrialsReport.jsx'), 'utf8');

  test('stats derives from filteredRows, not the unfiltered rows', () => {
    expect(src).toMatch(/computeStats\(filteredRows\)/);
    expect(src).not.toMatch(/computeStats\(rows\)/);
  });

  test('the stats useMemo depends on filteredRows', () => {
    // A correct call with a stale dependency array would freeze the cards
    // again for a different reason.
    const memo = src.match(/const stats = useMemo\([^;]*;/);
    expect(memo).not.toBeNull();
    expect(memo[0]).toContain('[filteredRows]');
  });

  test('the cards read from stats', () => {
    ['stats.projects', 'stats.cities', 'stats.assigned', 'stats.unassigned']
      .forEach((k) => expect(src).toContain(k));
  });
});
