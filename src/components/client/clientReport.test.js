import {
  grantProgress, grantLength, grantPlace, monthStrip, placesReached, latestFirst, activityDate, activityPlace,
  activityMonths, activityDateBlock, activityMonthBlocks, activityText, monthName, monthPicker,
} from './clientReport';

const TODAY = '2026-10-09';

describe('activities, month by month', () => {
  const promo = { id: 1, startDate: '2025-12-02', endDate: '2025-12-26' };
  const day1 = { id: 2, date: '2025-12-27' };
  const training = { id: 3, startDate: '2026-01-01', endDate: '2026-03-31' };
  const showcase = { id: 4, startDate: '2026-03-01', endDate: '2026-03-31' };
  const undated = { id: 5 };
  const all = [showcase, training, undated, day1, promo];

  test('an activity runs in every month from its start to its end', () => {
    expect(activityMonths(training)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(activityMonths(day1)).toEqual(['2025-12']);
    expect(activityMonths({ startDate: '2025-12-20', endDate: '2026-01-05' })).toEqual(['2025-12', '2026-01']);
    expect(activityMonths({ startDate: '2026-03-10', endDate: '2026-03-01' })).toEqual(['2026-03']);
    expect(activityMonths(undated)).toEqual([]);
  });

  test('the date block reads as a day, a run of days, a whole month or several months', () => {
    expect(activityDateBlock(day1)).toEqual({ top: '27', bottom: 'Dec' });
    expect(activityDateBlock(promo)).toEqual({ top: '2–26', bottom: 'Dec' });
    expect(activityDateBlock(showcase)).toEqual({ top: 'Mar', bottom: '2026' });
    expect(activityDateBlock(training)).toEqual({ top: 'Jan–Mar', bottom: '2026' });
    expect(activityDateBlock({ startDate: '2025-12-20', endDate: '2026-01-05' })).toEqual({ top: 'Dec–Jan', bottom: '2025–26' });
    expect(activityDateBlock(undated)).toBeNull();
  });

  test('with no month picked, each activity sits once under its start, and later months say it continued', () => {
    const blocks = activityMonthBlocks(all);
    expect(blocks.map((b) => b.label)).toEqual(['December 2025', 'January 2026', 'February 2026', 'March 2026', 'Date not set']);
    expect(blocks.map((b) => b.items.map((a) => a.id))).toEqual([[1, 2], [3], [], [4], [5]]);
    expect(blocks.map((b) => b.continuing.map((a) => a.id))).toEqual([[], [], [3], [3], []]);
  });

  test('newest first reverses the months and the order inside them; undated stays last', () => {
    const blocks = activityMonthBlocks(all, { newestFirst: true });
    expect(blocks.map((b) => b.key)).toEqual(['2026-03', '2026-02', '2026-01', '2025-12', '']);
    expect(blocks[3].items.map((a) => a.id)).toEqual([2, 1]);
  });

  test('a picked month lists everything that ran in it', () => {
    expect(activityMonthBlocks(all, { month: '2026-03' })).toEqual([
      { key: '2026-03', label: 'March 2026', items: [training, showcase], continuing: [] },
    ]);
    expect(activityMonthBlocks(all, { month: '2026-07' })).toEqual([]);
  });

  test("the month picker covers the grant's months with how many ran and how many began", () => {
    const picker = monthPicker('2025-12-02', '2026-03-31', all);
    expect(picker.map((m) => [m.short, m.count, m.started])).toEqual([
      ['Dec 2025', 2, 2], ['Jan 2026', 1, 1], ['Feb 2026', 1, 0], ['Mar 2026', 2, 1],
    ]);
    expect(monthName('2026-02')).toBe('February 2026');
  });
});

describe('an activity description, split into words and links', () => {
  test('a line that is only a link becomes a named link; the words stay', () => {
    expect(activityText('Screening and drills.\nPost-trial reel, Day 1: https://x.example/r/1?igsh=a==')).toEqual({
      text: 'Screening and drills.',
      links: [{ label: 'Post-trial reel, Day 1', href: 'https://x.example/r/1?igsh=a==' }],
    });
  });

  test('a short heading names the bare links under it, numbered when there are several', () => {
    const { text, links } = activityText('Intro.\n\nPosts\nTrial date: https://x.example/p/1\n\nPromotional videos\nhttps://x.example/v/1\nhttps://x.example/v/2');
    expect(text).toBe('Intro.');
    expect(links).toEqual([
      { label: 'Trial date', href: 'https://x.example/p/1' },
      { label: 'Promotional videos 1', href: 'https://x.example/v/1' },
      { label: 'Promotional videos 2', href: 'https://x.example/v/2' },
    ]);
  });

  test('a bare link with no heading keeps no name; a link inside a sentence stays in the sentence', () => {
    expect(activityText('https://x.example/a')).toEqual({ text: '', links: [{ label: null, href: 'https://x.example/a' }] });
    expect(activityText('See https://x.example/a for more.')).toEqual({ text: 'See https://x.example/a for more.', links: [] });
  });

  test('a description with no links is returned as it was', () => {
    const plain = 'All 200+ players attended.\n\nThe top 50 were shortlisted.';
    expect(activityText(plain)).toEqual({ text: plain, links: [] });
    expect(activityText('')).toEqual({ text: '', links: [] });
  });
});

test('grant length reads in months, and in days when it is under two months', () => {
  expect(grantLength(120)).toBe('4 months');   // 2 Dec 2025 - 31 Mar 2026
  expect(grantLength(365)).toBe('12 months');
  expect(grantLength(90)).toBe('3 months');
  expect(grantLength(59)).toBe('59 days');
  expect(grantLength(1)).toBe('1 day');
  expect(grantLength(0)).toBe('');
  expect(grantLength(undefined)).toBe('');
});

test('grant place names one city with its state, several by name, none as empty', () => {
  expect(grantPlace([{ name: 'Ludhiana', state: 'Punjab' }])).toBe('Ludhiana, Punjab');
  expect(grantPlace([{ name: 'Ludhiana', state: '' }])).toBe('Ludhiana');
  expect(grantPlace([{ name: 'Pune', state: 'Maharashtra' }, { name: 'Wardha', state: 'Maharashtra' }])).toBe('Pune, Wardha');
  expect(grantPlace([])).toBe('');
  expect(grantPlace(undefined)).toBe('');
});

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
