import { grantProgress, monthStrip, placesReached, latestFirst, activityDate, activityPlace } from './clientReport';

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

describe('D-019: an activity place leads with its grant city', () => {
  test('places group by city when one is named', () => {
    const places = placesReached([
      { city: 'Pune', location: 'Balewadi', startDate: '2026-05-01' },
      { city: 'Pune', location: 'Shivaji Nagar', startDate: '2026-05-03' },
      { location: 'Nagpur', startDate: '2026-05-02' },
    ]);
    expect(places.map((p) => [p.name, p.count])).toEqual([['Pune', 2], ['Nagpur', 1]]);
  });

  test('city, then venue, without repeating the city', () => {
    expect(activityPlace({ city: 'Pune', location: 'Balewadi' })).toBe('Pune, Balewadi');
    expect(activityPlace({ city: 'Pune', location: 'pune' })).toBe('Pune');
    expect(activityPlace({ city: '', location: 'Bhilai' })).toBe('Bhilai');
    expect(activityPlace({})).toBe('');
  });
});

test('an activity that runs over several months counts in each of them', () => {
  const acts = [
    { startDate: '2026-01-01', endDate: '2026-03-31' },
    { startDate: '2026-03-01', endDate: '2026-03-31' },
    { date: '2025-12-27' },
  ];
  const cells = monthStrip('2025-12-02', '2026-03-31', acts, '2026-10-27');
  expect(cells.map((c) => [c.key, c.count])).toEqual([
    ['2025-12', 1], ['2026-01', 1], ['2026-02', 1], ['2026-03', 2],
  ]);
});

test('an end date before the start counts the start month only', () => {
  const cells = monthStrip('2026-01-01', '2026-03-31', [{ startDate: '2026-02-10', endDate: '2026-01-05' }], '2026-10-27');
  expect(cells.map((c) => c.count)).toEqual([0, 1, 0]);
});

import { byMonth, documentDateKey, reportDate } from './clientReport';

test('byMonth puts months and their items oldest first, undated last', () => {
  const items = [
    { id: 'mar', date: '2026-03-01' }, { id: 'none' }, { id: 'dec28', date: '2025-12-28' },
    { id: 'jan', startDate: '2026-01-01' }, { id: 'dec2', startDate: '2025-12-02' },
  ];
  const groups = byMonth(items, (x) => x.startDate || x.date);
  expect(groups.map((g) => [g.label, g.items.map((x) => x.id)])).toEqual([
    ['December 2025', ['dec2', 'dec28']],
    ['January 2026', ['jan']],
    ['March 2026', ['mar']],
    ['Date not set', ['none']],
  ]);
});

test('a document dates itself by day, month or financial year', () => {
  expect(documentDateKey('30 March 2026')).toBe('2026-03-30');
  expect(documentDateKey('December 2025')).toBe('2025-12-01');
  expect(documentDateKey('FY 2025-26')).toBe('2025-04-01');
  expect(documentDateKey('')).toBeNull();
  expect(documentDateKey('soon')).toBeNull();
  expect(reportDate({ documentDate: '', createdAt: '2026-10-26T10:00:00Z' })).toBe('2026-10-26T10:00:00Z');
});
