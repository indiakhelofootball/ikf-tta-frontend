import { grantProgress, monthStrip, placesReached, latestFirst, activityDate } from './clientReport';

const TODAY = '2026-10-09';

test('grant progress counts calendar days, inclusive of both ends', () => {
  expect(grantProgress('2026-09-01', '2027-03-31', TODAY)).toEqual({ state: 'running', day: 39, total: 212 });
  expect(grantProgress('2026-10-09', '2026-10-09', TODAY)).toEqual({ state: 'running', day: 1, total: 1 });
});

test('grant progress says upcoming or ended outside the period, and nothing without dates', () => {
  expect(grantProgress('2026-11-01', '2027-03-31', TODAY)).toEqual({ state: 'upcoming', total: 151 });
  expect(grantProgress('2026-01-01', '2026-03-31', TODAY)).toEqual({ state: 'ended', total: 90 });
  expect(grantProgress(null, '2027-03-31', TODAY)).toBeNull();
  expect(grantProgress('2027-03-31', '2026-01-01', TODAY)).toBeNull();
});

test('the month strip has one cell per grant month, counts activities by start, and marks now', () => {
  const acts = [
    { startDate: '2026-09-14' }, { startDate: '2026-09-21' }, { date: '2026-09-28' },
    { startDate: '2026-10-04', endDate: '2026-10-05' },
  ];
  const cells = monthStrip('2026-09-01', '2027-03-31', acts, TODAY);
  expect(cells.map((c) => c.label)).toEqual(['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']);
  expect(cells.map((c) => c.count)).toEqual([3, 1, 0, 0, 0, 0, 0]);
  expect(cells.map((c) => c.state)).toEqual(['past', 'now', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
});

test('without grant dates the strip spans the activities, and is empty with nothing dated', () => {
  const cells = monthStrip(null, null, [{ startDate: '2026-08-02' }, { startDate: '2026-10-01' }], TODAY);
  expect(cells.map((c) => c.key)).toEqual(['2026-08', '2026-09', '2026-10']);
  expect(monthStrip(null, null, [{ title: 'undated' }], TODAY)).toEqual([]);
});

test('a very long grant shows its last 24 months', () => {
  const cells = monthStrip('2020-01-01', '2026-12-31', [], TODAY);
  expect(cells).toHaveLength(24);
  expect(cells[0].key).toBe('2025-01');
  expect(cells[23].key).toBe('2026-12');
});

test('places merge spelling differences, sort by visits, and keep the latest date', () => {
  const places = placesReached([
    { location: 'Gurugram', startDate: '2026-09-14' },
    { location: ' gurugram ', startDate: '2026-10-04' },
    { location: 'Faridabad', startDate: '2026-09-28' },
    { location: '', startDate: '2026-09-01' },
    { startDate: '2026-09-02' },
  ]);
  expect(places).toEqual([
    { name: 'Gurugram', count: 2, latest: '2026-10-04' },
    { name: 'Faridabad', count: 1, latest: '2026-09-28' },
  ]);
});

test('latest first puts undated items last', () => {
  const out = latestFirst([{ id: 1 }, { id: 2, d: '2026-09-01' }, { id: 3, d: '2026-10-01' }], (x) => x.d);
  expect(out.map((x) => x.id)).toEqual([3, 2, 1]);
});

test('an activity is dated by its start, then its single date, then its end', () => {
  expect(activityDate({ startDate: 'a', date: 'b', endDate: 'c' })).toBe('a');
  expect(activityDate({ date: 'b', endDate: 'c' })).toBe('b');
  expect(activityDate({ endDate: 'c' })).toBe('c');
  expect(activityDate({})).toBeNull();
});
