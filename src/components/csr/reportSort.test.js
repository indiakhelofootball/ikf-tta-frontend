import { sortReports, reportSortOptions, DEFAULT_REPORT_SORT } from './reportSort';

const r = (id, over = {}) => ({
  id,
  fileName: `File ${id}`,
  reportType: 'Trial',
  activityId: null,
  projectId: 1,
  createdAt: `2026-07-${String(id).padStart(2, '0')}T09:00:00Z`,
  ...over,
});

const ids = (list) => list.map((x) => x.id);

// The comparator the Reports page used before the sort control existed.
const legacyOrder = (list) =>
  [...list].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

test('the default is newest first', () => {
  expect(DEFAULT_REPORT_SORT).toBe('newest');
});

test('newest first is exactly the order the page used before, blanks and ties included', () => {
  const list = [
    r(3), r(1), r(5, { createdAt: null }), r(2), r(4, { createdAt: '2026-07-02T09:00:00Z' }), r(6, { createdAt: '' }),
  ];
  expect(ids(sortReports(list, 'newest'))).toEqual(ids(legacyOrder(list)));
  expect(ids(sortReports(list, 'newest'))).toEqual([3, 2, 4, 1, 5, 6]);
});

test('an unknown key falls back to newest first rather than throwing', () => {
  const list = [r(1), r(3), r(2)];
  expect(ids(sortReports(list, 'nonsense'))).toEqual([3, 2, 1]);
  expect(ids(sortReports(list))).toEqual([3, 2, 1]);
});

test('oldest first, with undated reports at the bottom', () => {
  const list = [r(3), r(9, { createdAt: null }), r(1), r(2)];
  expect(ids(sortReports(list, 'oldest'))).toEqual([1, 2, 3, 9]);
});

test('name A-Z and Z-A are case-blind and numeric, blank names last both ways, ties newest first', () => {
  const list = [
    r(1, { fileName: 'report 10' }),
    r(2, { fileName: 'Report 2' }),
    r(3, { fileName: '' }),
    r(4, { fileName: 'alpha' }),
    r(5, { fileName: 'Alpha' }),
    r(6, { fileName: null }),
  ];
  expect(ids(sortReports(list, 'name-asc'))).toEqual([5, 4, 2, 1, 6, 3]);
  expect(ids(sortReports(list, 'name-desc'))).toEqual([1, 2, 5, 4, 6, 3]);
});

test('report type groups reports, newest first inside each type, untyped last', () => {
  const list = [
    r(1, { reportType: 'Workshop' }),
    r(2, { reportType: 'Trial' }),
    r(3, { reportType: '' }),
    r(4, { reportType: 'Workshop' }),
    r(5, { reportType: 'Trial' }),
  ];
  expect(ids(sortReports(list, 'type'))).toEqual([5, 2, 4, 1, 3]);
});

test('activity sorts by the label the caller supplies, reports with no activity last', () => {
  const names = { 10: 'Zonal trial', 11: 'Coach workshop' };
  const activityName = (x) => names[x.activityId];
  const list = [
    r(1, { activityId: 10 }),
    r(2, { activityId: null }),
    r(3, { activityId: 11 }),
    r(4, { activityId: 10 }),
    r(5, { activityId: 99 }),
  ];
  expect(ids(sortReports(list, 'activity', { activityName }))).toEqual([3, 4, 1, 5, 2]);
});

test('grant sorts by the grant label, unknown grant last', () => {
  const names = { 1: 'Khelo Girls', 2: 'Arunachal League' };
  const grantName = (x) => names[x.projectId];
  const list = [r(1, { projectId: 1 }), r(2, { projectId: 2 }), r(3, { projectId: 7 }), r(4, { projectId: 1 })];
  expect(ids(sortReports(list, 'grant', { grantName }))).toEqual([2, 4, 1, 3]);
});

test('without accessors, activity and grant sorts degrade to newest first', () => {
  const list = [r(1), r(3), r(2)];
  expect(ids(sortReports(list, 'activity'))).toEqual([3, 2, 1]);
  expect(ids(sortReports(list, 'grant'))).toEqual([3, 2, 1]);
});

test('reports tied on every key keep the order they arrived in', () => {
  const same = '2026-07-01T09:00:00Z';
  const list = [r(4, { createdAt: same }), r(2, { createdAt: same }), r(3, { createdAt: same })];
  ['newest', 'oldest', 'name-asc', 'type'].forEach((key) => {
    const tied = list.map((x) => ({ ...x, fileName: 'Same' }));
    expect(ids(sortReports(tied, key))).toEqual([4, 2, 3]);
  });
});

test('never mutates the input and survives an empty or missing list', () => {
  const list = [r(1), r(2)];
  sortReports(list, 'oldest');
  expect(ids(list)).toEqual([1, 2]);
  expect(sortReports([], 'name-asc')).toEqual([]);
  expect(sortReports(undefined, 'type')).toEqual([]);
});

test('the grant option is offered only where there is more than one grant', () => {
  const all = reportSortOptions().map((o) => o.value);
  expect(all).toEqual(['newest', 'oldest', 'name-asc', 'name-desc', 'type', 'activity', 'grant']);
  expect(reportSortOptions({ withGrant: false }).map((o) => o.value)).not.toContain('grant');
});
